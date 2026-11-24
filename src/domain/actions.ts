import { kindOf, type AvoidItem, type DayKey, type Doc, type Habit, type Mark, type Settings } from './types.ts'

type DayMap = 'reasons' | 'urges' | 'slips' | 'values'

function patch(doc: Doc, id: string, f: (h: Habit) => Habit): Doc {
  return { ...doc, habits: doc.habits.map(h => (h.id === id ? f(h) : h)) }
}

function put<T>(m: Record<DayKey, T> | undefined, day: DayKey, v: T | null): Record<DayKey, T> {
  const out = { ...m }
  if (v === null) delete out[day]; else out[day] = v
  return out
}

const setDay = (doc: Doc, id: string, field: DayMap, day: DayKey, v: string | number | null) =>
  patch(doc, id, h => ({ ...h, [field]: put<any>(h[field], day, v) }))

export const setMark = (doc: Doc, id: string, day: DayKey, m: Mark | null) => patch(doc, id, h => ({ ...h, marks: put(h.marks, day, m) }))

export const setReason = (doc: Doc, id: string, day: DayKey, text: string) => setDay(doc, id, 'reasons', day, text.trim() ? text : null)

function step(doc: Doc, id: string, field: 'urges' | 'slips', day: DayKey, delta: 1 | -1) {
  const h = doc.habits.find(x => x.id === id)
  if (!h || (field === 'slips' && !h.budget)) return doc
  const n = (h[field]?.[day] || 0) + delta
  return setDay(doc, id, field, day, n > 0 ? n : null)
}

export const addUrge = (doc: Doc, id: string, day: DayKey, delta: 1 | -1) => step(doc, id, 'urges', day, delta)
export const addSlip = (doc: Doc, id: string, day: DayKey, delta: 1 | -1) => step(doc, id, 'slips', day, delta)
export const setValue = (doc: Doc, id: string, day: DayKey, v: number | null) => setDay(doc, id, 'values', day, v)

const BUILD = ['daily', 'weekly']

export function upsertHabit(doc: Doc, h: Habit): Doc {
  const old = doc.habits.find(x => x.id === h.id)
  if (!old) return { ...doc, habits: [...doc.habits, h] }
  const from = kindOf(old), to = kindOf(h)
  const kind = from === to || (BUILD.includes(from) && BUILD.includes(to)) ? h.kind : old.kind
  const next = { ...h, kind }
  if (next.kind === undefined) delete next.kind
  return patch(doc, h.id, () => next)
}

export const setLater = (doc: Doc, id: string, later: boolean) => patch(doc, id, h => {
  const { later: _, ...rest } = h
  return later ? { ...rest, later: true } : rest
})

export function upsertAvoid(doc: Doc, a: AvoidItem): Doc {
  return doc.avoid.some(x => x.id === a.id) ? { ...doc, avoid: doc.avoid.map(x => (x.id === a.id ? a : x)) } : { ...doc, avoid: [...doc.avoid, a] }
}

export const removeAvoid = (doc: Doc, id: string): Doc => ({ ...doc, avoid: doc.avoid.filter(a => a.id !== id) })

export const setSettings = (doc: Doc, s: Partial<Settings>): Doc => ({ ...doc, settings: { ...doc.settings, ...s } })
