import { useEffect, useMemo, useState } from 'react'
import { useStore } from './store'
import type { Comment, Item, Stop, Task, Trip, Vote } from './types'
import { diffDays, range, todayISO, type ISODate } from '../lib/dates'
import { cachedRates, fetchRates, type RateInfo } from '../lib/rates'

export interface ItemVotes {
  up: Vote[]
  down: Vote[]
  score: number
  mine: Vote | undefined
}

export function useVotes(): (itemId: string) => ItemVotes {
  const { snap, me } = useStore()
  return useMemo(() => {
    const map = new Map<string, ItemVotes>()
    for (const v of snap.trip_votes) {
      let e = map.get(v.item_id)
      if (!e) map.set(v.item_id, (e = { up: [], down: [], score: 0, mine: undefined }))
      if (v.value > 0) e.up.push(v)
      else e.down.push(v)
      e.score += v.value
      if (v.member_id === me.id) e.mine = v
    }
    const empty: ItemVotes = { up: [], down: [], score: 0, mine: undefined }
    return (id: string) => map.get(id) ?? empty
  }, [snap.trip_votes, me.id])
}

export function useComments(): (itemId: string) => Comment[] {
  const { snap } = useStore()
  return useMemo(() => {
    const map = new Map<string, Comment[]>()
    for (const c of snap.trip_comments) map.set(c.item_id, [...(map.get(c.item_id) ?? []), c])
    return (id: string) => map.get(id) ?? []
  }, [snap.trip_comments])
}

/** Votar: tocar no mesmo voto tira; tocar no outro troca. */
export function useVote() {
  const { add, patch, remove, me } = useStore()
  return async (item: Item, value: 1 | -1, current: Vote | undefined) => {
    if (current && current.value === value) await remove('trip_votes', current.id)
    else if (current) await patch('trip_votes', current.id, { value })
    else await add('trip_votes', { item_id: item.id, member_id: me.id, value })
  }
}

export function tripDays(trip: Trip): ISODate[] {
  if (!trip.start_date || !trip.end_date) return []
  return range(trip.start_date, trip.end_date)
}

/** A cidade de um dia (a última parada que cobre a data). */
export function stopOn(stops: Stop[], day: ISODate): Stop | undefined {
  let found: Stop | undefined
  for (const s of stops) if (s.start_date && day >= s.start_date && day <= (s.end_date ?? s.start_date)) found = s
  return found
}

export type Phase = { kind: 'undated' } | { kind: 'before'; days: number } | { kind: 'during'; day: number; total: number } | { kind: 'after'; days: number }

export function tripPhase(trip: Trip, today = todayISO()): Phase {
  if (!trip.start_date) return { kind: 'undated' }
  const end = trip.end_date ?? trip.start_date
  if (today < trip.start_date) return { kind: 'before', days: diffDays(trip.start_date, today) }
  if (today > end) return { kind: 'after', days: diffDays(today, end) }
  return { kind: 'during', day: diffDays(today, trip.start_date) + 1, total: diffDays(end, trip.start_date) + 1 }
}

/** Itens que aparecem num dia (inclui hospedagem de vários dias). */
export function itemsOn(items: Item[], day: ISODate): Item[] {
  return items
    .filter((i) => i.status !== 'descartado' && i.day && (i.day === day || (i.end_day && day > i.day && day <= i.end_day)))
    .sort((a, b) => (a.start_time ?? '99').localeCompare(b.start_time ?? '99') || a.title.localeCompare(b.title))
}

export function useRates(): RateInfo & { refresh(): void } {
  const [info, setInfo] = useState<RateInfo>(cachedRates)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    fetchRates(tick > 0).then((r) => alive && setInfo(r))
    return () => {
      alive = false
    }
  }, [tick])
  return { ...info, refresh: () => setTick((t) => t + 1) }
}

/** Feita por mim? (tarefa "cada": eu marquei a minha; "grupo": alguém marcou como feita) */
export const taskDoneFor = (t: Task, memberId: string) => (t.scope === 'cada' ? t.done_by.includes(memberId) : t.done)

/** Quanto falta de cada tarefa: "cada" conta uma marcação por pessoa. */
export function taskProgress(tasks: Task[], people: number): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const t of tasks) {
    if (t.scope === 'cada') {
      total += people
      done += Math.min(t.done_by.length, people)
    } else {
      total += 1
      done += t.done ? 1 : 0
    }
  }
  return { done, total }
}

export function useToggleTask() {
  const { patch, me } = useStore()
  return (t: Task) => {
    if (t.scope === 'cada') {
      const has = t.done_by.includes(me.id)
      return patch('trip_tasks', t.id, { done_by: has ? t.done_by.filter((x) => x !== me.id) : [...t.done_by, me.id] })
    }
    return patch('trip_tasks', t.id, { done: !t.done, done_by: !t.done ? [me.id] : [] })
  }
}

/** Minhas pendências: as "cada" que eu não marquei e as do grupo comigo (ou sem dono). */
export function myPending(tasks: Task[], memberId: string): Task[] {
  return tasks.filter((t) => !taskDoneFor(t, memberId) && (t.scope === 'cada' || t.assignee === memberId || t.assignee === null))
}
