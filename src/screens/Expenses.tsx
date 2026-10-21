import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Plus, Receipt } from 'lucide-react'
import { Avatar, Empty, Page, SectionTitle, Segmented, Stat, TopBar } from '../components/ui'
import { draftFromItem, ExpenseForm } from '../components/ExpenseForm'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import { useRates } from '../data/derived'
import type { Expense, NewRow } from '../data/types'
import { CATEGORY, EXPENSE_CATEGORY } from '../content/catalog'
import { balances, expenseShares, forecast, money, settle } from '../lib/money'
import { compactDate } from '../lib/dates'

type Tab = 'contas' | 'lancamentos' | 'previsto'

export default function Expenses() {
  const openMenu = useOpenMenu()
  const { snap, members } = useStore()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(snap.trip_expenses.length ? 'contas' : 'previsto')
  const [draft, setDraft] = useState<NewRow<'trip_expenses'> | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)

  // Vindo de uma ideia ("Lançar como gasto").
  useEffect(() => {
    const id = params.get('item')
    const item = id && snap.trip_items.find((i) => i.id === id)
    if (item) {
      setDraft(draftFromItem(item, members.length))
      setParams({}, { replace: true })
    }
  }, [params, setParams, snap.trip_items, members.length])

  return (
    <>
      <TopBar title="Gastos" onMenu={openMenu} />
      <Page className="!pb-40">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Ver"
          options={[
            { id: 'contas', label: 'Contas' },
            { id: 'lancamentos', label: 'Lançamentos' },
            { id: 'previsto', label: 'Previsto' }
          ]}
        />
        {tab === 'contas' && <Accounts />}
        {tab === 'lancamentos' && <List onEdit={setEditing} />}
        {tab === 'previsto' && <Forecast />}
      </Page>
      <button
        onClick={() => setDraft({})}
        className="btn btn-accent fixed right-4 z-30 shadow-card"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        <Plus size={20} /> Lançar gasto
      </button>
      <ExpenseForm open={!!draft} draft={draft ?? undefined} onClose={() => setDraft(null)} />
      <ExpenseForm open={!!editing} expense={editing ?? undefined} onClose={() => setEditing(null)} />
    </>
  )
}

function Accounts() {
  const { snap, members, me, member, trip, add } = useStore()
  const cur = trip.base_currency
  const list = useMemo(() => balances(snap.trip_expenses, members), [snap.trip_expenses, members])
  const transfers = useMemo(() => settle(list), [list])
  const total = list.reduce((s, b) => s + b.paid, 0) / 100
  const mine = list.find((b) => b.member === me.id)
  const maxAbs = Math.max(1, ...list.map((b) => Math.abs(b.net)))

  if (!snap.trip_expenses.length)
    return <Empty icon={<Receipt size={30} />} title="Nenhum gasto ainda" text="Lancem o que cada um pagar (Uber, mercado, ingresso) e o app calcula quem deve quanto para quem." />

  const markPaid = (from: string, to: string, cents: number) =>
    void add('trip_expenses', {
      kind: 'acerto',
      title: `${member(from)?.name ?? ''} pagou ${member(to)?.name ?? ''}`,
      amount: cents / 100,
      currency: cur,
      rate: 1,
      paid_by: from,
      split_among: [to],
      category: 'acerto',
      created_by: me.id
    })

  return (
    <>
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <Stat label="Grupo gastou" value={money(total, cur, 0)} />
        <Stat label="Sua parte" value={money((mine?.share ?? 0) / 100, cur, 0)} />
        <Stat label="Você pagou" value={money((mine?.paid ?? 0) / 100, cur, 0)} />
      </div>

      <SectionTitle>Saldo de cada um</SectionTitle>
      <ul className="card space-y-3.5">
        {list.map((b) => {
          const m = member(b.member)
          const pct = (Math.abs(b.net) / maxAbs) * 50
          return (
            <li key={b.member}>
              <div className="flex items-center gap-3">
                <Avatar member={m} size={32} />
                <span className="flex-1 font-bold">{m?.name ?? '?'}</span>
                <span className={`font-extrabold tabular-nums ${b.net > 0 ? 'text-mint-600' : b.net < 0 ? 'text-danger-600' : 'text-ink/50'}`}>
                  {b.net > 0 ? '+' : b.net < 0 ? '−' : ''}
                  {money(Math.abs(b.net) / 100, cur)}
                </span>
              </div>
              <div className="relative ml-11 mt-1.5 h-1.5 rounded-full bg-shell">
                <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
                <span className={`absolute inset-y-0 rounded-full ${b.net >= 0 ? 'left-1/2 bg-mint-500' : 'right-1/2 bg-danger-500'}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>

      <SectionTitle>Como acertar</SectionTitle>
      {transfers.length === 0 ? (
        <p className="card font-semibold text-mint-600">Tudo certo, ninguém deve nada! 🎉</p>
      ) : (
        <ul className="space-y-2.5">
          {transfers.map((t) => (
            <li key={`${t.from}-${t.to}`} className="card flex items-center gap-2 !p-4">
              <Avatar member={member(t.from)} size={30} />
              <ArrowRight size={16} className="text-ink/40" />
              <Avatar member={member(t.to)} size={30} />
              <span className="min-w-0 flex-1 text-[14px] leading-tight">
                <b>{member(t.from)?.name.split(' ')[0]}</b> paga <b>{member(t.to)?.name.split(' ')[0]}</b>
                <span className="block text-[17px] font-extrabold tabular-nums">{money(t.amount / 100, cur)}</span>
              </span>
              <button onClick={() => markPaid(t.from, t.to, t.amount)} className="btn btn-soft shrink-0 !px-3 !py-2 text-[13px]">
                Pago ✓
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[12.5px] text-ink/50">Valores convertidos para {cur} pela cotação de cada lançamento. "Pago ✓" registra um acerto e zera a dívida.</p>
    </>
  )
}

function List({ onEdit }: { onEdit: (e: Expense) => void }) {
  const { snap, me, member, trip } = useStore()
  const groups = useMemo(() => {
    const sorted = [...snap.trip_expenses].sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at))
    const map = new Map<string, Expense[]>()
    for (const e of sorted) map.set(e.spent_on, [...(map.get(e.spent_on) ?? []), e])
    return [...map.entries()]
  }, [snap.trip_expenses])

  if (!groups.length) return <Empty icon={<Receipt size={30} />} title="Nada lançado" text="Toque em “Lançar gasto” quando alguém pagar algo pelo grupo." />

  return (
    <div className="mt-5 space-y-5">
      {groups.map(([day, list]) => (
        <section key={day}>
          <p className="mb-2 text-[13px] font-extrabold capitalize text-ink/55">{compactDate(day)}</p>
          <ul className="card !p-0">
            {list.map((e) => {
              const cat = EXPENSE_CATEGORY[e.category]
              const Icon = cat?.icon ?? CATEGORY.outro.icon
              const myShare = (expenseShares(e).get(me.id) ?? 0) / 100
              const payer = member(e.paid_by)
              return (
                <li key={e.id} className="border-b border-line/60 last:border-0">
                  <button onClick={() => onEdit(e)} className="flex w-full items-center gap-3 p-3.5 text-left">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: e.kind === 'acerto' ? '#1F9E7A' : (cat?.hex ?? '#94A3B8') }}>
                      {e.kind === 'acerto' ? <ArrowRight size={19} /> : <Icon size={19} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{e.title}</span>
                      <span className="block text-[12.5px] font-semibold text-ink/55">
                        {e.kind === 'acerto' ? 'Acerto de contas' : `${payer?.name.split(' ')[0] ?? '?'} pagou · ${e.split_among.length === snap.trip_members.length ? 'todos' : `${e.split_among.length} pessoa(s)`}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-extrabold tabular-nums">{money(e.amount, e.currency)}</span>
                      {e.kind === 'gasto' && (
                        <span className="block text-[12px] font-semibold tabular-nums text-ink/50">{myShare ? `sua parte ${money(myShare, trip.base_currency)}` : 'sem você'}</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Forecast() {
  const { snap, members, trip } = useStore()
  const rates = useRates()
  const f = useMemo(() => forecast(snap.trip_items, members.length, rates.rates), [snap.trip_items, members.length, rates.rates])
  const spent = snap.trip_expenses.filter((e) => e.kind === 'gasto').reduce((s, e) => s + e.amount * e.rate, 0)
  const entries = [...f.byCategory.entries()].sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...entries.map(([, v]) => v))
  const missing = snap.trip_items.filter((i) => (i.status === 'aprovado' || i.status === 'reservado') && i.price == null).length

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Previsto por pessoa" value={money(f.perPerson, 'BRL', 0)} hint={`${members.length} pessoas`} tone="text-brand-600" />
        <Stat label="Previsto do grupo" value={money(f.total, 'BRL', 0)} hint={spent ? `já gasto ${money(spent, trip.base_currency, 0)}` : undefined} />
      </div>
      <p className="mt-3 text-[13px] text-ink/55">
        Soma das ideias <b>aprovadas</b> e <b>reservadas</b> que têm preço, convertidas pela cotação de hoje.
        {missing > 0 && ` ${missing} aprovada(s) ainda sem preço.`}
      </p>
      {entries.length > 0 ? (
        <>
          <SectionTitle>Por categoria (por pessoa)</SectionTitle>
          <ul className="card space-y-3">
            {entries.map(([cat, v]) => {
              const c = CATEGORY[cat as keyof typeof CATEGORY]
              return (
                <li key={cat}>
                  <div className="flex items-center justify-between text-[14px] font-bold">
                    <span>{c?.plural ?? cat}</span>
                    <span className="tabular-nums">{money(v / Math.max(members.length, 1), 'BRL', 0)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-shell">
                    <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: c?.hex ?? '#94A3B8' }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <Empty icon={<Receipt size={30} />} title="Sem previsão ainda" text="Coloque o preço nas ideias (hotel, ingressos, carro) e aprove: o orçamento por pessoa aparece aqui." />
      )}
    </>
  )
}
