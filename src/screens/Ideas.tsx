import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Map as MapIcon, Search, Sparkles, X } from 'lucide-react'
import { Chips, Empty, Page, TopBar } from '../components/ui'
import { AddLinkBar, ItemCard, ItemForm } from '../components/items'
import { useOpenMenu } from '../components/Menu'
import { useStore } from '../data/store'
import { useComments, useRates, useVotes } from '../data/derived'
import type { ItemCategory, ItemStatus, NewRow } from '../data/types'
import { CATEGORIES } from '../content/catalog'
import { convert } from '../lib/money'

type StatusFilter = 'ativas' | ItemStatus
type Sort = 'votos' | 'recentes' | 'preco' | 'data'

export default function Ideas() {
  const openMenu = useOpenMenu()
  const navigate = useNavigate()
  const { snap } = useStore()
  const votes = useVotes()
  const comments = useComments()
  const rates = useRates()
  const [params] = useSearchParams()
  // Compartilhar → Viagem (Android) chega aqui com ?url=&text=&title=
  const shared = params.get('url') || params.get('text') || params.get('title') || ''
  const [draft, setDraft] = useState<NewRow<'trip_items'> | null>(null)
  const [status, setStatus] = useState<StatusFilter>('ativas')
  const [category, setCategory] = useState<'todas' | ItemCategory>('todas')
  const [stop, setStop] = useState('todas')
  const [sort, setSort] = useState<Sort>('votos')
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const out = snap.trip_items.filter(
      (i) =>
        (status === 'ativas' ? i.status !== 'descartado' : i.status === status) &&
        (category === 'todas' || i.category === category) &&
        (stop === 'todas' || (stop === 'sem' ? !i.stop_id : i.stop_id === stop)) &&
        (!term || `${i.title} ${i.note} ${i.site} ${i.address} ${i.description}`.toLowerCase().includes(term))
    )
    const price = (x: (typeof out)[number]) => (x.price == null ? Infinity : convert(x.price, x.currency, 'BRL', rates.rates))
    return out.sort((a, b) => {
      if (sort === 'recentes') return b.created_at.localeCompare(a.created_at)
      if (sort === 'preco') return price(a) - price(b)
      if (sort === 'data') return (a.day ?? '9999').localeCompare(b.day ?? '9999') || (a.start_time ?? '').localeCompare(b.start_time ?? '')
      return votes(b.id).score - votes(a.id).score || b.created_at.localeCompare(a.created_at)
    })
  }, [snap.trip_items, status, category, stop, q, sort, votes, rates.rates])

  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const i of snap.trip_items) if (i.status !== 'descartado') c.set(i.category, (c.get(i.category) ?? 0) + 1)
    return c
  }, [snap.trip_items])

  return (
    <>
      <TopBar
        title="Ideias e links"
        onMenu={openMenu}
        right={
          <>
            <button className="icon-btn" onClick={() => setSearching((s) => !s)} aria-label="Buscar">
              {searching ? <X size={22} /> : <Search size={22} />}
            </button>
            <Link to="/mapa" className="icon-btn" aria-label="Ver no mapa">
              <MapIcon size={22} />
            </Link>
          </>
        }
      />
      <Page>
        <AddLinkBar
          initial={shared}
          onReady={(d) => {
            setDraft(d)
            if (shared) navigate('/ideias', { replace: true })
          }}
        />
        {searching && <input autoFocus className="input mt-3" placeholder="Buscar nas ideias" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar nas ideias" />}

        <div className="mt-4 space-y-2">
          <Chips
            label="Situação"
            value={status}
            onChange={setStatus}
            options={[
              { id: 'ativas', label: 'Todas' },
              { id: 'ideia', label: 'Ideias' },
              { id: 'aprovado', label: 'Aprovadas' },
              { id: 'reservado', label: 'Reservadas' },
              { id: 'descartado', label: 'Descartadas' }
            ]}
          />
          <Chips
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={[
              { id: 'todas', label: 'Tudo' },
              ...CATEGORIES.filter((c) => counts.get(c.id)).map((c) => ({ id: c.id, label: c.plural, count: counts.get(c.id) }))
            ]}
          />
          {snap.trip_stops.length > 0 && (
            <Chips
              label="Cidade"
              value={stop}
              onChange={setStop}
              options={[{ id: 'todas', label: '📍 Todas as cidades' }, ...snap.trip_stops.map((s) => ({ id: s.id, label: s.city })), { id: 'sem', label: 'Sem cidade' }]}
            />
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[13px] font-bold text-ink/50">{list.length === 1 ? '1 item' : `${list.length} itens`}</p>
          <label className="flex items-center gap-1.5 text-[13px] font-bold text-ink/60">
            Ordenar
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full bg-surface px-2.5 py-1.5 ring-1 ring-line">
              <option value="votos">Mais votados</option>
              <option value="recentes">Mais recentes</option>
              <option value="preco">Mais baratos</option>
              <option value="data">Por data</option>
            </select>
          </label>
        </div>

        <div className="mt-3 space-y-3">
          {list.map((i) => (
            <ItemCard key={i.id} item={i} votes={votes(i.id)} comments={comments(i.id).length} />
          ))}
        </div>
        {list.length === 0 && (
          <Empty
            icon={<Sparkles size={30} />}
            title={snap.trip_items.length ? 'Nada com esses filtros' : 'Comece colando um link'}
            text={snap.trip_items.length ? 'Tente outra categoria ou cidade.' : 'Hotel do Airbnb, parque, restaurante, vídeo do TikTok com dica... tudo vira um card para a galera votar.'}
          />
        )}
      </Page>
      <ItemForm open={!!draft} draft={draft ?? undefined} onClose={() => setDraft(null)} />
    </>
  )
}
