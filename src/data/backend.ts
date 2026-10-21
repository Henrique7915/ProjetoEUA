import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { TABLES, type NewRow, type Rows, type Snapshot, type Table, type Tables, type Trip } from './types'
import { supabaseConfig } from '../lib/supabase'
import { todayISO } from '../lib/dates'

/** Tudo que o app precisa do banco, para uma viagem (já liberada pelo código). */
export interface Backend {
  load(): Promise<Snapshot>
  loadTable<T extends Table>(table: T): Promise<Rows[T][]>
  insert<T extends Table>(table: T, row: NewRow<T>): Promise<Rows[T]>
  insertMany<T extends Table>(table: T, rows: NewRow<T>[]): Promise<Rows[T][]>
  update<T extends Table>(table: T, id: string, patch: NewRow<T>): Promise<Rows[T]>
  remove(table: Table, id: string): Promise<void>
  updateTrip(patch: Partial<Omit<Trip, 'id' | 'code' | 'created_at'>>): Promise<Trip>
  deleteTrip(): Promise<void>
  /** Avisa quando outra pessoa mudou algo. Devolve a função para parar de ouvir. */
  subscribe(onChange: (table: Table | 'trips') => void): () => void
  /** Conta para os outros aparelhos que esta tabela mudou. */
  notify(table: Table | 'trips'): void
}

export interface Created {
  code: string
  trip_id: string
  member_id: string
}

/** Operações antes de entrar numa viagem: criar uma nova ou conferir um código. */
export interface Gateway {
  local: boolean
  createTrip(input: { name: string; member: string; start: string | null; end: string | null; emoji: string }): Promise<Created>
  findTrip(code: string): Promise<Trip | null>
  open(code: string): Backend
}

export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** UUID v4. crypto.randomUUID só existe em HTTPS/localhost; getRandomValues funciona em qualquer página. */
export function uid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ---------------------------------------------------------------------------
// Modo local: tudo no localStorage deste navegador (para testar sem Supabase).
// Abas diferentes do mesmo navegador se enxergam, o que ajuda a simular a galera.
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'vg:local'

interface LocalDB extends Tables {
  trips: Trip[]
}

const DEFAULTS: { [T in Table]: Omit<Rows[T], 'id' | 'trip_id' | 'created_at'> } = {
  trip_members: { name: '', color: '#1A7FB0', emoji: '' },
  trip_stops: { city: '', country: 'US', start_date: null, end_date: null, lat: null, lng: null, notes: '', sort: 0 },
  trip_items: {
    category: 'passeio',
    title: '',
    url: '',
    image_url: '',
    site: '',
    description: '',
    note: '',
    stop_id: null,
    status: 'ideia',
    day: null,
    end_day: null,
    start_time: null,
    price: null,
    currency: 'USD',
    price_per: 'total',
    address: '',
    lat: null,
    lng: null,
    confirmation: '',
    created_by: null,
    updated_at: ''
  },
  trip_votes: { item_id: '', member_id: '', value: 1 },
  trip_comments: { item_id: '', member_id: null, body: '' },
  trip_tasks: { title: '', section: 'outros', scope: 'grupo', assignee: null, done: false, done_by: [], due: null, note: '', sort: 0 },
  trip_expenses: {
    kind: 'gasto',
    title: '',
    amount: 0,
    currency: 'USD',
    rate: 1,
    paid_by: '',
    split_among: [],
    shares: null,
    category: 'outros',
    spent_on: '',
    item_id: null,
    note: '',
    created_by: null
  },
  trip_polls: { question: '', options: [], multi: false, closed: false, created_by: null },
  trip_poll_votes: { poll_id: '', member_id: '', option_id: '' }
}

function emptyLocal(): LocalDB {
  return { trips: [], ...(Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Tables) }
}

function readLocal(): LocalDB {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return { ...emptyLocal(), ...(JSON.parse(raw) as LocalDB) }
  } catch {
    /* sem storage: começa vazio */
  }
  return emptyLocal()
}

function writeLocal(fn: (db: LocalDB) => void): LocalDB {
  const db = readLocal()
  fn(db)
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db))
  } catch {
    /* navegador sem storage: os dados ficam só na memória */
  }
  return db
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => ALPHABET[b % 32]).join('')
}

/** Apagar em cascata, como o banco faz com as chaves estrangeiras. */
function cascade(db: LocalDB, table: Table, id: string) {
  const drop = <T extends Table>(t: T, pred: (r: Rows[T]) => boolean) => {
    const gone = (db[t] as Rows[T][]).filter(pred)
    ;(db[t] as Rows[T][]) = (db[t] as Rows[T][]).filter((r) => !pred(r))
    return gone
  }
  if (table === 'trip_items') {
    drop('trip_votes', (v) => v.item_id === id)
    drop('trip_comments', (c) => c.item_id === id)
    db.trip_expenses = db.trip_expenses.map((e) => (e.item_id === id ? { ...e, item_id: null } : e))
  }
  if (table === 'trip_polls') drop('trip_poll_votes', (v) => v.poll_id === id)
  if (table === 'trip_stops') db.trip_items = db.trip_items.map((i) => (i.stop_id === id ? { ...i, stop_id: null } : i))
  if (table === 'trip_members') {
    if (db.trip_expenses.some((e) => e.paid_by === id)) throw new Error('Essa pessoa pagou gastos da viagem.')
    drop('trip_votes', (v) => v.member_id === id)
    drop('trip_poll_votes', (v) => v.member_id === id)
    db.trip_tasks = db.trip_tasks.map((t) => (t.assignee === id ? { ...t, assignee: null } : t))
  }
}

function localBackend(code: string): Backend {
  const trip = () => {
    const t = readLocal().trips.find((x) => x.code === code)
    if (!t) throw new Error('Viagem não encontrada')
    return t
  }
  const tripId = trip().id
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`vg:${tripId}`) : null
  const mine = <T extends Table>(db: LocalDB, t: T) => (db[t] as Rows[T][]).filter((r) => r.trip_id === tripId)
  const build = <T extends Table>(t: T, row: NewRow<T>): Rows[T] => {
    const now = new Date().toISOString()
    const base = { ...DEFAULTS[t], ...row, id: uid(), trip_id: tripId, created_at: now } as unknown as Rows[T]
    if (t === 'trip_items') (base as Rows['trip_items']).updated_at = now
    if (t === 'trip_expenses' && !(base as Rows['trip_expenses']).spent_on) (base as Rows['trip_expenses']).spent_on = todayISO()
    return base
  }
  const checkUnique = <T extends Table>(db: LocalDB, t: T, row: Rows[T]) => {
    if (t === 'trip_members') {
      const name = (row as Rows['trip_members']).name.trim().toLowerCase()
      if (mine(db, 'trip_members').some((m) => m.id !== row.id && m.name.trim().toLowerCase() === name)) throw new Error('duplicate key')
    }
  }
  return {
    async load() {
      const db = readLocal()
      return { trip: trip(), ...(Object.fromEntries(TABLES.map((t) => [t, mine(db, t)])) as unknown as Tables) }
    },
    async loadTable(t) {
      return mine(readLocal(), t)
    },
    async insert(t, row) {
      const full = build(t, row)
      writeLocal((db) => {
        checkUnique(db, t, full)
        ;(db[t] as Rows[typeof t][]).push(full)
      })
      return full
    },
    async insertMany(t, rows) {
      const full = rows.map((r) => build(t, r))
      writeLocal((db) => void (db[t] as Rows[typeof t][]).push(...full))
      return full
    },
    async update(t, id, patch) {
      let out: Rows[typeof t] | undefined
      writeLocal((db) => {
        const list = db[t] as Rows[typeof t][]
        const i = list.findIndex((r) => r.id === id && r.trip_id === tripId)
        if (i < 0) throw new Error('Não encontrado')
        out = { ...list[i], ...patch } as Rows[typeof t]
        if (t === 'trip_items') (out as Rows['trip_items']).updated_at = new Date().toISOString()
        checkUnique(db, t, out)
        list[i] = out
      })
      return out!
    },
    async remove(t, id) {
      writeLocal((db) => {
        cascade(db, t, id)
        ;(db[t] as Rows[typeof t][]) = (db[t] as Rows[typeof t][]).filter((r) => r.id !== id)
      })
    },
    async updateTrip(patch) {
      let out: Trip | undefined
      writeLocal((db) => {
        db.trips = db.trips.map((t) => (t.id === tripId ? (out = { ...t, ...patch }) : t))
      })
      return out!
    },
    async deleteTrip() {
      writeLocal((db) => {
        db.trips = db.trips.filter((t) => t.id !== tripId)
        for (const t of TABLES) (db[t] as { trip_id: string }[]) = (db[t] as { trip_id: string }[]).filter((r) => r.trip_id !== tripId)
      })
    },
    subscribe(onChange) {
      if (!channel) return () => {}
      const fn = (e: MessageEvent) => onChange(e.data as Table)
      channel.addEventListener('message', fn)
      return () => channel.removeEventListener('message', fn)
    },
    notify(table) {
      channel?.postMessage(table)
    }
  }
}

export function localGateway(): Gateway {
  return {
    local: true,
    async createTrip({ name, member, start, end, emoji }) {
      const trip: Trip = {
        id: uid(),
        code: randomCode(),
        name: name.trim(),
        emoji: emoji || '✈️',
        start_date: start,
        end_date: end,
        base_currency: 'BRL',
        notes: '',
        created_at: new Date().toISOString()
      }
      const m = { ...DEFAULTS.trip_members, id: uid(), trip_id: trip.id, name: member.trim(), created_at: trip.created_at }
      writeLocal((db) => {
        db.trips.push(trip)
        db.trip_members.push(m)
      })
      return { code: trip.code, trip_id: trip.id, member_id: m.id }
    },
    async findTrip(code) {
      return readLocal().trips.find((t) => t.code === normalizeCode(code)) ?? null
    },
    open: (code) => localBackend(normalizeCode(code))
  }
}

// ---------------------------------------------------------------------------
// Supabase: o código vai no cabeçalho x-trip-code de toda requisição.
// As mudanças dos outros chegam por um canal de broadcast do Realtime
// (só o aviso "tal tabela mudou"; os dados vêm de novo pela API, com RLS).
// ---------------------------------------------------------------------------

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

function client(code?: string): SupabaseClient {
  const { url, key } = supabaseConfig()!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `vg-auth-${code ?? 'anon'}` },
    global: { headers: code ? { 'x-trip-code': code } : {} }
  })
}

const ORDER: Partial<Record<Table, string>> = { trip_stops: 'sort', trip_tasks: 'sort' }

function supabaseBackend(code: string): Backend {
  const db = client(code)
  let tripId: string | null = null
  let channel: RealtimeChannel | null = null
  const listeners = new Set<(t: Table | 'trips') => void>()

  const loadTable = async <T extends Table>(t: T): Promise<Rows[T][]> => {
    const rows: Rows[T][] = []
    const page = 1000
    for (let from = 0; ; from += page) {
      const chunk = check(
        await db
          .from(t)
          .select('*')
          .order(ORDER[t] ?? 'created_at')
          .order('created_at')
          .range(from, from + page - 1)
      ) as Rows[T][]
      rows.push(...chunk)
      if (chunk.length < page) return rows
    }
  }

  const ensureChannel = () => {
    if (channel || !tripId) return
    channel = db.channel(`viagem-${tripId}`, { config: { broadcast: { self: false } } })
    channel.on('broadcast', { event: 'change' }, ({ payload }) => listeners.forEach((fn) => fn((payload as { table: Table }).table))).subscribe()
  }

  return {
    async load() {
      const trip = check(await db.from('trips').select('*').maybeSingle()) as Trip | null
      if (!trip) throw new Error('Viagem não encontrada')
      tripId = trip.id
      ensureChannel()
      const lists = await Promise.all(TABLES.map((t) => loadTable(t)))
      return { trip, ...(Object.fromEntries(TABLES.map((t, i) => [t, lists[i]])) as unknown as Tables) }
    },
    loadTable,
    async insert(t, row) {
      return check(await db.from(t).insert(row as never).select('*').single()) as Rows[typeof t]
    },
    async insertMany(t, rows) {
      if (!rows.length) return []
      return check(await db.from(t).insert(rows as never).select('*')) as Rows[typeof t][]
    },
    async update(t, id, patch) {
      return check(await db.from(t).update(patch as never).eq('id', id).select('*').single()) as Rows[typeof t]
    },
    async remove(t, id) {
      check(await db.from(t).delete().eq('id', id))
    },
    async updateTrip(patch) {
      return check(await db.from('trips').update(patch).eq('id', tripId!).select('*').single()) as Trip
    },
    async deleteTrip() {
      check(await db.from('trips').delete().eq('id', tripId!))
    },
    subscribe(onChange) {
      listeners.add(onChange)
      ensureChannel()
      return () => {
        listeners.delete(onChange)
        if (!listeners.size && channel) {
          void db.removeChannel(channel)
          channel = null
        }
      }
    },
    notify(table) {
      void channel?.send({ type: 'broadcast', event: 'change', payload: { table } })
    }
  }
}

export function supabaseGateway(): Gateway {
  return {
    local: false,
    async createTrip({ name, member, start, end, emoji }) {
      return check(await client().rpc('trip_create', { p_name: name, p_member: member, p_start: start, p_end: end, p_emoji: emoji })) as Created
    },
    async findTrip(code) {
      const c = normalizeCode(code)
      if (c.length < 10) return null
      return check(await client(c).from('trips').select('*').maybeSingle()) as Trip | null
    },
    open: (code) => supabaseBackend(normalizeCode(code))
  }
}

export const gateway = (): Gateway => (supabaseConfig() ? supabaseGateway() : localGateway())
