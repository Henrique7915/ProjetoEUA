// Vercel Function: GET /api/preview?url=...
// Abre o link do lado do servidor e devolve título, imagem e descrição (og:tags),
// para o card do link ficar bonito. Só aceita http(s) para endereços públicos.
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const UA = 'Mozilla/5.0 (compatible; ViagemDaGalera/1.0; link preview)'
const MAX_BYTES = 800_000
const TIMEOUT = 7000

function isPrivate(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const v = ip.toLowerCase()
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:') && isPrivate(v.slice(7))
}

async function assertPublic(url) {
  if (!/^https?:$/.test(url.protocol)) throw new Error('protocolo')
  if (url.username || url.password) throw new Error('credenciais')
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('porta')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new Error('host')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error('host')
}

/** Segue até 5 redirecionamentos, conferindo cada destino. */
async function get(start) {
  let url = new URL(start)
  for (let i = 0; i < 6; i++) {
    await assertPublic(url)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
    const res = await fetch(url, {
      redirect: 'manual',
      signal: ctrl.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' }
    }).finally(() => clearTimeout(timer))
    const loc = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url)
      continue
    }
    return { res, url }
  }
  throw new Error('redirecionamentos demais')
}

async function readText(res) {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks = []
  let size = 0
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
    // O que interessa fica no <head>.
    if (Buffer.concat(chunks).toString('utf8').includes('</head>')) break
  }
  reader.cancel().catch(() => {})
  return Buffer.concat(chunks).toString('utf8')
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .trim()

function meta(html, names) {
  for (const name of names) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i')
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${name}["']`, 'i')
    const m = html.match(re1) || html.match(re2)
    if (m && m[1]) return decode(m[1])
  }
  return ''
}

function coords(url) {
  const s = decodeURIComponent(url)
  const m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || s.match(/[?&](?:q|query|ll|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null
}

async function oembed(endpoint, url) {
  const r = await fetch(`${endpoint}?format=json&url=${encodeURIComponent(url)}`, { headers: { 'user-agent': UA } })
  if (!r.ok) return null
  const j = await r.json()
  return { title: j.title || '', image: j.thumbnail_url || '', site: j.provider_name || '', description: j.author_name ? `por ${j.author_name}` : '' }
}

export default async function handler(req, res) {
  const raw = String(req.query?.url || '')
  res.setHeader('cache-control', 'public, s-maxage=86400, max-age=3600')
  let target
  try {
    target = new URL(raw)
  } catch {
    return res.status(400).json({ error: 'url inválida' })
  }

  const host = target.hostname.replace(/^www\./, '')
  try {
    if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) {
      const o = await oembed('https://www.youtube.com/oembed', target.href)
      if (o) return res.json({ url: target.href, ...o, lat: null, lng: null })
    }
    if (/(^|\.)tiktok\.com$/.test(host)) {
      const o = await oembed('https://www.tiktok.com/oembed', target.href)
      if (o) return res.json({ url: target.href, ...o, lat: null, lng: null })
    }

    const { res: page, url: finalUrl } = await get(target.href)
    const type = page.headers.get('content-type') || ''
    const c = coords(finalUrl.href)
    if (!type.includes('html')) {
      return res.json({ url: finalUrl.href, title: decodeURIComponent(finalUrl.pathname.split('/').pop() || ''), description: '', image: type.startsWith('image/') ? finalUrl.href : '', site: finalUrl.hostname, lat: c?.lat ?? null, lng: c?.lng ?? null })
    }
    const html = await readText(page)
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    let image = meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src', 'image'])
    if (image) {
      try {
        image = new URL(image, finalUrl).href
      } catch {
        image = ''
      }
    }
    const lat = Number(meta(html, ['place:location:latitude', 'og:latitude'])) || c?.lat || null
    const lng = Number(meta(html, ['place:location:longitude', 'og:longitude'])) || c?.lng || null
    return res.json({
      url: finalUrl.href,
      title: meta(html, ['og:title', 'twitter:title']) || (titleTag ? decode(titleTag[1]) : ''),
      description: meta(html, ['og:description', 'twitter:description', 'description']).slice(0, 400),
      image,
      site: meta(html, ['og:site_name', 'application-name']),
      lat,
      lng
    })
  } catch (e) {
    return res.status(200).json({ url: target.href, title: '', description: '', image: '', site: '', lat: null, lng: null, error: String(e?.message || e) })
  }
}
