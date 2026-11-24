import type { Doc, Habit } from './store.ts'
import { holidaysFor, keyOf } from '../domain/calendar.ts'
import { kindOf } from '../domain/types.ts'

const FIELDS = ['budget', 'target', 'goal', 'unit', 'timerMin', 'replacement', 'later', 'marks', 'urges', 'slips', 'values'] as const

function habit(h: Habit) {
  const out: Record<string, unknown> = { id: h.id, name: h.name, kind: kindOf(h) }
  for (const f of FIELDS) if (h[f] !== undefined) out[f] = h[f]
  return out
}

export function widgetPayload(doc: Doc, now = new Date()): string {
  const from = keyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to = keyOf(new Date(now.getFullYear() + 1, now.getMonth() + 1, 0))
  const hol: Record<string, string> = {}
  for (const y of [now.getFullYear(), now.getFullYear() + 1]) for (const [k, n] of Object.entries(holidaysFor(y))) if (k >= from && k <= to) hol[k] = n.join(' · ')
  return JSON.stringify({ v: 3, theme: doc.theme, weekStart: doc.settings.weekStart, habits: doc.habits.map(habit), hol })
}
