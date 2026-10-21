import type { ItemCategory } from '../data/types'
import { coordsFromUrl } from './geo'

/** Acha o primeiro link num texto colado (ex.: mensagem do WhatsApp com texto + link). */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"']+/i)
  if (m) return m[0].replace(/[),.;!?]+$/, '')
  const bare = text.trim().match(/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i)
  return bare ? `https://${bare[0]}` : null
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').replace(/^m\./, '')
  } catch {
    return ''
  }
}

const SITE_NAMES: Record<string, string> = {
  'airbnb.com': 'Airbnb',
  'airbnb.com.br': 'Airbnb',
  'booking.com': 'Booking',
  'expedia.com': 'Expedia',
  'hotels.com': 'Hotels.com',
  'decolar.com': 'Decolar',
  'tripadvisor.com': 'Tripadvisor',
  'tripadvisor.com.br': 'Tripadvisor',
  'google.com': 'Google',
  'maps.app.goo.gl': 'Google Maps',
  'goo.gl': 'Google Maps',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'tiktok.com': 'TikTok',
  'vm.tiktok.com': 'TikTok',
  'instagram.com': 'Instagram',
  'disneyworld.disney.go.com': 'Disney World',
  'universalorlando.com': 'Universal Orlando',
  'seaworld.com': 'SeaWorld',
  'getyourguide.com': 'GetYourGuide',
  'viator.com': 'Viator',
  'skyscanner.com.br': 'Skyscanner',
  'google.com.br': 'Google'
}

export function siteName(url: string): string {
  const host = hostOf(url)
  if (!host) return ''
  if (SITE_NAMES[host]) return SITE_NAMES[host]
  const base = host.split('.').slice(-2).join('.')
  if (SITE_NAMES[base]) return SITE_NAMES[base]
  const name = host.split('.').slice(-3)[0] === 'co' ? host.split('.')[0] : host.split('.').slice(-2)[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

const RULES: [RegExp, ItemCategory][] = [
  [/airbnb|booking\.com|hotels?\.|expedia|vrbo|marriott|hilton|hyatt|ihg|hostel|decolar.*hote|trivago/i, 'hospedagem'],
  [/latam|voeazul|azul\.com|voegol|aa\.com|american|delta\.com|united\.com|aircanada|westjet|copa\.com|avianca|skyscanner|google\.com\/travel\/flights|kayak|passagens?/i, 'voo'],
  [/disney|universal|seaworld|legoland|busch ?gardens|kennedy ?space|epic|volcano ?bay|aquatica|six ?flags|canada.?s ?wonderland/i, 'parque'],
  [/rentcars|alamo|hertz|localiza|movida|enterprise|avis|sixt|uber|lyft|brightline|amtrak|greyhound|viarail|flixbus|sunpass/i, 'transporte'],
  [/yelp|opentable|restaurant|menu|ifood|doordash|ubereats|steak|pizza|burger|cafe|bakery/i, 'comida'],
  [/outlet|premium ?outlets|mall|walmart|target|bestbuy|apple\.com|costco|amazon|ross|tjmaxx|nike/i, 'compras'],
  [/travel\.state\.gov|usvisa|canada\.ca|eta|cic\.gc\.ca|gov\.br|seguro|insurance/i, 'documento'],
  [/getyourguide|viator|tripadvisor|tour|museum|museu|niagara|cn ?tower|ingresso|tickets?/i, 'passeio']
]

export function guessCategory(url: string, title = ''): ItemCategory {
  const text = `${url} ${title}`
  for (const [re, cat] of RULES) if (re.test(text)) return cat
  if (coordsFromUrl(url) || /maps\.app\.goo\.gl|google\.[a-z.]+\/maps/i.test(url)) return 'passeio'
  return 'outro'
}

export interface Preview {
  url: string
  title: string
  description: string
  image: string
  site: string
  lat: number | null
  lng: number | null
}

/** Pede ao /api/preview o título, a imagem e a descrição do link (og:tags). */
export async function fetchPreview(url: string): Promise<Preview> {
  const fallback: Preview = { url, title: '', description: '', image: '', site: siteName(url), lat: null, lng: null, ...coordsFromUrl(url) }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    const r = await fetch(`/api/preview?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!r.ok) return fallback
    const j = (await r.json()) as Partial<Preview>
    const coords = coordsFromUrl(j.url || url)
    return {
      url: j.url || url,
      title: j.title || '',
      description: j.description || '',
      image: j.image || '',
      site: j.site || siteName(j.url || url),
      lat: j.lat ?? coords?.lat ?? null,
      lng: j.lng ?? coords?.lng ?? null
    }
  } catch {
    return fallback
  }
}
