import type { Currency, Expense, Item, Member } from '../data/types'

export const CURRENCIES: { id: Currency; label: string; flag: string }[] = [
  { id: 'USD', label: 'Dólar americano', flag: '🇺🇸' },
  { id: 'CAD', label: 'Dólar canadense', flag: '🇨🇦' },
  { id: 'BRL', label: 'Real', flag: '🇧🇷' },
  { id: 'EUR', label: 'Euro', flag: '🇪🇺' }
]

/** Quanto 1 unidade de cada moeda vale em reais. */
export type Rates = Record<Currency, number>

export const FALLBACK_RATES: Rates = { BRL: 1, USD: 5.4, CAD: 3.9, EUR: 6.2 }

const fmtCache = new Map<string, Intl.NumberFormat>()

export function money(value: number, currency: Currency = 'BRL', decimals = 2): string {
  const k = `${currency}:${decimals}`
  let f = fmtCache.get(k)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    fmtCache.set(k, f)
  }
  return f.format(value)
}

/** Converte usando as cotações em reais (from → BRL → to). */
export function convert(value: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return value
  return (value * rates[from]) / rates[to]
}

/** "12,50" ou "12.50" → 12.5 */
export function parseAmount(text: string): number | null {
  const clean = text.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '')
  if (!clean) return null
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

const cents = (v: number) => Math.round(v * 100)

/**
 * Quanto cada pessoa "consumiu" de um gasto, em centavos da moeda base.
 * Divisão igual: o resto dos centavos vai para os primeiros da lista.
 */
export function expenseShares(e: Pick<Expense, 'amount' | 'rate' | 'split_among' | 'shares'>): Map<string, number> {
  const out = new Map<string, number>()
  const total = cents(e.amount * e.rate)
  if (e.shares && Object.keys(e.shares).length) {
    const entries = Object.entries(e.shares).filter(([, v]) => v > 0)
    const sum = entries.reduce((s, [, v]) => s + v, 0) || 1
    let given = 0
    entries.forEach(([id, v], i) => {
      const c = i === entries.length - 1 ? total - given : Math.round((total * v) / sum)
      given += c
      out.set(id, c)
    })
    return out
  }
  const n = e.split_among.length
  if (!n) return out
  const each = Math.floor(total / n)
  let rest = total - each * n
  for (const id of e.split_among) {
    out.set(id, each + (rest > 0 ? 1 : 0))
    if (rest > 0) rest--
  }
  return out
}

export interface Balance {
  member: string
  /** pagou (centavos, base) */
  paid: number
  /** consumiu (centavos, base) */
  share: number
  /** positivo: tem a receber; negativo: deve */
  net: number
}

export function balances(expenses: Expense[], members: Member[]): Balance[] {
  const map = new Map<string, Balance>(members.map((m) => [m.id, { member: m.id, paid: 0, share: 0, net: 0 }]))
  const get = (id: string) => {
    let b = map.get(id)
    if (!b) map.set(id, (b = { member: id, paid: 0, share: 0, net: 0 }))
    return b
  }
  for (const e of expenses) {
    const total = cents(e.amount * e.rate)
    const payer = get(e.paid_by)
    if (e.kind === 'gasto') payer.paid += total
    payer.net += total
    for (const [id, c] of expenseShares(e)) {
      const b = get(id)
      if (e.kind === 'gasto') b.share += c
      b.net -= c
    }
  }
  return [...map.values()]
}

export interface Transfer {
  from: string
  to: string
  /** centavos na moeda base */
  amount: number
}

/** Sugere o mínimo de pagamentos para zerar as contas (maior devedor paga o maior credor). */
export function settle(list: Balance[]): Transfer[] {
  const debt = list.filter((b) => b.net < 0).map((b) => ({ id: b.member, v: -b.net }))
  const cred = list.filter((b) => b.net > 0).map((b) => ({ id: b.member, v: b.net }))
  debt.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id))
  cred.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id))
  const out: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debt.length && j < cred.length) {
    const v = Math.min(debt[i].v, cred[j].v)
    if (v > 0) out.push({ from: debt[i].id, to: cred[j].id, amount: v })
    debt[i].v -= v
    cred[j].v -= v
    if (debt[i].v === 0) i++
    if (cred[j].v === 0) j++
  }
  return out
}

/** Custo previsto das ideias aprovadas/reservadas, por pessoa, em reais. */
export function forecast(items: Item[], people: number, rates: Rates): { perPerson: number; total: number; byCategory: Map<string, number> } {
  const n = Math.max(people, 1)
  const byCategory = new Map<string, number>()
  let total = 0
  for (const it of items) {
    if (it.price == null || (it.status !== 'aprovado' && it.status !== 'reservado')) continue
    const value = convert(it.price, it.currency, 'BRL', rates) * (it.price_per === 'pessoa' ? n : 1)
    total += value
    byCategory.set(it.category, (byCategory.get(it.category) ?? 0) + value)
  }
  return { perPerson: total / n, total, byCategory }
}
