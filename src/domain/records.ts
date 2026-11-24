import { DEFAULT_SETTINGS, type AvoidItem, type Doc, type Habit, type Settings } from './types.ts'

export type Flat = Record<string, any>
export const PROTOCOL = 3

const CONFIG = ['kind', 'goal', 'budget', 'target', 'unit', 'timerMin', 'replacement', 'later'] as const
const MAPS = [['reasons', 'reason'], ['urges', 'urge'], ['slips', 'slip'], ['values', 'val']] as const
const SETTINGS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]

export function normalize(v2: any, v1: any): Doc {
  let s = v2
  if (!s || !Array.isArray(s.habits) || !s.habits.length) {
    const o = v1 || {}
    s = { habits: [{ id: 'h1', name: 'Habit 1', marks: o.marks || {} }], cur: 'h1', notes: o.notes || {}, theme: o.theme || 'light' }
  }
  return {
    habits: s.habits,
    avoid: Array.isArray(s.avoid) ? s.avoid : [],
    settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
    cur: s.habits.some((h: Habit) => h.id === s.cur) ? s.cur : s.habits[0].id,
    notes: s.notes || {},
    theme: s.theme || 'light',
  }
}

const kept = (v: unknown) => v !== undefined && v !== null && v !== '' && v !== 0

export function flatten(d: Doc): Flat {
  const f: Flat = {}
  d.habits.forEach((h, i) => {
    const cfg: Record<string, unknown> = { name: h.name, order: i }
    for (const k of CONFIG) if (h[k] !== undefined && h[k] !== false) cfg[k] = h[k]
    f['habit:' + h.id] = cfg
    for (const [day, v] of Object.entries(h.marks)) f['mark:' + h.id + ':' + day] = v
    for (const [field, prefix] of MAPS) for (const [day, v] of Object.entries(h[field] || {})) if (kept(v)) f[prefix + ':' + h.id + ':' + day] = v
  })
  d.avoid.forEach((a, i) => { f['avoid:' + a.id] = { name: a.name, replacement: a.replacement, order: i } })
  for (const k of SETTINGS) f['set:' + k] = d.settings[k]
  for (const [day, t] of Object.entries(d.notes)) f['note:' + day] = t
  return f
}

export function rebuild(flat: Flat, prev: Doc): Doc {
  const hs: (Habit & { order: number })[] = [], av: (AvoidItem & { order: number })[] = []
  const settings: Settings = { ...DEFAULT_SETTINGS }
  for (const [k, v] of Object.entries(flat)) {
    if (v == null) continue
    if (k.startsWith('habit:')) {
      const h: any = { id: k.slice(6), name: v.name, order: v.order }
      for (const c of CONFIG) if (v[c] !== undefined) h[c] = v[c]
      h.marks = {}
      hs.push(h)
    } else if (k.startsWith('avoid:')) av.push({ id: k.slice(6), name: v.name, replacement: v.replacement, order: v.order })
    else if (k.startsWith('set:') && (SETTINGS as string[]).includes(k.slice(4))) (settings as any)[k.slice(4)] = v
  }
  const byOrder = (a: { order: number; id: string }, b: { order: number; id: string }) => a.order - b.order || a.id.localeCompare(b.id)
  hs.sort(byOrder); av.sort(byOrder)
  const byId: Record<string, Habit> = {}
  const habits = hs.map(({ order, ...h }) => (byId[h.id] = h))
  const notes: Record<string, string> = {}
  for (const [k, v] of Object.entries(flat)) {
    if (v == null) continue
    const c = k.indexOf(':'), prefix = k.slice(0, c)
    if (prefix === 'note') { notes[k.slice(c + 1)] = v; continue }
    const i = k.indexOf(':', c + 1), h = byId[k.slice(c + 1, i)], day = k.slice(i + 1)
    if (!h || i < 0) continue
    if (prefix === 'mark') h.marks[day] = v
    else for (const [field, p] of MAPS) if (p === prefix) ((h as any)[field] ??= {})[day] = v
  }
  if (!habits.length) return prev
  return {
    habits, notes, settings,
    avoid: av.map(({ order, ...a }) => a),
    theme: prev.theme,
    cur: habits.some(h => h.id === prev.cur) ? prev.cur : habits[0].id,
  }
}
