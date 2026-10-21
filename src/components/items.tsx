import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, ExternalLink, Link2, Loader2, MapPin, MessageCircle, Search, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useStore } from '../data/store'
import { useVote, type ItemVotes } from '../data/derived'
import type { Currency, Item, ItemCategory, ItemStatus, NewRow } from '../data/types'
import { CATEGORIES, CATEGORY, STATUS, STATUSES } from '../content/catalog'
import { CURRENCIES, money, parseAmount } from '../lib/money'
import { compactDate, hhmm } from '../lib/dates'
import { extractUrl, fetchPreview, guessCategory, siteName } from '../lib/links'
import { searchPlace, type Place } from '../lib/geo'
import { AvatarStack, ConfirmButton, Segmented, Sheet } from './ui'

export function CategoryIcon({ category, size = 40 }: { category: ItemCategory; size?: number }) {
  const c = CATEGORY[category]
  const Icon = c.icon
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${c.tone}`} style={{ width: size, height: size }}>
      <Icon size={size * 0.5} aria-hidden />
    </span>
  )
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  const s = STATUS[status]
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${s.tone}`}>{s.label}</span>
}

export function VoteBar({ item, votes, compact = false }: { item: Item; votes: ItemVotes; compact?: boolean }) {
  const vote = useVote()
  const { member } = useStore()
  const mine = votes.mine?.value
  const btn = (on: boolean, tone: string) =>
    `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums transition active:scale-95 ${on ? tone : 'bg-shell text-ink/60 hover:bg-brand-50'}`
  return (
    <div className="flex items-center gap-2">
      <button className={btn(mine === 1, 'bg-mint-500 text-white')} onClick={() => void vote(item, 1, votes.mine)} aria-pressed={mine === 1} aria-label={`Curti (${votes.up.length})`}>
        <ThumbsUp size={15} /> {votes.up.length}
      </button>
      <button className={btn(mine === -1, 'bg-danger-500 text-white')} onClick={() => void vote(item, -1, votes.mine)} aria-pressed={mine === -1} aria-label={`Não curti (${votes.down.length})`}>
        <ThumbsDown size={15} /> {votes.down.length}
      </button>
      {!compact && votes.up.length > 0 && <AvatarStack members={votes.up.map((v) => member(v.member_id))} size={22} />}
    </div>
  )
}

export function priceLabel(item: Pick<Item, 'price' | 'currency' | 'price_per'>) {
  if (item.price == null) return ''
  return `${money(item.price, item.currency, item.price % 1 ? 2 : 0)}${item.price_per === 'pessoa' ? '/pessoa' : ''}`
}

export function ItemCard({ item, votes, comments, showVotes = true }: { item: Item; votes: ItemVotes; comments: number; showVotes?: boolean }) {
  const { snap, member } = useStore()
  const stop = snap.trip_stops.find((s) => s.id === item.stop_id)
  const by = member(item.created_by)
  return (
    <article className={`card !p-0 overflow-hidden ${item.status === 'descartado' ? 'opacity-60' : ''}`}>
      <Link to={`/ideias/${item.id}`} className="flex gap-3 p-4 pb-3">
        {item.image_url ? (
          <img src={item.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-20 w-20 shrink-0 rounded-2xl bg-shell object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <CategoryIcon category={item.category} size={56} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-bold text-ink/50">{CATEGORY[item.category].label}</span>
            {item.status !== 'ideia' && <StatusBadge status={item.status} />}
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-[16px] font-extrabold leading-snug">{item.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] font-semibold text-ink/55">
            {stop && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {stop.city}
              </span>
            )}
            {item.day && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={13} /> {compactDate(item.day)}
                {item.start_time && ` · ${hhmm(item.start_time)}`}
              </span>
            )}
            {item.price != null && <span className="text-ink/75">{priceLabel(item)}</span>}
            {item.site && <span className="truncate">{item.site}</span>}
          </p>
        </div>
      </Link>
      {showVotes && (
        <div className="flex items-center justify-between gap-2 border-t border-line/70 px-4 py-2.5">
          <VoteBar item={item} votes={votes} />
          <span className="flex items-center gap-3 text-[12px] font-semibold text-ink/45">
            {comments > 0 && (
              <Link to={`/ideias/${item.id}`} className="inline-flex items-center gap-1">
                <MessageCircle size={14} /> {comments}
              </Link>
            )}
            {by && <span>por {by.name.split(' ')[0]}</span>}
          </span>
        </div>
      )}
    </article>
  )
}

/** Campo "cole um link". Com link, busca título e foto; com texto, vira o título. */
export function AddLinkBar({ onReady, autoFocus, initial = '' }: { onReady: (draft: NewRow<'trip_items'>) => void; autoFocus?: boolean; initial?: string }) {
  const [text, setText] = useState(initial)
  const [busy, setBusy] = useState(false)

  const go = async (value = text) => {
    const v = value.trim()
    if (!v) return onReady({})
    const url = extractUrl(v)
    if (!url) {
      onReady({ title: v.slice(0, 200) })
      setText('')
      return
    }
    setBusy(true)
    const p = await fetchPreview(url)
    setBusy(false)
    const rest = v.replace(url, '').trim()
    onReady({
      url: p.url,
      title: (p.title || rest || siteName(p.url)).slice(0, 200),
      description: p.description.slice(0, 1000),
      image_url: p.image,
      site: p.site.slice(0, 120),
      lat: p.lat,
      lng: p.lng,
      category: guessCategory(p.url, p.title)
    })
    setText('')
  }

  useEffect(() => {
    if (initial) void go(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void go()
      }}
      className="flex items-center gap-2 rounded-full bg-surface p-1.5 pl-4 shadow-card ring-1 ring-line"
    >
      <Link2 size={19} className="shrink-0 text-brand-500" aria-hidden />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text')
          if (extractUrl(pasted) && !text) {
            e.preventDefault()
            setText(pasted)
            void go(pasted)
          }
        }}
        autoFocus={autoFocus}
        placeholder="Cole um link ou escreva uma ideia"
        aria-label="Link ou ideia"
        className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-ink/40"
      />
      <button type="submit" disabled={busy} className="btn btn-primary shrink-0 !px-4 !py-2.5 text-sm">
        {busy ? <Loader2 size={17} className="animate-spin" /> : 'Adicionar'}
      </button>
    </form>
  )
}

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[12.5px] text-ink/50">{hint}</p>}
    </div>
  )
}

const fromItem = (d: NewRow<'trip_items'>) => ({
  url: d.url ?? '',
  title: d.title ?? '',
  category: (d.category ?? 'passeio') as ItemCategory,
  status: (d.status ?? 'ideia') as ItemStatus,
  stop_id: d.stop_id ?? '',
  day: d.day ?? '',
  end_day: d.end_day ?? '',
  start_time: hhmm(d.start_time),
  price: d.price != null ? String(d.price).replace('.', ',') : '',
  currency: (d.currency ?? 'USD') as Currency,
  price_per: d.price_per ?? 'total',
  address: d.address ?? '',
  lat: d.lat ?? null,
  lng: d.lng ?? null,
  confirmation: d.confirmation ?? '',
  note: d.note ?? '',
  image_url: d.image_url ?? '',
  description: d.description ?? '',
  site: d.site ?? ''
})

/** Formulário de ideia (nova ou editar). */
export function ItemForm({ open, onClose, draft, item, onSaved }: { open: boolean; onClose: () => void; draft?: NewRow<'trip_items'>; item?: Item; onSaved?: (item: Item) => void }) {
  const { snap, trip, add, patch, remove, me, showToast } = useStore()
  const [f, setF] = useState(() => fromItem(item ?? draft ?? {}))
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setF(fromItem(item ?? draft ?? {}))
      setPlaces(null)
    }
  }, [open, item, draft])

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  // Escolheu um dia: sugere a cidade daquele dia.
  const setDay = (day: string) => {
    const stop = snap.trip_stops.find((s) => s.start_date && day >= s.start_date && day <= (s.end_date ?? s.start_date))
    setF((x) => ({ ...x, day, stop_id: x.stop_id || stop?.id || '', status: day && x.status === 'ideia' ? 'aprovado' : x.status }))
  }

  const findPlace = async () => {
    const stop = snap.trip_stops.find((s) => s.id === f.stop_id)
    const q = f.address || [f.title, stop?.city].filter(Boolean).join(', ')
    if (!q) return
    setSearching(true)
    try {
      setPlaces(await searchPlace(q))
    } catch {
      setPlaces([])
    }
    setSearching(false)
  }

  const refetch = async () => {
    const url = extractUrl(f.url)
    if (!url) return
    setSearching(true)
    const p = await fetchPreview(url)
    setSearching(false)
    setF((x) => ({
      ...x,
      url: p.url,
      title: x.title || p.title,
      image_url: p.image || x.image_url,
      description: p.description || x.description,
      site: p.site || x.site,
      lat: x.lat ?? p.lat,
      lng: x.lng ?? p.lng
    }))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title.trim()) return showToast('Dê um nome para a ideia.')
    const price = f.price ? parseAmount(f.price) : null
    if (f.price && (price == null || price < 0)) return showToast('Preço inválido.')
    const row: NewRow<'trip_items'> = {
      url: f.url.trim() ? (extractUrl(f.url) ?? f.url.trim()) : '',
      title: f.title.trim(),
      category: f.category,
      status: f.status,
      stop_id: f.stop_id || null,
      day: f.day || null,
      end_day: f.end_day && f.day && f.end_day > f.day ? f.end_day : null,
      start_time: f.start_time || null,
      price,
      currency: f.currency,
      price_per: f.price_per,
      address: f.address.trim(),
      lat: f.lat,
      lng: f.lng,
      confirmation: f.confirmation.trim(),
      note: f.note.trim(),
      image_url: f.image_url,
      description: f.description,
      site: f.site || (f.url ? siteName(f.url) : '')
    }
    setBusy(true)
    if (item) {
      const ok = await patch('trip_items', item.id, row)
      setBusy(false)
      if (ok) {
        onClose()
        onSaved?.({ ...item, ...row } as Item)
      }
    } else {
      const created = await add('trip_items', { ...row, created_by: me.id })
      setBusy(false)
      if (created) {
        showToast('Ideia adicionada! A galera já pode votar.')
        onClose()
        onSaved?.(created)
      }
    }
  }

  const multiDay = f.category === 'hospedagem' || !!f.end_day

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={item ? 'Editar ideia' : 'Nova ideia'}
      footer={
        <div className="flex gap-2">
          {item && (
            <ConfirmButton
              className="btn btn-danger"
              confirmLabel="Apagar mesmo?"
              onConfirm={async () => {
                if (await remove('trip_items', item.id)) onClose()
              }}
            >
              Apagar
            </ConfirmButton>
          )}
          <button form="item-form" type="submit" disabled={busy} className="btn btn-primary flex-1">
            {item ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      }
    >
      <form id="item-form" onSubmit={save} className="space-y-5">
        {f.image_url && <img src={f.image_url} alt="" referrerPolicy="no-referrer" className="h-36 w-full rounded-2xl bg-shell object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
        <Field label="Nome" htmlFor="it-title">
          <input id="it-title" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={200} placeholder="Ex.: Hotel perto da Disney" />
        </Field>
        <Field label="Link" htmlFor="it-url">
          <div className="flex gap-2">
            <input id="it-url" className="input" value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" inputMode="url" />
            {f.url && (
              <button type="button" onClick={refetch} className="btn btn-soft shrink-0 !px-3.5" aria-label="Buscar foto e título do link" title="Buscar foto e título do link">
                {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            )}
          </div>
        </Field>

        <div>
          <p className="label">Categoria</p>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon
              const on = f.category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set('category', c.id)}
                  aria-pressed={on}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-[11px] font-bold transition ${on ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-400' : 'bg-surface text-ink/60 ring-1 ring-line'}`}
                >
                  <Icon size={20} aria-hidden />
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="label">Situação</p>
          <Segmented value={f.status} onChange={(v) => set('status', v)} label="Situação" options={STATUSES.map((s) => ({ id: s.id, label: s.label }))} />
        </div>

        {snap.trip_stops.length > 0 && (
          <Field label="Cidade" htmlFor="it-stop">
            <select id="it-stop" className="input" value={f.stop_id} onChange={(e) => set('stop_id', e.target.value)}>
              <option value="">Sem cidade definida</option>
              {snap.trip_stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.city}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className={`grid gap-3 ${multiDay ? 'grid-cols-2' : 'grid-cols-[1fr_auto]'}`}>
          <Field label={multiDay ? 'Entrada (check-in)' : 'Dia'} htmlFor="it-day">
            <input id="it-day" type="date" className="input" value={f.day} min={trip.start_date ?? undefined} max={trip.end_date ?? undefined} onChange={(e) => setDay(e.target.value)} />
          </Field>
          {multiDay ? (
            <Field label="Saída (check-out)" htmlFor="it-end">
              <input id="it-end" type="date" className="input" value={f.end_day} min={f.day || trip.start_date || undefined} max={trip.end_date ?? undefined} onChange={(e) => set('end_day', e.target.value)} />
            </Field>
          ) : (
            <Field label="Horário" htmlFor="it-time">
              <div className="relative">
                <Clock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                <input id="it-time" type="time" className="input !w-36 pl-9" value={f.start_time} onChange={(e) => set('start_time', e.target.value)} />
              </div>
            </Field>
          )}
        </div>

        <div>
          <p className="label">Preço (opcional)</p>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input className="input" inputMode="decimal" placeholder="0,00" value={f.price} onChange={(e) => set('price', e.target.value)} aria-label="Preço" />
            <select className="input !w-auto" value={f.currency} onChange={(e) => set('currency', e.target.value as Currency)} aria-label="Moeda">
              {CURRENCIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.flag} {c.id}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2">
            <Segmented
              value={f.price_per}
              onChange={(v) => set('price_per', v)}
              label="O preço é"
              options={[
                { id: 'total', label: 'Total do grupo' },
                { id: 'pessoa', label: 'Por pessoa' }
              ]}
            />
          </div>
        </div>

        <Field label="Endereço" htmlFor="it-addr" hint={f.lat != null ? '📍 Está no mapa.' : 'Com endereço, aparece no mapa.'}>
          <div className="flex gap-2">
            <input id="it-addr" className="input" value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Rua, número, cidade" maxLength={300} />
            <button type="button" onClick={findPlace} className="btn btn-soft shrink-0 !px-3.5" aria-label="Achar no mapa" title="Achar no mapa">
              {searching ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
            </button>
          </div>
          {places && (
            <ul className="mt-2 space-y-1.5">
              {places.length === 0 && <li className="text-[13px] text-ink/55">Não achei. Tente com o nome da cidade.</li>}
              {places.map((p) => (
                <li key={`${p.lat},${p.lng}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setF((x) => ({ ...x, lat: p.lat, lng: p.lng, address: x.address || p.label.split(',').slice(0, 3).join(',') }))
                      setPlaces(null)
                    }}
                    className="w-full rounded-xl bg-surface p-2.5 text-left text-[13px] font-semibold ring-1 ring-line hover:bg-brand-50"
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        {(f.status === 'reservado' || f.confirmation) && (
          <Field label="Código da reserva" htmlFor="it-conf">
            <input id="it-conf" className="input font-mono" value={f.confirmation} onChange={(e) => set('confirmation', e.target.value)} maxLength={200} />
          </Field>
        )}

        <Field label="Anotações" htmlFor="it-note">
          <textarea id="it-note" rows={3} className="input" value={f.note} onChange={(e) => set('note', e.target.value)} maxLength={4000} placeholder="Por que vale a pena, horários, dicas..." />
        </Field>
      </form>
    </Sheet>
  )
}

export function OpenLink({ url, children }: { url: string; children?: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-line">
      <ExternalLink size={17} /> {children ?? 'Abrir link'}
    </a>
  )
}
