// Datas são sempre strings 'AAAA-MM-DD' no fuso local. As contas são feitas em
// "número do dia" (dias desde 1970-01-01 em UTC), o que evita surpresas com
// horário de verão.

export type ISODate = string

const DAY = 86_400_000

export function toNum(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY)
}

export function fromNum(n: number): ISODate {
  return new Date(n * DAY).toISOString().slice(0, 10)
}

export function todayISO(now = new Date()): ISODate {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const addDays = (iso: ISODate, days: number): ISODate => fromNum(toNum(iso) + days)
export const diffDays = (a: ISODate, b: ISODate): number => toNum(a) - toNum(b)

export function parts(iso: ISODate) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/** 0 = segunda ... 6 = domingo. */
export function weekdayMon(iso: ISODate): number {
  const dow = new Date(toNum(iso) * DAY).getUTCDay() // 0 = domingo
  return (dow + 6) % 7
}

export const startOfWeek = (iso: ISODate) => addDays(iso, -weekdayMon(iso))

export function startOfMonth(iso: ISODate): ISODate {
  return iso.slice(0, 8) + '01'
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const { y, m } = parts(iso)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}

export function daysInMonth(iso: ISODate): number {
  const { y, m } = parts(iso)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function range(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let n = toNum(from); n <= toNum(to); n++) out.push(fromNum(n))
  return out
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MONTHS_SHORT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
const WEEKDAYS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
export const WEEK_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

export const monthName = (iso: ISODate) => MONTHS[parts(iso).m - 1]
export const weekdayName = (iso: ISODate) => WEEKDAYS[weekdayMon(iso)]

/** "5 de out." */
export function shortDate(iso: ISODate): string {
  const { m, d } = parts(iso)
  return `${d} de ${MONTHS_SHORT[m - 1]}`
}

/** "5 de outubro" */
export function longDate(iso: ISODate): string {
  const { m, d } = parts(iso)
  return `${d} de ${MONTHS[m - 1]}`
}

/** "5 de out. de 2026" */
export function fullDate(iso: ISODate): string {
  return `${shortDate(iso)} de ${parts(iso).y}`
}

/** "seg., 20/10" */
export function compactDate(iso: ISODate): string {
  const { m, d } = parts(iso)
  return `${weekdayName(iso).slice(0, 3)}., ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export function relativeDays(n: number): string {
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  if (n === -1) return 'ontem'
  if (n > 0) return `em ${n} dias`
  return `há ${-n} dias`
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "quarta-feira" etc. já sai de weekdayName; aqui o curto com inicial maiúscula: "Qua" */
export const weekdayShort = (iso: ISODate) => {
  const w = weekdayName(iso).slice(0, 3)
  return w[0].toUpperCase() + w.slice(1)
}

/** "1 a 20 de jul. de 2027", "28 de jun. a 5 de jul. de 2027" */
export function dateRange(from: ISODate | null, to: ISODate | null): string {
  if (!from && !to) return 'Datas a definir'
  if (!from || !to) return fullDate((from ?? to)!)
  const a = parts(from)
  const b = parts(to)
  if (a.y === b.y && a.m === b.m) return `${a.d} a ${fullDate(to)}`
  if (a.y === b.y) return `${shortDate(from)} a ${fullDate(to)}`
  return `${fullDate(from)} a ${fullDate(to)}`
}

/** "14:30" a partir de "14:30:00" */
export const hhmm = (time: string | null | undefined) => (time ? time.slice(0, 5) : '')

/** "há 5 min", "há 2 h", "ontem", "3 de out." */
export function ago(iso: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  const days = diffDays(todayISO(now), todayISO(new Date(iso)))
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  return shortDate(todayISO(new Date(iso)))
}
