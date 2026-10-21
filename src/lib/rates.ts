import { FALLBACK_RATES, type Rates } from './money'

const KEY = 'vg:rates'
const TTL = 6 * 3600 * 1000

export interface RateInfo {
  rates: Rates
  /** data da cotação (AAAA-MM-DD) */
  date: string
  fetchedAt: number
  live: boolean
}

export function cachedRates(): RateInfo {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as RateInfo
  } catch {
    /* sem cache */
  }
  return { rates: FALLBACK_RATES, date: '', fetchedAt: 0, live: false }
}

/** Cotação do dia (Banco Central Europeu via Frankfurter; reserva: open.er-api). */
export async function fetchRates(force = false): Promise<RateInfo> {
  const cached = cachedRates()
  if (!force && cached.live && Date.now() - cached.fetchedAt < TTL) return cached
  let info: RateInfo | null = null
  try {
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=BRL&symbols=USD,CAD,EUR')
    const j = (await r.json()) as { date: string; rates: Record<string, number> }
    info = { rates: { BRL: 1, USD: 1 / j.rates.USD, CAD: 1 / j.rates.CAD, EUR: 1 / j.rates.EUR }, date: j.date, fetchedAt: Date.now(), live: true }
  } catch {
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/BRL')
      const j = (await r.json()) as { time_last_update_unix: number; rates: Record<string, number> }
      info = {
        rates: { BRL: 1, USD: 1 / j.rates.USD, CAD: 1 / j.rates.CAD, EUR: 1 / j.rates.EUR },
        date: new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10),
        fetchedAt: Date.now(),
        live: true
      }
    } catch {
      return cached
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(info))
  } catch {
    /* ok */
  }
  return info
}
