import { kindOf, type DayKey, type Habit, type WeekStart } from './types.ts'
import { addDays, lastWeeks, weekOf } from './week.ts'
import { streaks as dayStreaks } from './streaks.ts'

export interface Week { first: DayKey; amount: number; used?: number; of?: number; met: boolean | null }
export interface Streak { cur: number; best: number; unit: 'day' | 'week' }

const sum = (m: Record<DayKey, number> | undefined, from: DayKey, to: DayKey) => {
  let n = 0
  for (const [k, v] of Object.entries(m || {})) if (k >= from && k <= to) n += v
  return n
}
const doneIn = (h: Habit, from: DayKey, to: DayKey) => Object.entries(h.marks).filter(([k, v]) => v === 't' && k >= from && k <= to).length

export function total(h: Habit, today: DayKey): number {
  const k = kindOf(h)
  if (k === 'reduce') return sum(h.urges, '', today)
  if (k === 'number') return sum(h.values, '', today)
  return doneIn(h, '', today)
}

function weekStats(h: Habit, first: DayKey, today: DayKey): Week {
  const last = addDays(first, 6), to = last < today ? last : today, k = kindOf(h)
  if (k === 'reduce') {
    const amount = sum(h.urges, first, to)
    if (!h.budget) return { first, amount, met: null }
    const used = sum(h.slips, first, to)
    return { first, amount, used, of: h.budget, met: used <= h.budget }
  }
  if (k === 'number') {
    const amount = sum(h.values, first, to)
    return h.target ? { first, amount, of: h.target, met: amount >= h.target } : { first, amount, met: null }
  }
  const amount = doneIn(h, first, to)
  if (k === 'weekly') return { first, amount, of: h.goal || 1, met: amount >= (h.goal || 1) }
  return { first, amount, of: 7, met: null }
}

export const thisWeek = (h: Habit, today: DayKey, ws: WeekStart): Week => weekStats(h, weekOf(today, ws), today)

export const trend = (h: Habit, today: DayKey, ws: WeekStart, n = 8): Week[] => lastWeeks(today, ws, n).map(f => weekStats(h, f, today))

function firstDay(h: Habit): DayKey | null {
  const keys = [h.marks, h.urges, h.slips].flatMap(m => Object.keys(m || {}))
  return keys.length ? keys.reduce((a, b) => (a < b ? a : b)) : null
}

export function streak(h: Habit, today: DayKey, ws: WeekStart): Streak | null {
  const k = kindOf(h)
  if (k === 'daily') { const s = dayStreaks(h.marks, today); return { cur: s.cur, best: s.best, unit: 'day' } }
  if (k === 'number' || (k === 'reduce' && !h.budget)) return null
  const start = firstDay(h), cur = weekOf(today, ws)
  let run = 0, best = 0
  for (let f = start ? weekOf(start, ws) : cur; f <= cur; f = addDays(f, 7)) {
    const w = weekStats(h, f, today)
    const empty = k === 'reduce' && w.amount === 0 && !w.used
    if (empty) continue
    if (w.met) run++
    else if (f !== cur) run = 0
    if (run > best) best = run
  }
  return { cur: run, best, unit: 'week' }
}
