// Os tipos espelham as colunas do banco (snake_case), assim o mesmo objeto vai e volta do Supabase.
import type { ISODate } from '../lib/dates'

export type Currency = 'BRL' | 'USD' | 'CAD' | 'EUR'

export interface Trip {
  id: string
  code: string
  name: string
  emoji: string
  start_date: ISODate | null
  end_date: ISODate | null
  base_currency: Currency
  notes: string
  created_at: string
}

export interface Member {
  id: string
  trip_id: string
  name: string
  color: string
  emoji: string
  created_at: string
}

export interface Stop {
  id: string
  trip_id: string
  city: string
  country: string
  start_date: ISODate | null
  end_date: ISODate | null
  lat: number | null
  lng: number | null
  notes: string
  sort: number
  created_at: string
}

export type ItemCategory = 'hospedagem' | 'voo' | 'transporte' | 'passeio' | 'parque' | 'comida' | 'compras' | 'documento' | 'dica' | 'outro'
export type ItemStatus = 'ideia' | 'aprovado' | 'reservado' | 'descartado'

export interface Item {
  id: string
  trip_id: string
  category: ItemCategory
  title: string
  url: string
  image_url: string
  site: string
  description: string
  note: string
  stop_id: string | null
  status: ItemStatus
  day: ISODate | null
  end_day: ISODate | null
  start_time: string | null
  price: number | null
  currency: Currency
  price_per: 'total' | 'pessoa'
  address: string
  lat: number | null
  lng: number | null
  confirmation: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  trip_id: string
  item_id: string
  member_id: string
  value: 1 | -1
  created_at: string
}

export interface Comment {
  id: string
  trip_id: string
  item_id: string
  member_id: string | null
  body: string
  created_at: string
}

export interface Task {
  id: string
  trip_id: string
  title: string
  section: string
  scope: 'grupo' | 'cada'
  assignee: string | null
  done: boolean
  done_by: string[]
  due: ISODate | null
  note: string
  sort: number
  created_at: string
}

export interface Expense {
  id: string
  trip_id: string
  kind: 'gasto' | 'acerto'
  title: string
  amount: number
  currency: Currency
  rate: number
  paid_by: string
  split_among: string[]
  shares: Record<string, number> | null
  category: string
  spent_on: ISODate
  item_id: string | null
  note: string
  created_by: string | null
  created_at: string
}

export interface PollOption {
  id: string
  text: string
}

export interface Poll {
  id: string
  trip_id: string
  question: string
  options: PollOption[]
  multi: boolean
  closed: boolean
  created_by: string | null
  created_at: string
}

export interface PollVote {
  id: string
  trip_id: string
  poll_id: string
  member_id: string
  option_id: string
  created_at: string
}

export interface Rows {
  trip_members: Member
  trip_stops: Stop
  trip_items: Item
  trip_votes: Vote
  trip_comments: Comment
  trip_tasks: Task
  trip_expenses: Expense
  trip_polls: Poll
  trip_poll_votes: PollVote
}

export type Table = keyof Rows
export const TABLES: Table[] = ['trip_members', 'trip_stops', 'trip_items', 'trip_votes', 'trip_comments', 'trip_tasks', 'trip_expenses', 'trip_polls', 'trip_poll_votes']

export type Tables = { [T in Table]: Rows[T][] }

export interface Snapshot extends Tables {
  trip: Trip
}

/** O que o app manda ao criar uma linha: sem id/trip_id/created_at (o banco preenche). */
export type NewRow<T extends Table> = Partial<Omit<Rows[T], 'id' | 'trip_id' | 'created_at'>>
