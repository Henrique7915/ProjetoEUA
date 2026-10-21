import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowDown, ArrowUp, Copy, Loader2, MapPin, MessageCircle, Plus, Share2, Trash2 } from 'lucide-react'
import { Avatar, ConfirmButton, Page, SectionTitle, Sheet, TopBar } from '../components/ui'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import type { Member, Stop } from '../data/types'
import { COUNTRY_FLAG, DESTINATIONS, MEMBER_COLORS, TRIP_EMOJIS } from '../content/catalog'
import { dateRange, diffDays } from '../lib/dates'
import { inviteLink, inviteText, prettyCode, whatsappLink } from '../lib/invite'
import { searchPlace, type Place } from '../lib/geo'

export default function Group() {
  const openMenu = useOpenMenu()
  useEffect(() => {
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
  }, [])
  return (
    <>
      <TopBar title="Grupo e viagem" back onMenu={openMenu} />
      <Page>
        <Invite />
        <People />
        <TripInfo />
        <Stops />
      </Page>
    </>
  )
}

function Invite() {
  const { trip, showToast } = useStore()
  const [qr, setQr] = useState('')
  const link = inviteLink(trip.code)
  const text = inviteText(trip.name, trip.code)

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#10283A', light: '#FFFFFF' } }).then(setQr, () => setQr(''))
  }, [link])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Convite copiado! Cole no grupo da viagem.')
    } catch {
      showToast(link)
    }
  }

  return (
    <section className="card">
      <p className="text-[13px] font-bold uppercase tracking-wide text-ink/50">Convite</p>
      <p className="mt-1 text-[15px] text-ink/70">Quem abrir o link entra na viagem e escolhe o próprio nome.</p>
      <div className="mt-4 flex items-center gap-4">
        {qr && <img src={qr} alt="QR code do convite" className="h-28 w-28 shrink-0 rounded-2xl bg-white p-1.5 ring-1 ring-line" />}
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-ink/50">Código</p>
          <p className="whitespace-nowrap font-mono text-[clamp(16px,4.8vw,22px)] font-extrabold">{prettyCode(trip.code)}</p>
          <p className="mt-1 truncate text-[12px] text-ink/45">{link}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <a href={whatsappLink(text)} target="_blank" rel="noopener noreferrer" className="btn btn-primary !px-2 !py-2.5 text-[13px]">
          <MessageCircle size={17} /> WhatsApp
        </a>
        <button onClick={copy} className="btn btn-soft !px-2 !py-2.5 text-[13px]">
          <Copy size={17} /> Copiar
        </button>
        <button
          onClick={() => (navigator.share ? navigator.share({ title: trip.name, text, url: link }).catch(() => {}) : copy())}
          className="btn btn-soft !px-2 !py-2.5 text-[13px]"
        >
          <Share2 size={17} /> Enviar
        </button>
      </div>
      <p className="mt-3 text-[12px] font-semibold text-ink/45">Guarde o código só no grupo: quem tem ele consegue ver e editar a viagem.</p>
    </section>
  )
}

function People() {
  const { members, me, add, showToast } = useStore()
  const [editing, setEditing] = useState<Member | null>(null)
  const [name, setName] = useState('')

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    const color = MEMBER_COLORS.find((c) => !members.some((m) => m.color === c)) ?? MEMBER_COLORS[members.length % MEMBER_COLORS.length]
    if (await add('trip_members', { name: clean, color })) {
      setName('')
      showToast(`${clean} entrou no grupo.`)
    }
  }

  return (
    <>
      <SectionTitle>Pessoas ({members.length})</SectionTitle>
      <ul className="card !p-0">
        {members.map((m) => (
          <li key={m.id} className="border-b border-line/60 last:border-0">
            <button onClick={() => setEditing(m)} className="flex w-full items-center gap-3 p-3.5 text-left">
              <Avatar member={m} size={36} />
              <span className="flex-1 font-bold">
                {m.name} {m.id === me.id && <span className="text-[12px] font-bold text-brand-600">(você)</span>}
              </span>
              <span className="text-[13px] font-bold text-ink/40">Editar</span>
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addPerson} className="mt-3 flex gap-2">
        <input className="input" placeholder="Adicionar pessoa (ex.: quem não usa o app)" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Nome da pessoa" />
        <button type="submit" className="btn btn-soft shrink-0 !px-4" aria-label="Adicionar pessoa" disabled={!name.trim()}>
          <Plus size={20} />
        </button>
      </form>
      <MemberForm member={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function MemberForm({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { patch, remove, me, snap } = useStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [emoji, setEmoji] = useState('')
  useEffect(() => {
    if (member) {
      setName(member.name)
      setColor(member.color)
      setEmoji(member.emoji)
    }
  }, [member])
  if (!member) return null
  const paid = snap.trip_expenses.some((e) => e.paid_by === member.id)
  return (
    <Sheet
      open
      onClose={onClose}
      title="Editar pessoa"
      footer={
        <div className="flex gap-2">
          {member.id !== me.id && !paid && (
            <ConfirmButton confirmLabel="Tirar do grupo?" onConfirm={async () => (await remove('trip_members', member.id)) && onClose()}>
              Remover
            </ConfirmButton>
          )}
          <button
            className="btn btn-primary flex-1"
            onClick={async () => {
              if (name.trim() && (await patch('trip_members', member.id, { name: name.trim(), color, emoji: emoji.trim() }))) onClose()
            }}
          >
            Salvar
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex justify-center">
          <Avatar member={{ ...member, name: name || '?', color, emoji }} size={72} />
        </div>
        <div>
          <label className="label" htmlFor="mb-name">
            Nome
          </label>
          <input id="mb-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </div>
        <div>
          <p className="label">Cor</p>
          <div className="flex flex-wrap gap-2">
            {MEMBER_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={`Cor ${c}`} aria-pressed={c === color} className={`h-10 w-10 rounded-full ${c === color ? 'ring-4 ring-brand-200' : ''}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="mb-emoji">
            Emoji no lugar das iniciais (opcional)
          </label>
          <input id="mb-emoji" className="input !w-24 text-center text-2xl" value={emoji} onChange={(e) => setEmoji([...e.target.value].slice(-2).join(''))} placeholder="😎" />
        </div>
        {paid && member.id !== me.id && <p className="text-[12.5px] text-ink/50">Essa pessoa pagou gastos da viagem, por isso não dá para remover.</p>}
      </div>
    </Sheet>
  )
}

function TripInfo() {
  const { trip, updateTrip } = useStore()
  const [f, setF] = useState({ name: trip.name, emoji: trip.emoji, start: trip.start_date ?? '', end: trip.end_date ?? '', notes: trip.notes })
  useEffect(() => setF({ name: trip.name, emoji: trip.emoji, start: trip.start_date ?? '', end: trip.end_date ?? '', notes: trip.notes }), [trip])
  const dirty = f.name !== trip.name || f.emoji !== trip.emoji || f.start !== (trip.start_date ?? '') || f.end !== (trip.end_date ?? '') || f.notes !== trip.notes
  return (
    <>
      <SectionTitle>Viagem</SectionTitle>
      <form
        className="card space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!f.name.trim() || (f.start && f.end && f.end < f.start)) return
          void updateTrip({ name: f.name.trim(), emoji: f.emoji, start_date: f.start || null, end_date: f.end || null, notes: f.notes })
        }}
      >
        <div>
          <label className="label" htmlFor="tr-name">
            Nome
          </label>
          <input id="tr-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TRIP_EMOJIS.map((em) => (
              <button key={em} type="button" onClick={() => setF({ ...f, emoji: em })} aria-pressed={em === f.emoji} className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${em === f.emoji ? 'bg-brand-100 ring-2 ring-brand-400' : 'bg-shell'}`}>
                {em}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[13px] font-bold text-ink/70">
            Ida
            <input type="date" className="input mt-1" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          </label>
          <label className="text-[13px] font-bold text-ink/70">
            Volta
            <input type="date" className="input mt-1" value={f.end} min={f.start || undefined} onChange={(e) => setF({ ...f, end: e.target.value })} />
          </label>
        </div>
        <div>
          <label className="label" htmlFor="tr-notes">
            Recado para o grupo
          </label>
          <textarea id="tr-notes" rows={3} className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={4000} placeholder="Ex.: orçamento combinado, regras da casa..." />
        </div>
        <button type="submit" disabled={!dirty} className="btn btn-primary w-full">
          Salvar
        </button>
      </form>
    </>
  )
}

function Stops() {
  const { snap, trip, patch, addMany } = useStore()
  const [editing, setEditing] = useState<Stop | 'new' | null>(null)
  const stops = [...snap.trip_stops].sort((a, b) => a.sort - b.sort)
  const used = new Set(stops.map((s) => s.city))

  const move = async (i: number, dir: -1 | 1) => {
    const a = stops[i]
    const b = stops[i + dir]
    if (!a || !b) return
    await patch('trip_stops', a.id, { sort: b.sort === a.sort ? b.sort + dir : b.sort })
    await patch('trip_stops', b.id, { sort: a.sort })
  }

  return (
    <section id="cidades" className="scroll-mt-16">
      <SectionTitle
        action={
          <button className="text-sm font-bold text-brand-600" onClick={() => setEditing('new')}>
            + Cidade
          </button>
        }
      >
        Cidades e datas
      </SectionTitle>
      {trip.start_date && <p className="-mt-1 mb-3 text-[13px] font-semibold text-ink/55">Viagem: {dateRange(trip.start_date, trip.end_date)}. Defina os dias de cada cidade para o roteiro e o clima.</p>}
      <ul className="card !p-0">
        {stops.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 border-b border-line/60 p-3 last:border-0">
            <button onClick={() => setEditing(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="text-2xl">{COUNTRY_FLAG[s.country] ?? '📍'}</span>
              <span className="min-w-0">
                <span className="block font-bold">{s.city}</span>
                <span className="block text-[12.5px] font-semibold text-ink/55">
                  {s.start_date ? `${dateRange(s.start_date, s.end_date)} · ${diffDays(s.end_date ?? s.start_date, s.start_date) + 1} dias` : 'Sem datas'}
                  {s.lat == null && ' · sem mapa'}
                </span>
              </span>
            </button>
            <button className="icon-btn !h-9 !w-9" onClick={() => void move(i, -1)} disabled={i === 0} aria-label="Subir">
              <ArrowUp size={18} />
            </button>
            <button className="icon-btn !h-9 !w-9" onClick={() => void move(i, 1)} disabled={i === stops.length - 1} aria-label="Descer">
              <ArrowDown size={18} />
            </button>
          </li>
        ))}
        {stops.length === 0 && <li className="p-4 text-ink/55">Nenhuma cidade ainda.</li>}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {DESTINATIONS.filter((d) => !used.has(d.city)).map((d) => (
          <button
            key={d.city}
            className="rounded-full bg-surface px-3 py-1.5 text-[13px] font-bold text-ink/65 ring-1 ring-line hover:bg-brand-50"
            onClick={() => void addMany('trip_stops', [{ city: d.city, country: d.country, lat: d.lat, lng: d.lng, sort: (stops.at(-1)?.sort ?? 0) + 1 }])}
          >
            + {d.country === 'US' ? '🇺🇸' : '🇨🇦'} {d.city}
          </button>
        ))}
      </div>
      <StopForm stop={editing} onClose={() => setEditing(null)} nextSort={(stops.at(-1)?.sort ?? 0) + 1} />
    </section>
  )
}

function StopForm({ stop, onClose, nextSort }: { stop: Stop | 'new' | null; onClose: () => void; nextSort: number }) {
  const { trip, add, patch, remove, showToast } = useStore()
  const s = stop && stop !== 'new' ? stop : null
  const [f, setF] = useState({ city: '', country: 'US', start: '', end: '', lat: null as number | null, lng: null as number | null, notes: '' })
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (stop) setF({ city: s?.city ?? '', country: s?.country ?? 'US', start: s?.start_date ?? '', end: s?.end_date ?? '', lat: s?.lat ?? null, lng: s?.lng ?? null, notes: s?.notes ?? '' })
    setPlaces(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop])
  if (!stop) return null

  const find = async () => {
    if (!f.city.trim()) return
    setBusy(true)
    setPlaces(await searchPlace(f.city).catch(() => []))
    setBusy(false)
  }

  const save = async () => {
    if (!f.city.trim()) return showToast('Nome da cidade.')
    if (f.start && f.end && f.end < f.start) return showToast('A saída precisa ser depois da chegada.')
    const row = { city: f.city.trim(), country: f.country, start_date: f.start || null, end_date: f.end || f.start || null, lat: f.lat, lng: f.lng, notes: f.notes }
    const ok = s ? await patch('trip_stops', s.id, row) : !!(await add('trip_stops', { ...row, sort: nextSort }))
    if (ok) onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={s ? s.city : 'Nova cidade'}
      footer={
        <div className="flex gap-2">
          {s && (
            <ConfirmButton confirmLabel="Apagar?" onConfirm={async () => (await remove('trip_stops', s.id)) && onClose()}>
              <Trash2 size={17} />
            </ConfirmButton>
          )}
          <button className="btn btn-primary flex-1" onClick={() => void save()}>
            Salvar
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="st-city">
            Cidade
          </label>
          <div className="flex gap-2">
            <input id="st-city" className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={80} />
            <button type="button" className="btn btn-soft shrink-0 !px-3.5" onClick={() => void find()} aria-label="Achar no mapa">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
            </button>
          </div>
          <p className="mt-1 text-[12.5px] text-ink/50">{f.lat != null ? '📍 No mapa e com clima.' : 'Toque no 📍 para achar no mapa (e ter o clima).'}</p>
          {places && (
            <ul className="mt-2 space-y-1.5">
              {places.length === 0 && <li className="text-[13px] text-ink/55">Não achei.</li>}
              {places.map((p) => (
                <li key={`${p.lat},${p.lng}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setF({ ...f, lat: p.lat, lng: p.lng, country: /Canad/i.test(p.label) ? 'CA' : /Estados Unidos|United States/i.test(p.label) ? 'US' : f.country })
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
        </div>
        <div>
          <label className="label" htmlFor="st-country">
            País
          </label>
          <select id="st-country" className="input" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
            <option value="US">🇺🇸 Estados Unidos</option>
            <option value="CA">🇨🇦 Canadá</option>
            <option value="MX">🇲🇽 México</option>
            <option value="BR">🇧🇷 Brasil</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[13px] font-bold text-ink/70">
            Chegada
            <input type="date" className="input mt-1" value={f.start} min={trip.start_date ?? undefined} max={trip.end_date ?? undefined} onChange={(e) => setF({ ...f, start: e.target.value })} />
          </label>
          <label className="text-[13px] font-bold text-ink/70">
            Saída
            <input type="date" className="input mt-1" value={f.end} min={f.start || trip.start_date || undefined} max={trip.end_date ?? undefined} onChange={(e) => setF({ ...f, end: e.target.value })} />
          </label>
        </div>
        <div>
          <label className="label" htmlFor="st-notes">
            Anotações
          </label>
          <textarea id="st-notes" rows={2} className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={2000} />
        </div>
      </div>
    </Sheet>
  )
}
