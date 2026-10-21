import { addDays, diffDays, todayISO, type ISODate } from './dates'

export interface DayWeather {
  day: ISODate
  max: number
  min: number
  rain: number
  code: number | null
}

export interface WeatherResult {
  /** forecast = previsão de verdade; history = como foi nos mesmos dias do ano passado */
  kind: 'forecast' | 'history'
  days: Map<ISODate, DayWeather>
}

const cache = new Map<string, Promise<WeatherResult | null>>()

const shiftYear = (iso: ISODate, years: number) => `${Number(iso.slice(0, 4)) + years}${iso.slice(4)}`

/**
 * Previsão (até 15 dias à frente) pela Open-Meteo. Para datas mais distantes,
 * mostra como foi o tempo nos mesmos dias do ano anterior.
 */
export function weatherFor(lat: number, lng: number, from: ISODate, to: ISODate): Promise<WeatherResult | null> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${from},${to}`
  let p = cache.get(key)
  if (!p) {
    p = load(lat, lng, from, to).catch(() => null)
    cache.set(key, p)
  }
  return p
}

async function load(lat: number, lng: number, from: ISODate, to: ISODate): Promise<WeatherResult | null> {
  const today = todayISO()
  const daily = 'daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto'
  if (diffDays(to, today) <= 15 && diffDays(to, today) >= 0) {
    const start = from < today ? today : from
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${to}&${daily}`)
    return parse(await r.json(), 'forecast', 0)
  }
  // Ano passado (ou o mais recente que já aconteceu).
  let years = -1
  while (shiftYear(to, years) >= addDays(today, -5)) years--
  const r = await fetch(
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${shiftYear(from, years)}&end_date=${shiftYear(to, years)}&${daily}`
  )
  return parse(await r.json(), 'history', -years)
}

function parse(j: { daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; weather_code?: number[] } }, kind: WeatherResult['kind'], years: number) {
  if (!j.daily) return null
  const days = new Map<ISODate, DayWeather>()
  j.daily.time.forEach((t, i) => {
    const day = shiftYear(t, years)
    days.set(day, {
      day,
      max: Math.round(j.daily!.temperature_2m_max[i]),
      min: Math.round(j.daily!.temperature_2m_min[i]),
      rain: j.daily!.precipitation_sum[i] ?? 0,
      code: j.daily!.weather_code?.[i] ?? null
    })
  })
  return { kind, days }
}

/** Ícone simples a partir do código WMO (ou da chuva). */
export function weatherEmoji(w: DayWeather): string {
  const c = w.code
  if (c == null) return w.rain > 5 ? '🌧️' : w.rain > 0.5 ? '🌦️' : '☀️'
  if (c === 0) return '☀️'
  if (c <= 2) return '🌤️'
  if (c === 3) return '☁️'
  if (c <= 48) return '🌫️'
  if (c <= 67 || (c >= 80 && c <= 82)) return '🌧️'
  if (c <= 77 || c === 85 || c === 86) return '❄️'
  if (c >= 95) return '⛈️'
  return '🌦️'
}
