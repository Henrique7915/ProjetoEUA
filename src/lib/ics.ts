import { addDays, type ISODate } from './dates'
import type { Item, Stop } from '../data/types'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
const date = (iso: ISODate) => iso.replace(/-/g, '')
const stamp = () => `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`

/** Linhas de no máximo 75 caracteres, como o formato pede. */
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ` ${rest.slice(74)}`
  }
  out.push(rest)
  return out.join('\r\n')
}

/**
 * Roteiro em .ics: cada ideia com dia vira um evento (com horário, 1h30; sem horário, dia inteiro)
 * e cada cidade vira um evento de vários dias. Horários ficam no "horário local" (sem fuso),
 * então aparecem certinhos no celular de quem estiver lá.
 */
export function itineraryICS(tripName: string, items: Item[], stops: Stop[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Viagem da Galera//PT-BR', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(tripName)}`]
  for (const s of stops) {
    if (!s.start_date) continue
    lines.push(
      'BEGIN:VEVENT',
      `UID:stop-${s.id}@viagem-galera`,
      `DTSTAMP:${stamp()}`,
      `DTSTART;VALUE=DATE:${date(s.start_date)}`,
      `DTEND;VALUE=DATE:${date(addDays(s.end_date ?? s.start_date, 1))}`,
      `SUMMARY:${esc(`📍 ${s.city}`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    )
  }
  for (const it of items) {
    if (!it.day || it.status === 'descartado') continue
    const desc = [it.note, it.confirmation && `Confirmação: ${it.confirmation}`, it.url].filter(Boolean).join('\n')
    const ev = ['BEGIN:VEVENT', `UID:item-${it.id}@viagem-galera`, `DTSTAMP:${stamp()}`]
    if (it.start_time && !it.end_day) {
      const [h, m] = it.start_time.split(':').map(Number)
      const endMin = h * 60 + m + 90
      const endDay = endMin >= 1440 ? addDays(it.day, 1) : it.day
      const eh = String(Math.floor((endMin % 1440) / 60)).padStart(2, '0')
      const em = String(endMin % 60).padStart(2, '0')
      ev.push(`DTSTART:${date(it.day)}T${it.start_time.slice(0, 5).replace(':', '')}00`, `DTEND:${date(endDay)}T${eh}${em}00`)
    } else {
      ev.push(`DTSTART;VALUE=DATE:${date(it.day)}`, `DTEND;VALUE=DATE:${date(addDays(it.end_day ?? it.day, 1))}`)
    }
    ev.push(`SUMMARY:${esc(it.title)}`)
    if (desc) ev.push(`DESCRIPTION:${esc(desc)}`)
    if (it.address) ev.push(`LOCATION:${esc(it.address)}`)
    if (it.url) ev.push(`URL:${it.url}`)
    ev.push('END:VEVENT')
    lines.push(...ev)
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n')
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
