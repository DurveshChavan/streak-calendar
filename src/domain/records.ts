import type { Doc, Habit } from './types.ts'

export type Flat = Record<string, any>

export function normalize(v2: any, v1: any): Doc {
  let s = v2
  if (!s || !Array.isArray(s.habits) || !s.habits.length) {
    const o = v1 || {}
    s = { habits: [{ id: 'h1', name: 'Habit 1', marks: o.marks || {} }], cur: 'h1', notes: o.notes || {}, theme: o.theme || 'light' }
  }
  return { habits: s.habits, cur: s.habits.some((h: Habit) => h.id === s.cur) ? s.cur : s.habits[0].id, notes: s.notes || {}, theme: s.theme || 'light' }
}

export function flatten(d: Doc): Flat {
  const f: Flat = {}
  d.habits.forEach((h, i) => {
    f['habit:' + h.id] = { name: h.name, order: i }
    for (const [day, v] of Object.entries(h.marks)) f['mark:' + h.id + ':' + day] = v
  })
  for (const [day, t] of Object.entries(d.notes)) f['note:' + day] = t
  return f
}

export function rebuild(flat: Flat, prev: Doc): Doc {
  const hs: { id: string; name: string; order: number }[] = []
  for (const [k, v] of Object.entries(flat)) if (k.startsWith('habit:') && v) hs.push({ id: k.slice(6), name: v.name, order: v.order })
  hs.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const byId: Record<string, Habit> = {}
  const habits = hs.map(h => (byId[h.id] = { id: h.id, name: h.name, marks: {} }))
  const notes: Record<string, string> = {}
  for (const [k, v] of Object.entries(flat)) {
    if (v == null) continue
    if (k.startsWith('mark:')) { const i = k.indexOf(':', 5), h = byId[k.slice(5, i)]; if (h) h.marks[k.slice(i + 1)] = v }
    else if (k.startsWith('note:')) notes[k.slice(5)] = v
  }
  if (!habits.length) return prev
  return { habits, notes, theme: prev.theme, cur: habits.some(h => h.id === prev.cur) ? prev.cur : habits[0].id }
}
