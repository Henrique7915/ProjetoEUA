import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPinOff } from 'lucide-react'
import { Chips, TopBar } from '../components/ui'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import { tripDays } from '../data/derived'
import type { ItemCategory } from '../data/types'
import { CATEGORIES, CATEGORY } from '../content/catalog'
import { compactDate } from '../lib/dates'

export default function MapScreen() {
  const openMenu = useOpenMenu()
  const navigate = useNavigate()
  const { snap, trip } = useStore()
  const [params] = useSearchParams()
  const focus = params.get('item')
  const [category, setCategory] = useState<'todas' | ItemCategory>('todas')
  const [day, setDay] = useState(params.get('dia') ?? '')
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  const located = useMemo(() => snap.trip_items.filter((i) => i.lat != null && i.lng != null && i.status !== 'descartado'), [snap.trip_items])
  const visible = useMemo(
    () => located.filter((i) => (category === 'todas' || i.category === category) && (!day || i.day === day || (i.end_day && i.day && day >= i.day && day <= i.end_day))),
    [located, category, day]
  )

  useEffect(() => {
    if (!box.current || map.current) return
    const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([33, -78], 4)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    const g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const bounds: L.LatLngExpression[] = []

    for (const s of snap.trip_stops) {
      if (s.lat == null || s.lng == null) continue
      L.circleMarker([s.lat, s.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#10283A', fillOpacity: 0.85 })
        .bindTooltip(s.city, { permanent: true, direction: 'right', className: 'font-bold' })
        .addTo(g)
      if (!visible.length) bounds.push([s.lat, s.lng])
    }

    let focused: L.CircleMarker | null = null
    for (const it of visible) {
      const c = CATEGORY[it.category]
      const el = document.createElement('div')
      const title = document.createElement('button')
      title.className = 'block text-left text-[15px] font-extrabold leading-snug'
      title.textContent = it.title
      title.onclick = () => navigate(`/ideias/${it.id}`)
      const meta = document.createElement('p')
      meta.className = 'mt-1 text-[12px] font-semibold opacity-60'
      meta.textContent = [c.label, it.day ? compactDate(it.day) : '', it.address].filter(Boolean).join(' · ')
      el.append(title, meta)
      const mk = L.circleMarker([it.lat!, it.lng!], { radius: 8, color: '#fff', weight: 2.5, fillColor: c.hex, fillOpacity: 1 }).bindPopup(el).addTo(g)
      if (it.id === focus) focused = mk
      bounds.push([it.lat!, it.lng!])
    }

    if (focused) {
      m.setView(focused.getLatLng(), 15)
      focused.openPopup()
    } else if (bounds.length === 1) m.setView(bounds[0], 13)
    else if (bounds.length) m.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 })
  }, [visible, snap.trip_stops, focus, navigate])

  const days = tripDays(trip)
  const counts = new Map<string, number>()
  for (const i of located) counts.set(i.category, (counts.get(i.category) ?? 0) + 1)

  return (
    <>
      <TopBar title="Mapa" back onMenu={openMenu} />
      <div className="mx-auto max-w-xl px-4">
        <Chips
          label="Categoria"
          value={category}
          onChange={setCategory}
          options={[
            { id: 'todas', label: 'Tudo', count: located.length },
            ...CATEGORIES.filter((c) => counts.get(c.id)).map((c) => ({
              id: c.id,
              label: (
                <>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.hex }} /> {c.plural}
                </>
              ),
              count: counts.get(c.id)
            }))
          ]}
        />
        {days.length > 0 && (
          <select value={day} onChange={(e) => setDay(e.target.value)} className="input mt-2 !py-2 text-sm" aria-label="Dia">
            <option value="">Todos os dias</option>
            {days.map((d, i) => (
              <option key={d} value={d}>
                Dia {i + 1} · {compactDate(d)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="relative mx-auto mt-3 max-w-xl px-4" style={{ height: 'calc(100dvh - 15rem - env(safe-area-inset-bottom))' }}>
        <div ref={box} className="h-full w-full overflow-hidden rounded-3xl ring-1 ring-line" />
        {located.length === 0 && (
          <div className="pointer-events-none absolute inset-x-8 top-6 z-[500] flex items-center gap-2 rounded-2xl bg-surface/95 p-3 text-[13px] font-semibold shadow-card">
            <MapPinOff size={18} className="shrink-0 text-brand-500" />
            Coloque o endereço nas ideias (botão 📍 no formulário) para elas aparecerem aqui.
          </div>
        )}
      </div>
    </>
  )
}
