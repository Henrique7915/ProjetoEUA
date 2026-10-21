import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Check, ChevronRight, MessageCircle, Plus, Receipt, Sparkles, UserPlus, Vote as VoteIcon } from 'lucide-react'
import { Avatar, AvatarStack, Page, Progress, SectionTitle, TopBar } from '../components/ui'
import { AddLinkBar, CategoryIcon, ItemForm, priceLabel } from '../components/items'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import { itemsOn, myPending, stopOn, taskProgress, tripPhase, useRates, useToggleTask, useVotes } from '../data/derived'
import type { NewRow } from '../data/types'
import { COUNTRY_FLAG } from '../content/catalog'
import { ago, dateRange, hhmm, plural, todayISO } from '../lib/dates'
import { balances, money } from '../lib/money'

function greeting(name: string) {
  const h = new Date().getHours()
  const part = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return `${part}, ${name.split(' ')[0]}!`
}

export default function Home() {
  const openMenu = useOpenMenu()
  const { snap, trip, members, me } = useStore()
  const [draft, setDraft] = useState<NewRow<'trip_items'> | null>(null)
  const today = todayISO()
  const phase = tripPhase(trip, today)

  return (
    <>
      <TopBar title={`${trip.emoji} ${trip.name}`} onMenu={openMenu} />
      <Page>
        <p className="mt-1 text-[15px] font-semibold text-ink/65">{greeting(me.name)}</p>

        <section className="hero mt-3 overflow-hidden rounded-[28px] p-5 shadow-card">
          {phase.kind === 'before' && (
            <>
              <p className="text-sm font-bold text-white/75">Faltam</p>
              <p className="text-[52px] font-extrabold leading-none tracking-tight tabular-nums">{phase.days}</p>
              <p className="text-lg font-bold">{phase.days === 1 ? 'dia para a viagem!' : 'dias para a viagem'}</p>
            </>
          )}
          {phase.kind === 'during' && (
            <>
              <p className="text-sm font-bold text-white/75">Estamos viajando!</p>
              <p className="text-[44px] font-extrabold leading-none tracking-tight">
                Dia {phase.day}
                <span className="text-xl text-white/70"> de {phase.total}</span>
              </p>
              {stopOn(snap.trip_stops, today) && <p className="mt-1 text-lg font-bold">em {stopOn(snap.trip_stops, today)!.city}</p>}
            </>
          )}
          {phase.kind === 'after' && (
            <>
              <p className="text-[32px] font-extrabold leading-tight">Que viagem! 🎉</p>
              <p className="font-semibold text-white/80">Hora de fechar as contas na aba Gastos.</p>
            </>
          )}
          {phase.kind === 'undated' && (
            <>
              <p className="text-[28px] font-extrabold leading-tight">Datas a definir</p>
              <Link to={snap.trip_polls.length ? '/enquetes' : '/grupo'} className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">
                {snap.trip_polls.length ? 'Votar na enquete de datas' : 'Definir datas'} <ChevronRight size={16} />
              </Link>
            </>
          )}
          {phase.kind !== 'undated' && <p className="mt-3 text-sm font-semibold text-white/80">{dateRange(trip.start_date, trip.end_date)}</p>}

          {snap.trip_stops.length > 0 && (
            <div className="no-scrollbar -mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5">
              {snap.trip_stops.map((s, i) => (
                <span key={s.id} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[13px] font-bold">
                  {i > 0 && <span className="text-white/50">→</span>} {COUNTRY_FLAG[s.country] ?? ''} {s.city}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <AvatarStack members={members} size={30} max={6} />
            <Link to="/grupo" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-extrabold text-[rgb(var(--hero-to))]">
              <UserPlus size={16} /> Convidar
            </Link>
          </div>
        </section>

        <div className="mt-5">
          <AddLinkBar onReady={setDraft} />
        </div>

        {phase.kind === 'during' && <TodayPlan />}
        <NextSteps />
        <OpenPolls />
        <TopIdeas />
        <Money />
        <Feed />
      </Page>
      <ItemForm open={!!draft} draft={draft ?? undefined} onClose={() => setDraft(null)} />
    </>
  )
}

function TodayPlan() {
  const { snap } = useStore()
  const list = itemsOn(snap.trip_items, todayISO())
  return (
    <>
      <SectionTitle action={<Link to="/roteiro" className="text-sm font-bold text-brand-600">Roteiro</Link>}>Hoje</SectionTitle>
      <div className="card space-y-3">
        {list.length === 0 && <p className="text-ink/60">Nada marcado para hoje. Dia livre! 😎</p>}
        {list.map((it) => (
          <Link key={it.id} to={`/ideias/${it.id}`} className="flex items-center gap-3">
            <CategoryIcon category={it.category} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{it.title}</span>
              {it.start_time && <span className="text-[13px] font-semibold text-ink/55">{hhmm(it.start_time)}</span>}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

function NextSteps() {
  const { snap, me, members } = useStore()
  const toggle = useToggleTask()
  const pending = myPending(snap.trip_tasks, me.id)
  const progress = taskProgress(snap.trip_tasks, members.length)
  if (!snap.trip_tasks.length) return null
  return (
    <>
      <SectionTitle action={<Link to="/checklist" className="text-sm font-bold text-brand-600">Ver tudo</Link>}>Seus próximos passos</SectionTitle>
      <div className="card">
        <div className="mb-3 flex items-center justify-between text-[13px] font-bold text-ink/60">
          <span>Checklist do grupo</span>
          <span className="tabular-nums">{Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%</span>
        </div>
        <Progress value={progress.done / Math.max(progress.total, 1)} label="Checklist do grupo" />
        <ul className="mt-4 space-y-1">
          {pending.length === 0 && <li className="py-1 font-semibold text-mint-600">Tudo em dia com você! ✅</li>}
          {pending.slice(0, 4).map((t) => (
            <li key={t.id}>
              <button onClick={() => void toggle(t)} className="flex w-full items-center gap-3 rounded-xl py-2 text-left">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 border-brand-300 text-transparent hover:bg-brand-50">
                  <Check size={15} />
                </span>
                <span className="min-w-0 flex-1 font-semibold">{t.title}</span>
                <span className="text-[11px] font-bold uppercase text-ink/40">{t.section}</span>
              </button>
            </li>
          ))}
        </ul>
        {pending.length > 4 && <p className="mt-1 text-[13px] font-semibold text-ink/50">e mais {pending.length - 4}</p>}
      </div>
    </>
  )
}

function OpenPolls() {
  const { snap, me } = useStore()
  const waiting = snap.trip_polls.filter((p) => !p.closed && !snap.trip_poll_votes.some((v) => v.poll_id === p.id && v.member_id === me.id))
  if (!waiting.length) return null
  return (
    <Link to="/enquetes" className="card mt-5 flex items-center gap-3 border-l-4 border-accent-500 !py-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-600">
        <VoteIcon size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold">Falta seu voto</span>
        <span className="block truncate text-[13px] text-ink/60">{waiting[0].question}</span>
      </span>
      <ChevronRight className="text-ink/35" />
    </Link>
  )
}

function TopIdeas() {
  const { snap } = useStore()
  const votes = useVotes()
  const top = useMemo(
    () =>
      snap.trip_items
        .filter((i) => i.status === 'ideia' || i.status === 'aprovado')
        .map((i) => ({ i, v: votes(i.id) }))
        .filter((x) => x.v.up.length > 0)
        .sort((a, b) => b.v.score - a.v.score || b.v.up.length - a.v.up.length)
        .slice(0, 3),
    [snap.trip_items, votes]
  )
  return (
    <>
      <SectionTitle action={<Link to="/ideias" className="text-sm font-bold text-brand-600">Ideias</Link>}>Mais votados</SectionTitle>
      {top.length === 0 ? (
        <Link to="/ideias" className="card flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Sparkles size={22} />
          </span>
          <span className="flex-1">
            <span className="block font-bold">Ninguém votou ainda</span>
            <span className="block text-[13px] text-ink/60">Cole links de hotel, parque e restaurante e votem 👍</span>
          </span>
        </Link>
      ) : (
        <ol className="card space-y-3">
          {top.map(({ i, v }, n) => (
            <li key={i.id}>
              <Link to={`/ideias/${i.id}`} className="flex items-center gap-3">
                <span className="w-5 text-center text-lg font-extrabold text-brand-500">{n + 1}</span>
                <CategoryIcon category={i.category} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{i.title}</span>
                  <span className="text-[13px] font-semibold text-ink/55">
                    👍 {v.up.length}
                    {v.down.length > 0 && ` · 👎 ${v.down.length}`}
                    {i.price != null && ` · ${priceLabel(i)}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

function Money() {
  const { snap, members, me, trip } = useStore()
  const rates = useRates()
  const mine = useMemo(() => balances(snap.trip_expenses, members).find((b) => b.member === me.id), [snap.trip_expenses, members, me.id])
  const total = snap.trip_expenses.filter((e) => e.kind === 'gasto').reduce((s, e) => s + e.amount * e.rate, 0)
  const net = (mine?.net ?? 0) / 100
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <Link to="/gastos" className="rounded-2xl bg-surface p-4 ring-1 ring-line/80">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink/55">
          <Receipt size={15} /> Seu saldo
        </p>
        <p className={`mt-1 text-[20px] font-extrabold tabular-nums ${net > 0.004 ? 'text-mint-600' : net < -0.004 ? 'text-danger-600' : ''}`}>{money(Math.abs(net), trip.base_currency)}</p>
        <p className="text-[12px] font-semibold text-ink/50">{net > 0.004 ? 'para receber' : net < -0.004 ? 'você deve' : `gasto total ${money(total, trip.base_currency, 0)}`}</p>
      </Link>
      <Link to="/cambio" className="rounded-2xl bg-surface p-4 ring-1 ring-line/80">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink/55">
          <ArrowLeftRight size={15} /> Câmbio {rates.live ? 'hoje' : ''}
        </p>
        <p className="mt-1 text-[16px] font-extrabold tabular-nums">🇺🇸 {money(rates.rates.USD)}</p>
        <p className="text-[16px] font-extrabold tabular-nums">🇨🇦 {money(rates.rates.CAD)}</p>
      </Link>
    </div>
  )
}

type FeedEntry = { at: string; who: string | null; text: string; to: string; icon: 'plus' | 'comment' | 'money' }

function Feed() {
  const { snap, me, member } = useStore()
  const entries = useMemo(() => {
    const out: FeedEntry[] = []
    const itemTitle = new Map(snap.trip_items.map((i) => [i.id, i.title]))
    for (const i of snap.trip_items) out.push({ at: i.created_at, who: i.created_by, text: `adicionou ${i.title}`, to: `/ideias/${i.id}`, icon: 'plus' })
    for (const c of snap.trip_comments) out.push({ at: c.created_at, who: c.member_id, text: `comentou em ${itemTitle.get(c.item_id) ?? 'uma ideia'}: “${c.body.slice(0, 60)}”`, to: `/ideias/${c.item_id}`, icon: 'comment' })
    for (const e of snap.trip_expenses)
      out.push({ at: e.created_at, who: e.created_by ?? e.paid_by, text: e.kind === 'acerto' ? 'registrou um acerto de contas' : `lançou ${e.title} (${money(e.amount, e.currency)})`, to: '/gastos', icon: 'money' })
    return out
      .filter((x) => x.who !== me.id)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 6)
  }, [snap.trip_items, snap.trip_comments, snap.trip_expenses, me.id])

  if (!entries.length) return null
  const Icon = { plus: Plus, comment: MessageCircle, money: Receipt }
  return (
    <>
      <SectionTitle>Novidades da galera</SectionTitle>
      <ul className="card space-y-3.5">
        {entries.map((e, i) => {
          const I = Icon[e.icon]
          const m = member(e.who)
          return (
            <li key={i}>
              <Link to={e.to} className="flex items-start gap-3">
                <span className="relative">
                  <Avatar member={m} size={34} />
                  <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-surface text-brand-600 ring-1 ring-line">
                    <I size={10} />
                  </span>
                </span>
                <span className="min-w-0 flex-1 text-[14px] leading-snug">
                  <b>{m?.name.split(' ')[0] ?? 'Alguém'}</b> {e.text}
                  <span className="block text-[12px] font-semibold text-ink/45">{ago(e.at)}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-center text-[12px] font-semibold text-ink/40">{plural(snap.trip_items.length, 'ideia', 'ideias')} na viagem</p>
    </>
  )
}
