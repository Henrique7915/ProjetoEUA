// Qual viagem e qual pessoa estão abertas neste aparelho. Não é segredo de ninguém além do grupo.
export interface Session {
  code: string
  memberId: string | null
}

export interface SavedTrip {
  code: string
  name: string
  emoji: string
  memberId: string | null
}

const SESSION = 'vg:session'
const TRIPS = 'vg:trips'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* sem storage */
  }
}

export const loadSession = () => read<Session | null>(SESSION, null)
export const savedTrips = () => read<SavedTrip[]>(TRIPS, [])

export function saveSession(s: Session | null) {
  write(SESSION, s)
  if (s) rememberTrip({ code: s.code, memberId: s.memberId })
}

export function rememberTrip(t: Partial<SavedTrip> & { code: string }) {
  const list = savedTrips()
  const i = list.findIndex((x) => x.code === t.code)
  const merged: SavedTrip = { name: '', emoji: '✈️', memberId: null, ...(i >= 0 ? list[i] : {}), ...t }
  if (i >= 0) list[i] = merged
  else list.unshift(merged)
  write(TRIPS, list.slice(0, 10))
}

export function forgetTrip(code: string) {
  write(
    TRIPS,
    savedTrips().filter((t) => t.code !== code)
  )
  if (loadSession()?.code === code) write(SESSION, null)
}
