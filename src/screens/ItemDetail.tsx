import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Copy, Map as MapIcon, MapPin, Navigation, Pencil, Receipt, Send, StickyNote, Ticket } from 'lucide-react'
import { Avatar, ConfirmButton, Empty, Page, TopBar } from '../components/ui'
import { CategoryIcon, ItemForm, OpenLink, priceLabel, StatusBadge, VoteBar } from '../components/items'
import { useStore } from '../data/store'
import { useComments, useRates, useVotes } from '../data/derived'
import type { ItemStatus } from '../data/types'
import { CATEGORY } from '../content/catalog'
import { ago, compactDate, hhmm } from '../lib/dates'
import { convert, money } from '../lib/money'
import { directionsLink, mapsLink } from '../lib/geo'

export default function ItemDetail() {
  const { id } = useParams()
  const { snap, members, me, member, patch, add, remove, showToast } = useStore()
  const votes = useVotes()
  const comments = useComments()
  const rates = useRates()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const item = snap.trip_items.find((i) => i.id === id)

  if (!item)
    return (
      <>
        <TopBar title="Ideia" back="/ideias" />
        <Page>
          <Empty icon={<StickyNote size={30} />} title="Essa ideia não existe mais" text="Alguém pode ter apagado." action={<Link to="/ideias" className="btn btn-primary">Ver ideias</Link>} />
        </Page>
      </>
    )

  const v = votes(item.id)
  const thread = comments(item.id)
  const stop = snap.trip_stops.find((s) => s.id === item.stop_id)
  const by = member(item.created_by)
  const expenses = snap.trip_expenses.filter((e) => e.item_id === item.id)
  const n = members.length
  const brl = item.price != null && item.currency !== 'BRL' ? convert(item.price, item.currency, 'BRL', rates.rates) : null
  const perPerson = item.price != null ? (item.price_per === 'pessoa' ? item.price : item.price / Math.max(n, 1)) : null

  const setStatus = (status: ItemStatus) => void patch('trip_items', item.id, { status })

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setText('')
    const ok = await add('trip_comments', { item_id: item.id, member_id: me.id, body })
    if (!ok) setText(body)
  }

  return (
    <>
      <TopBar
        title={CATEGORY[item.category].label}
        back
        right={
          <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Editar">
            <Pencil size={21} />
          </button>
        }
      />
      <Page className="!pb-10">
        {item.image_url && <img src={item.image_url} alt="" referrerPolicy="no-referrer" className="mb-4 h-52 w-full rounded-3xl bg-shell object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
        <div className="flex items-start gap-3">
          {!item.image_url && <CategoryIcon category={item.category} size={52} />}
          <div className="min-w-0 flex-1">
            <StatusBadge status={item.status} />
            <h1 className="mt-1.5 text-[24px] font-extrabold leading-tight tracking-tight">{item.title}</h1>
            <p className="mt-1 text-[13px] font-semibold text-ink/50">
              {item.site && `${item.site} · `}
              {by ? `por ${by.name}` : ''} {ago(item.created_at)}
            </p>
          </div>
        </div>

        {item.description && <p className="mt-3 text-[15px] leading-relaxed text-ink/70">{item.description}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {item.url && <OpenLink url={item.url} />}
          {item.lat != null && item.lng != null && (
            <>
              <Link to={`/mapa?item=${item.id}`} className="btn btn-soft">
                <MapIcon size={17} /> No mapa
              </Link>
              <a href={directionsLink(item.lat, item.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-soft">
                <Navigation size={17} /> Como chegar
              </a>
            </>
          )}
        </div>

        <section className="card mt-5">
          <p className="label !mb-3">O que a galera acha?</p>
          <VoteBar item={item} votes={v} compact />
          {(v.up.length > 0 || v.down.length > 0) && (
            <div className="mt-3 space-y-1.5 text-[13px] font-semibold text-ink/60">
              {v.up.length > 0 && <p>👍 {v.up.map((x) => member(x.member_id)?.name.split(' ')[0]).join(', ')}</p>}
              {v.down.length > 0 && <p>👎 {v.down.map((x) => member(x.member_id)?.name.split(' ')[0]).join(', ')}</p>}
            </div>
          )}
          {v.up.length + v.down.length < n && <p className="mt-2 text-[12px] font-semibold text-ink/45">{n - v.up.length - v.down.length === 1 ? 'Falta 1 pessoa votar' : `Faltam ${n - v.up.length - v.down.length} pessoas votarem`}</p>}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(['aprovado', 'reservado', 'descartado'] as ItemStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(item.status === s ? 'ideia' : s)}
                className={`rounded-2xl px-2 py-2.5 text-[13px] font-bold transition ${
                  item.status === s ? (s === 'descartado' ? 'bg-danger-500 text-white' : s === 'aprovado' ? 'bg-mint-500 text-white' : 'bg-brand-500 text-onbrand') : 'bg-shell text-ink/65'
                }`}
              >
                {s === 'aprovado' ? '✓ Aprovar' : s === 'reservado' ? 'Reservado' : '✕ Descartar'}
              </button>
            ))}
          </div>
        </section>

        <section className="card mt-4 space-y-3.5">
          <Row icon={<MapPin size={18} />} label="Cidade">
            {stop?.city ?? <span className="text-ink/45">Sem cidade</span>}
          </Row>
          <Row icon={<CalendarDays size={18} />} label="Quando">
            {item.day ? (
              <>
                {compactDate(item.day)}
                {item.end_day && ` até ${compactDate(item.end_day)}`}
                {item.start_time && ` às ${hhmm(item.start_time)}`}
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="font-bold text-brand-600">
                Agendar no roteiro
              </button>
            )}
          </Row>
          {item.price != null && (
            <Row icon={<Receipt size={18} />} label="Preço">
              {priceLabel(item)}
              {brl != null && <span className="text-ink/50"> ≈ {money(brl, 'BRL', 0)}</span>}
              {perPerson != null && item.price_per === 'total' && n > 1 && (
                <span className="block text-[13px] text-ink/55">
                  {money(perPerson, item.currency)} por pessoa ({n} pessoas)
                </span>
              )}
            </Row>
          )}
          {item.address && (
            <Row icon={<MapPin size={18} />} label="Endereço">
              {item.lat != null && item.lng != null ? (
                <a href={mapsLink(item.lat, item.lng)} target="_blank" rel="noopener noreferrer" className="underline decoration-ink/20 underline-offset-2">
                  {item.address}
                </a>
              ) : (
                item.address
              )}
            </Row>
          )}
          {item.confirmation && (
            <Row icon={<Ticket size={18} />} label="Reserva">
              <button
                className="inline-flex items-center gap-1.5 font-mono"
                onClick={() => {
                  void navigator.clipboard?.writeText(item.confirmation)
                  showToast('Código copiado.')
                }}
              >
                {item.confirmation} <Copy size={14} className="text-ink/40" />
              </button>
            </Row>
          )}
          {item.note && (
            <Row icon={<StickyNote size={18} />} label="Anotações">
              <span className="whitespace-pre-wrap">{item.note}</span>
            </Row>
          )}
          <Row icon={<Receipt size={18} />} label="Gastos">
            {expenses.length ? `${expenses.length} lançado(s): ${money(expenses.reduce((s, e) => s + e.amount * e.rate, 0), 'BRL')}` : <span className="text-ink/45">Nenhum</span>}
            <Link to={`/gastos?item=${item.id}`} className="mt-1 block text-[14px] font-bold text-brand-600">
              + Lançar como gasto
            </Link>
          </Row>
        </section>

        <section className="mt-6">
          <h2 className="h-section mb-3">Comentários {thread.length > 0 && <span className="text-ink/40">{thread.length}</span>}</h2>
          <ul className="space-y-3">
            {thread.map((c) => {
              const m = member(c.member_id)
              return (
                <li key={c.id} className="flex gap-2.5">
                  <Avatar member={m} size={32} />
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 ring-1 ring-line/80">
                    <p className="text-[12.5px] font-bold text-ink/55">
                      {m?.name ?? 'Alguém'} · {ago(c.created_at)}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[15px]">{c.body}</p>
                    {c.member_id === me.id && (
                      <ConfirmButton className="mt-1 text-[12px] font-bold text-ink/40" confirmLabel="Apagar?" onConfirm={() => void remove('trip_comments', c.id)}>
                        Apagar
                      </ConfirmButton>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <form onSubmit={send} className="mt-3 flex items-end gap-2">
            <Avatar member={me} size={32} />
            <textarea
              rows={1}
              className="input min-h-[46px] resize-none !py-2.5"
              placeholder="Escreva um comentário"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(e)
                }
              }}
              aria-label="Comentário"
              maxLength={2000}
            />
            <button type="submit" className="btn btn-primary !p-3" aria-label="Enviar comentário" disabled={!text.trim()}>
              <Send size={18} />
            </button>
          </form>
        </section>
      </Page>
      <ItemForm
        open={editing}
        item={item}
        onClose={() => setEditing(false)}
      />
    </>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-brand-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold uppercase tracking-wide text-ink/45">{label}</p>
        <div className="font-semibold">{children}</div>
      </div>
    </div>
  )
}
