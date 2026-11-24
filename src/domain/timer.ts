import { kindOf, type Doc, type Habit } from './types.ts'
import { keyOf } from './calendar.ts'
import { addUrge, setMark } from './actions.ts'
import { DEFAULT_TIMER } from './habitForm.ts'

export type TimerKind = 'start' | 'delay'
export interface Timer { habitId: string; kind: TimerKind; startedAt: number; endsAt: number }

export function timerKind(h: Habit): TimerKind | null {
  const k = kindOf(h)
  return k === 'reduce' ? 'delay' : k === 'number' ? null : 'start'
}

export const timerMinutes = (h: Habit) => h.timerMin || DEFAULT_TIMER[kindOf(h)]

const SEEN_MAX = 50
const idOf = (t: Timer) => t.habitId + '@' + t.startedAt

export function settleAll(doc: Doc, timers: Timer[], now: number, seen: string[]): { doc: Doc; seen: string[] } {
  let out = doc, next = seen
  for (const t of timers) {
    if (now < t.endsAt || next.includes(idOf(t))) continue
    out = settle(out, t, now)
    next = [...next, idOf(t)].slice(-SEEN_MAX)
  }
  return { doc: out, seen: next }
}

export function settle(doc: Doc, t: Timer, now: number): Doc {
  const h = doc.habits.find(x => x.id === t.habitId)
  if (now < t.endsAt || !h || h.later) return doc
  const day = keyOf(new Date(t.startedAt))
  if (t.kind === 'delay') return addUrge(doc, h.id, day, 1)
  return h.marks[day] === 't' ? doc : setMark(doc, h.id, day, 't')
}
