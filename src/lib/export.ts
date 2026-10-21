import type { Snapshot } from '../data/types'
import { expenseShares } from './money'

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Planilha dos gastos (separador ; para abrir certinho no Excel em português). */
export function expensesCSV(snap: Snapshot): string {
  const name = new Map(snap.trip_members.map((m) => [m.id, m.name]))
  const people = snap.trip_members
  const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Moeda', 'Cotação', `Valor (${snap.trip.base_currency})`, 'Pagou', ...people.map((p) => `Parte de ${p.name}`)]
  const rows = snap.trip_expenses.map((e) => {
    const shares = expenseShares(e)
    return [
      e.spent_on,
      e.kind === 'acerto' ? 'Acerto' : 'Gasto',
      e.title,
      e.category,
      e.amount.toFixed(2).replace('.', ','),
      e.currency,
      String(e.rate).replace('.', ','),
      (e.amount * e.rate).toFixed(2).replace('.', ','),
      name.get(e.paid_by) ?? '',
      ...people.map((p) => ((shares.get(p.id) ?? 0) / 100).toFixed(2).replace('.', ','))
    ]
  })
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
}

/** Cópia completa da viagem (sem o código, para poder guardar sem expor o acesso). */
export function backupJSON(snap: Snapshot): string {
  const { trip, ...rest } = snap
  const { code: _code, ...tripData } = trip
  return JSON.stringify({ exported_at: new Date().toISOString(), trip: tripData, ...rest }, null, 2)
}
