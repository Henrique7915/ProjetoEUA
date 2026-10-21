import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { useStore } from '../data/store'
import { useRates } from '../data/derived'
import type { Currency, Expense, Item, NewRow } from '../data/types'
import { EXPENSE_CATEGORIES } from '../content/catalog'
import { CURRENCIES, money, parseAmount } from '../lib/money'
import { todayISO } from '../lib/dates'
import { Avatar, ConfirmButton, Segmented, Sheet } from './ui'

const ITEM_TO_EXPENSE: Record<string, string> = { hospedagem: 'hospedagem', voo: 'voo', transporte: 'transporte', parque: 'ingressos', passeio: 'ingressos', comida: 'comida', compras: 'compras' }

const num = (v: number) => String(v).replace('.', ',')

export function draftFromItem(item: Item, people: number): NewRow<'trip_expenses'> {
  return {
    title: item.title.slice(0, 200),
    amount: item.price != null ? Math.round(item.price * (item.price_per === 'pessoa' ? people : 1) * 100) / 100 : undefined,
    currency: item.currency,
    category: ITEM_TO_EXPENSE[item.category] ?? 'outros',
    item_id: item.id
  }
}

export function ExpenseForm({ open, onClose, expense, draft }: { open: boolean; onClose: () => void; expense?: Expense; draft?: NewRow<'trip_expenses'> }) {
  const { members, me, add, patch, remove, showToast, trip } = useStore()
  const rates = useRates()
  const base = expense ?? draft ?? {}
  const init = () => ({
    title: base.title ?? '',
    amount: base.amount != null ? num(base.amount) : '',
    currency: (base.currency ?? 'USD') as Currency,
    rate: base.rate != null ? num(base.rate) : '',
    paid_by: base.paid_by ?? me.id,
    split: base.split_among ?? members.map((m) => m.id),
    mode: (base.shares ? 'valores' : 'igual') as 'igual' | 'valores',
    shares: Object.fromEntries(Object.entries(base.shares ?? {}).map(([k, v]) => [k, num(v)])) as Record<string, string>,
    category: base.category ?? 'comida',
    spent_on: base.spent_on ?? todayISO(),
    note: base.note ?? ''
  })
  const [f, setF] = useState(init)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setF(init())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense, draft])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const toBase = trip.base_currency
  const autoRate = rates.rates[f.currency] / rates.rates[toBase]
  const rate = f.currency === toBase ? 1 : (parseAmount(f.rate) ?? autoRate)
  const amount = parseAmount(f.amount) ?? 0

  const sharesTotal = useMemo(() => f.split.reduce((s, id) => s + (parseAmount(f.shares[id] ?? '') ?? 0), 0), [f.split, f.shares])
  const left = Math.round((amount - sharesTotal) * 100) / 100

  const toggleSplit = (id: string) => set('split', f.split.includes(id) ? f.split.filter((x) => x !== id) : [...f.split, id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return showToast('Diga o que foi o gasto.')
    if (!(amount > 0)) return showToast('Coloque o valor.')
    if (!f.split.length) return showToast('Escolha quem divide.')
    if (!(rate > 0)) return showToast('Cotação inválida.')
    let shares: Record<string, number> | null = null
    if (f.mode === 'valores') {
      if (Math.abs(left) > 0.009) return showToast(left > 0 ? `Faltam ${money(left, f.currency)} para fechar o valor.` : `Passou ${money(-left, f.currency)} do valor.`)
      shares = Object.fromEntries(f.split.map((id) => [id, parseAmount(f.shares[id] ?? '') ?? 0]))
    }
    const row: NewRow<'trip_expenses'> = {
      kind: 'gasto',
      title: f.title.trim(),
      amount,
      currency: f.currency,
      rate: Math.round(rate * 1e6) / 1e6,
      paid_by: f.paid_by,
      split_among: f.split,
      shares,
      category: f.category,
      spent_on: f.spent_on || todayISO(),
      note: f.note.trim(),
      item_id: base.item_id ?? null
    }
    setBusy(true)
    const ok = expense ? await patch('trip_expenses', expense.id, row) : !!(await add('trip_expenses', { ...row, created_by: me.id }))
    setBusy(false)
    if (ok) {
      showToast(expense ? 'Gasto atualizado.' : 'Gasto lançado!')
      onClose()
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={expense ? 'Editar gasto' : 'Lançar gasto'}
      footer={
        <div className="flex gap-2">
          {expense && (
            <ConfirmButton
              confirmLabel="Apagar mesmo?"
              onConfirm={async () => {
                if (await remove('trip_expenses', expense.id)) onClose()
              }}
            >
              Apagar
            </ConfirmButton>
          )}
          <button form="expense-form" type="submit" disabled={busy} className="btn btn-primary flex-1">
            Salvar
          </button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={save} className="space-y-5">
        <div>
          <label className="label" htmlFor="ex-amount">
            Valor
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input id="ex-amount" className="input text-2xl font-extrabold tabular-nums" inputMode="decimal" placeholder="0,00" value={f.amount} onChange={(e) => set('amount', e.target.value)} autoFocus={!expense} />
            <select className="input !w-auto" value={f.currency} onChange={(e) => setF((x) => ({ ...x, currency: e.target.value as Currency, rate: '' }))} aria-label="Moeda">
              {CURRENCIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.id}
                </option>
              ))}
            </select>
          </div>
          {f.currency !== toBase && (
            <div className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-ink/60">
              <span className="shrink-0">1 {f.currency} =</span>
              <input
                className="input !w-28 !py-1.5 text-sm tabular-nums"
                inputMode="decimal"
                placeholder={num(Math.round(autoRate * 10000) / 10000)}
                value={f.rate}
                onChange={(e) => set('rate', e.target.value)}
                aria-label="Cotação"
              />
              <span className="shrink-0">{toBase}</span>
              {amount > 0 && <span className="ml-auto shrink-0 font-bold text-ink/80">≈ {money(amount * rate, toBase)}</span>}
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="ex-title">
            O que foi
          </label>
          <input id="ex-title" className="input" placeholder="Ex.: Jantar no Cheesecake Factory" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={200} />
        </div>

        <div>
          <p className="label">Categoria</p>
          <div className="grid grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map((c) => {
              const Icon = c.icon
              const on = f.category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set('category', c.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-[11px] font-bold ${on ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-400' : 'bg-surface text-ink/60 ring-1 ring-line'}`}
                >
                  <Icon size={19} aria-hidden /> {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="label">Quem pagou</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={f.paid_by === m.id}
                onClick={() => set('paid_by', m.id)}
                className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[14px] font-bold ${f.paid_by === m.id ? 'bg-brand-500 text-onbrand' : 'bg-surface ring-1 ring-line'}`}
              >
                <Avatar member={m} size={26} /> {m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="label !mb-0">Dividir entre</p>
            <button type="button" className="text-[13px] font-bold text-brand-600" onClick={() => set('split', f.split.length === members.length ? [f.paid_by] : members.map((m) => m.id))}>
              {f.split.length === members.length ? 'Só quem pagou' : 'Todos'}
            </button>
          </div>
          <Segmented
            value={f.mode}
            onChange={(v) => set('mode', v)}
            label="Como dividir"
            options={[
              { id: 'igual', label: 'Igual' },
              { id: 'valores', label: 'Valores diferentes' }
            ]}
          />
          <ul className="mt-3 space-y-2">
            {members.map((m) => {
              const on = f.split.includes(m.id)
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleSplit(m.id)} aria-pressed={on} className="flex flex-1 items-center gap-3 rounded-2xl bg-surface p-2.5 text-left ring-1 ring-line">
                    <span className={`grid h-6 w-6 place-items-center rounded-lg border-2 ${on ? 'border-brand-500 bg-brand-500 text-onbrand' : 'border-line text-transparent'}`}>
                      <Check size={15} />
                    </span>
                    <Avatar member={m} size={28} />
                    <span className="flex-1 font-bold">{m.name}</span>
                    {f.mode === 'igual' && on && amount > 0 && <span className="text-[13px] font-bold tabular-nums text-ink/55">{money(amount / f.split.length, f.currency)}</span>}
                  </button>
                  {f.mode === 'valores' && on && (
                    <input
                      className="input !w-28 !py-2 text-right tabular-nums"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={f.shares[m.id] ?? ''}
                      onChange={(e) => set('shares', { ...f.shares, [m.id]: e.target.value })}
                      aria-label={`Parte de ${m.name}`}
                    />
                  )}
                </li>
              )
            })}
          </ul>
          {f.mode === 'valores' && amount > 0 && (
            <p className={`mt-2 text-right text-[13px] font-bold ${Math.abs(left) < 0.01 ? 'text-mint-600' : 'text-danger-600'}`}>
              {Math.abs(left) < 0.01 ? 'Fechou certinho ✓' : left > 0 ? `Faltam ${money(left, f.currency)}` : `Passou ${money(-left, f.currency)}`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ex-date">
              Data
            </label>
            <input id="ex-date" type="date" className="input" value={f.spent_on} onChange={(e) => set('spent_on', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ex-note">
              Obs.
            </label>
            <input id="ex-note" className="input" value={f.note} onChange={(e) => set('note', e.target.value)} maxLength={2000} placeholder="Opcional" />
          </div>
        </div>
      </form>
    </Sheet>
  )
}
