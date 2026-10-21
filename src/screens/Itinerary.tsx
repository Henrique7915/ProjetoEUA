import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, CalendarDays, CalendarPlus, Map as MapIcon, Plus } from 'lucide-react'
import { Empty, Page, SectionTitle, TopBar } from '../components/ui'
import { CategoryIcon, ItemForm } from '../components/items'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import { itemsOn, stopOn, tripDays } from '../data/derived'
import type { Item, NewRow, Stop } from '../data/types'
import { COUNTRY_FLAG } from '../content/catalog'
import { compactDate, dateRange, diffDays, hhmm, todayISO, type ISODate } from '../lib/dates'
import { weatherEmoji, weatherFor, type DayWeather } from '../lib/weather'
import { download, itineraryICS } from '../lib/ics'

const STOP_COLORS = ['bg-brand-500', 'bg-accent-500', 'bg-mint-500', 'bg-lilac-500', 'bg-rosy-500', 'bg-sun-400', 'bg-sky-500']

function useWeather(stops: Stop[]) {
  const [data, setData] = useState<{ days: Map<ISODate, DayWeather>; history: boolean }>({ days: new Map(), history: false })
  const key = stops.map((s) => `${s.id}:${s.start_date}:${s.end_date}:${s.lat}`).join('|')
  useEffect(() => {
    let alive = true
    const jobs = stops.filter((s) => s.lat != null && s.lng != null && s.start_date).map((s) => weatherFor(s.lat!, s.lng!, s.start_date!, s.end_date ?? s.start_date!))
    Promise.all(jobs).then((results) => {
      if (!alive) return
      const days = new Map<ISODate, DayWeather>()
      let history = false
      for (const r of results) {
        if (!r) continue
        if (r.kind === 'history') history = true
        r.days.forEach((w, d) => days.set(d, w))
      }
      setData({ days, history })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return data
}

export default function Itinerary() {
  const openMenu = useOpenMenu()
  const { snap, trip, updateTrip } = useStore()
  const [draft, setDraft] = useState<NewRow<'trip_items'> | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const days = tripDays(trip)
  const weather = useWeather(snap.trip_stops)
  const today = todayISO()

  const unscheduled = useMemo(
    () => snap.trip_items.filter((i) => !i.day && (i.status === 'aprovado' || i.status === 'reservado')).sort((a, b) => a.category.localeCompare(b.category)),
    [snap.trip_items]
  )

  useEffect(() => {
    if (days.includes(today)) document.getElementById(`dia-${today}`)?.scrollIntoView({ block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!days.length) return <NoDates onSave={(start, end) => void updateTrip({ start_date: start, end_date: end })} openMenu={openMenu} />

  const exportICS = () => download(`${trip.name}.ics`, itineraryICS(trip.name, snap.trip_items, snap.trip_stops), 'text/calendar')

  return (
    <>
      <TopBar
        title="Roteiro"
        onMenu={openMenu}
        right={
          <Link to="/mapa" className="icon-btn" aria-label="Ver no mapa">
            <MapIcon size={22} />
          </Link>
        }
      />
      <Page>
        <p className="text-center text-[13px] font-bold text-ink/55">
          {dateRange(trip.start_date, trip.end_date)} · {days.length} dias
        </p>
        <Timeline days={days} stops={snap.trip_stops} />

        <div className="mt-4 flex gap-2">
          <button onClick={exportICS} className="btn btn-line flex-1 !py-2.5 text-sm">
            <CalendarPlus size={17} /> Calendário
          </button>
          <Link to="/grupo#cidades" className="btn btn-soft flex-1 !py-2.5 text-sm">
            📍 Cidades e datas
          </Link>
        </div>
        {snap.trip_stops.length > 0 && !snap.trip_stops.some((s) => s.start_date) && (
          <Link to="/grupo#cidades" className="mt-3 block rounded-2xl bg-sun-400/15 p-3 text-[13px] font-semibold text-sun-600">
            Defina os dias de cada cidade para o roteiro mostrar onde vocês estão e o clima →
          </Link>
        )}
        {weather.history && <p className="mt-3 text-center text-[12px] font-semibold text-ink/45">Clima: como foi nesses mesmos dias no ano passado. A previsão aparece 15 dias antes.</p>}

        {unscheduled.length > 0 && (
          <>
            <SectionTitle>Aprovados sem dia</SectionTitle>
            <div className="card space-y-3">
              {unscheduled.map((it) => (
                <div key={it.id} className="flex items-center gap-3">
                  <CategoryIcon category={it.category} size={36} />
                  <Link to={`/ideias/${it.id}`} className="min-w-0 flex-1 truncate font-bold">
                    {it.title}
                  </Link>
                  <button onClick={() => setEditing(it)} className="btn btn-soft shrink-0 !px-3 !py-1.5 text-[13px]">
                    Agendar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 space-y-4">
          {days.map((day, i) => (
            <DayCard
              key={day}
              day={day}
              index={i}
              stop={stopOn(snap.trip_stops, day)}
              items={itemsOn(snap.trip_items, day)}
              weather={weather.days.get(day)}
              isToday={day === today}
              onAdd={(stop) => setDraft({ day, stop_id: stop?.id ?? null, status: 'aprovado' })}
            />
          ))}
        </div>
      </Page>
      <ItemForm open={!!draft} draft={draft ?? undefined} onClose={() => setDraft(null)} />
      <ItemForm open={!!editing} item={editing ?? undefined} onClose={() => setEditing(null)} />
    </>
  )
}

function Timeline({ days, stops }: { days: ISODate[]; stops: Stop[] }) {
  const dated = stops.filter((s) => s.start_date)
  if (!dated.length) return null
  const first = days[0]
  const total = days.length
  return (
    <div className="mt-3">
      <div className="relative h-3 overflow-hidden rounded-full bg-shell">
        {dated.map((s, i) => {
          const start = Math.max(0, diffDays(s.start_date!, first))
          const len = diffDays(s.end_date ?? s.start_date!, s.start_date!) + 1
          return <span key={s.id} className={`absolute inset-y-0 ${STOP_COLORS[i % STOP_COLORS.length]}`} style={{ left: `${(start / total) * 100}%`, width: `${(len / total) * 100}%` }} title={s.city} />
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {dated.map((s, i) => (
          <span key={s.id} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink/65">
            <span className={`h-2.5 w-2.5 rounded-full ${STOP_COLORS[i % STOP_COLORS.length]}`} />
            {s.city} <span className="font-semibold text-ink/40">{diffDays(s.end_date ?? s.start_date!, s.start_date!) + 1}d</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function DayCard({ day, index, stop, items, weather, isToday, onAdd }: { day: ISODate; index: number; stop?: Stop; items: Item[]; weather?: DayWeather; isToday: boolean; onAdd: (stop?: Stop) => void }) {
  const stays = items.filter((i) => i.category === 'hospedagem' && i.end_day)
  const rest = items.filter((i) => !(i.category === 'hospedagem' && i.end_day))
  return (
    <section id={`dia-${day}`} className={`card scroll-mt-20 !p-0 ${isToday ? 'ring-2 ring-brand-400' : ''}`}>
      <header className="flex items-center gap-3 px-4 pb-2 pt-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500 text-onbrand">
          <span className="text-center leading-none">
            <span className="block text-[10px] font-bold uppercase opacity-80">Dia</span>
            <span className="block text-[17px] font-extrabold">{index + 1}</span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold capitalize">
            {compactDate(day)} {isToday && <span className="ml-1 rounded-full bg-accent-500 px-2 py-0.5 text-[11px] font-extrabold uppercase text-white">Hoje</span>}
          </p>
          <p className="text-[13px] font-semibold text-ink/55">{stop ? `${COUNTRY_FLAG[stop.country] ?? ''} ${stop.city}` : 'Cidade a definir'}</p>
        </div>
        {weather && (
          <span className="text-right text-[12.5px] font-bold leading-tight text-ink/65" title={`Chuva: ${weather.rain.toFixed(1)} mm`}>
            <span className="text-xl">{weatherEmoji(weather)}</span>
            <span className="block tabular-nums">
              {weather.max}° <span className="text-ink/40">{weather.min}°</span>
            </span>
          </span>
        )}
      </header>
      <ul className="px-4">
        {stays.map((it) => (
          <li key={it.id}>
            <Link to={`/ideias/${it.id}`} className="flex items-center gap-2 rounded-xl bg-lilac-500/10 px-3 py-2 text-[13px] font-bold text-lilac-600">
              <BedDouble size={16} /> <span className="truncate">{it.title}</span>
              <span className="ml-auto shrink-0 text-[11px] font-semibold opacity-70">{day === it.day ? 'check-in' : day === it.end_day ? 'check-out' : 'hospedado'}</span>
            </Link>
          </li>
        ))}
        {rest.map((it) => (
          <li key={it.id} className="border-b border-line/60 last:border-0">
            <Link to={`/ideias/${it.id}`} className="flex items-center gap-3 py-3">
              <span className="w-11 shrink-0 text-[13px] font-extrabold tabular-nums text-ink/60">{hhmm(it.start_time) || '—'}</span>
              <CategoryIcon category={it.category} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{it.title}</span>
                {it.status === 'reservado' && <span className="text-[12px] font-bold text-brand-600">🎟️ reservado</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <button onClick={() => onAdd(stop)} className="flex w-full items-center justify-center gap-1.5 rounded-b-3xl py-3 text-[13px] font-bold text-brand-600 hover:bg-brand-50/60">
        <Plus size={16} /> Adicionar ao dia
      </button>
    </section>
  )
}

function NoDates({ onSave, openMenu }: { onSave: (start: string, end: string) => void; openMenu: () => void }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const { snap } = useStore()
  return (
    <>
      <TopBar title="Roteiro" onMenu={openMenu} />
      <Page>
        <Empty
          icon={<CalendarDays size={30} />}
          title="Quando é a viagem?"
          text="Com as datas, o roteiro ganha um cartão por dia, com cidade e clima."
          action={
            snap.trip_polls.length > 0 ? (
              <Link to="/enquetes" className="btn btn-soft">
                Ver a enquete de datas
              </Link>
            ) : undefined
          }
        />
        <form
          className="card grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (start && end && end >= start) onSave(start, end)
          }}
        >
          <label className="text-[13px] font-semibold text-ink/55">
            Ida
            <input type="date" className="input mt-1" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label className="text-[13px] font-semibold text-ink/55">
            Volta
            <input type="date" className="input mt-1" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary col-span-2">
            Salvar datas
          </button>
        </form>
      </Page>
    </>
  )
}
