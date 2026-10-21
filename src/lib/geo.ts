export interface Place {
  label: string
  lat: number
  lng: number
}

/** Busca endereço/lugar no OpenStreetMap (Nominatim). Uso leve: só quando a pessoa pede. */
export async function searchPlace(q: string): Promise<Place[]> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=pt-BR&q=${encodeURIComponent(q)}`)
  if (!r.ok) return []
  const j = (await r.json()) as { display_name: string; lat: string; lon: string }[]
  return j.map((p) => ({ label: p.display_name, lat: Number(p.lat), lng: Number(p.lon) }))
}

/** Coordenadas escritas num link do Google Maps (…/@28.41,-81.58,15z ou !3d28.41!4d-81.58 ou ?q=28.41,-81.58). */
export function coordsFromUrl(url: string): { lat: number; lng: number } | null {
  const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/]
  for (const re of patterns) {
    const m = decodeURIComponent(url).match(re)
    if (m) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
    }
  }
  return null
}

export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
export const directionsLink = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
