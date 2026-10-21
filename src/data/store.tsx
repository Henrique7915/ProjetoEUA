import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Backend } from './backend'
import type { Member, NewRow, Rows, Snapshot, Table, Trip } from './types'

interface RawValue {
  snap: Snapshot
  trip: Trip
  members: Member[]
  me: Member | null
  local: boolean
  /** true quando os dados vieram do cache deste aparelho (sem conexão) */
  stale: boolean
  member(id: string | null | undefined): Member | undefined
  add<T extends Table>(table: T, row: NewRow<T>): Promise<Rows[T] | null>
  addMany<T extends Table>(table: T, rows: NewRow<T>[]): Promise<Rows[T][]>
  patch<T extends Table>(table: T, id: string, patch: NewRow<T>): Promise<boolean>
  remove(table: Table, id: string): Promise<boolean>
  updateTrip(patch: Partial<Omit<Trip, 'id' | 'code' | 'created_at'>>): Promise<boolean>
  deleteTrip(): Promise<void>
  refresh(): Promise<void>
  switchMember(): void
  pickMember(id: string): void
  leave(): void
  toast: string | null
  showToast(msg: string): void
}

type StoreValue = RawValue & { me: Member }

const Ctx = createContext<RawValue | null>(null)

/** Para a tela "Quem é você?", que roda antes de escolher a pessoa. */
export function useRawStore(): RawValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useRawStore fora do StoreProvider')
  return v
}

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v || !v.me) throw new Error('useStore sem pessoa escolhida')
  return v as StoreValue
}

const ERRORS: [RegExp, string][] = [
  [/duplicate key|unique/i, 'Isso já existe (nome repetido?).'],
  [/paid_by|foreign key|pagou gastos/i, 'Essa pessoa tem gastos lançados. Apague ou mude os gastos dela antes.'],
  [/Failed to fetch|NetworkError|network|fetch/i, 'Sem conexão agora. Tente de novo quando a internet voltar.']
]

const friendly = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e)
  return ERRORS.find(([re]) => re.test(m))?.[1] ?? 'Não consegui salvar. Tente de novo.'
}

const cacheKey = (code: string) => `vg:cache:${code}`

function readCache(code: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(cacheKey(code))
    return raw ? (JSON.parse(raw) as Snapshot) : null
  } catch {
    return null
  }
}

interface Props {
  backend: Backend
  code: string
  memberId: string | null
  local: boolean
  onPickMember(id: string | null): void
  onLeave(): void
  onTripLoaded(trip: Trip): void
  children: ReactNode
  fallback: ReactNode
  onError(message: string): ReactNode
}

export function StoreProvider({ backend, code, memberId, local, onPickMember, onLeave, onTripLoaded, children, fallback, onError }: Props) {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number>()
  const lastLoad = useRef(0)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const loadAll = useCallback(async () => {
    lastLoad.current = Date.now()
    try {
      const s = await backend.load()
      setSnap(s)
      setStale(false)
      setError(null)
      onTripLoaded(s.trip)
    } catch (e) {
      const cached = readCache(code)
      const m = e instanceof Error ? e.message : ''
      if (/não encontrada/i.test(m)) {
        setError('Essa viagem não existe mais ou o código mudou.')
        return
      }
      if (cached) {
        setSnap((prev) => prev ?? cached)
        setStale(true)
      } else setError('Não consegui abrir a viagem. Confira a internet e tente de novo.')
    }
  }, [backend, code, onTripLoaded])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // Guarda uma cópia para abrir sem internet.
  useEffect(() => {
    if (!snap || stale) return
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(cacheKey(code), JSON.stringify(snap))
      } catch {
        /* storage cheio ou bloqueado */
      }
    }, 600)
    return () => window.clearTimeout(id)
  }, [snap, stale, code])

  const reloadTable = useCallback(
    async (table: Table) => {
      try {
        const rows = await backend.loadTable(table)
        setSnap((s) => (s ? { ...s, [table]: rows } : s))
      } catch {
        /* tenta na próxima */
      }
    },
    [backend]
  )

  // Mudanças dos outros: recarrega só a tabela avisada (agrupando avisos em sequência).
  useEffect(() => {
    const pending = new Set<Table | 'trips'>()
    let timer: number | undefined
    const off = backend.subscribe((t) => {
      pending.add(t)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const list = [...pending]
        pending.clear()
        if (list.includes('trips')) void loadAll()
        else list.forEach((x) => void reloadTable(x as Table))
      }, 250)
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [backend, loadAll, reloadTable])

  // Reserva: ao voltar para o app e a cada minuto, confere se tem novidade.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > 20_000) void loadAll()
    }
    const id = window.setInterval(onFocus, 60_000)
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('online', onFocus)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('online', onFocus)
    }
  }, [loadAll])

  const add = useCallback(
    async <T extends Table>(table: T, row: NewRow<T>) => {
      try {
        const full = await backend.insert(table, row)
        setSnap((s) => (s ? { ...s, [table]: [...(s[table] as Rows[T][]), full] } : s))
        backend.notify(table)
        return full
      } catch (e) {
        showToast(friendly(e))
        return null
      }
    },
    [backend, showToast]
  )

  const addMany = useCallback(
    async <T extends Table>(table: T, rows: NewRow<T>[]) => {
      try {
        const full = await backend.insertMany(table, rows)
        setSnap((s) => (s ? { ...s, [table]: [...(s[table] as Rows[T][]), ...full] } : s))
        backend.notify(table)
        return full
      } catch (e) {
        showToast(friendly(e))
        return []
      }
    },
    [backend, showToast]
  )

  const patch = useCallback(
    async <T extends Table>(table: T, id: string, changes: NewRow<T>) => {
      let before: Rows[T] | undefined
      setSnap((s) => {
        if (!s) return s
        const list = s[table] as Rows[T][]
        before = list.find((r) => r.id === id)
        return { ...s, [table]: list.map((r) => (r.id === id ? { ...r, ...changes } : r)) }
      })
      try {
        const full = await backend.update(table, id, changes)
        setSnap((s) => (s ? { ...s, [table]: (s[table] as Rows[T][]).map((r) => (r.id === id ? full : r)) } : s))
        backend.notify(table)
        return true
      } catch (e) {
        if (before) setSnap((s) => (s ? { ...s, [table]: (s[table] as Rows[T][]).map((r) => (r.id === id ? before! : r)) } : s))
        showToast(friendly(e))
        return false
      }
    },
    [backend, showToast]
  )

  const remove = useCallback(
    async (table: Table, id: string) => {
      try {
        await backend.remove(table, id)
        setSnap((s) => {
          if (!s) return s
          const next = { ...s, [table]: (s[table] as { id: string }[]).filter((r) => r.id !== id) } as Snapshot
          if (table === 'trip_items') {
            next.trip_votes = next.trip_votes.filter((v) => v.item_id !== id)
            next.trip_comments = next.trip_comments.filter((c) => c.item_id !== id)
          }
          if (table === 'trip_polls') next.trip_poll_votes = next.trip_poll_votes.filter((v) => v.poll_id !== id)
          return next
        })
        backend.notify(table)
        return true
      } catch (e) {
        showToast(friendly(e))
        return false
      }
    },
    [backend, showToast]
  )

  const updateTrip = useCallback(
    async (changes: Partial<Omit<Trip, 'id' | 'code' | 'created_at'>>) => {
      try {
        const trip = await backend.updateTrip(changes)
        setSnap((s) => (s ? { ...s, trip } : s))
        onTripLoaded(trip)
        backend.notify('trips')
        return true
      } catch (e) {
        showToast(friendly(e))
        return false
      }
    },
    [backend, showToast, onTripLoaded]
  )

  const deleteTrip = useCallback(async () => {
    await backend.deleteTrip()
    backend.notify('trips')
    try {
      localStorage.removeItem(cacheKey(code))
    } catch {
      /* ok */
    }
    onLeave()
  }, [backend, code, onLeave])

  const members = useMemo(() => snap?.trip_members ?? [], [snap])
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const me = (memberId && byId.get(memberId)) || null

  const value = useMemo<RawValue | null>(
    () =>
      snap
        ? {
            snap,
            trip: snap.trip,
            members,
            me,
            local,
            stale,
            member: (id) => (id ? byId.get(id) : undefined),
            add,
            addMany,
            patch,
            remove,
            updateTrip,
            deleteTrip,
            refresh: loadAll,
            switchMember: () => onPickMember(null),
            pickMember: (id) => onPickMember(id),
            leave: onLeave,
            toast,
            showToast
          }
        : null,
    [snap, me, members, local, stale, byId, add, addMany, patch, remove, updateTrip, deleteTrip, loadAll, onPickMember, onLeave, toast, showToast]
  )

  if (error && !snap) return <>{onError(error)}</>
  if (!value) return <>{fallback}</>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

