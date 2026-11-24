import type { AvoidItem, Doc, Habit, Mark, Settings } from '../domain/types.ts'
import { upsertHabit } from '../domain/actions.ts'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const KINDS = ['daily', 'weekly', 'reduce', 'number']

export function makeBackup(doc: Doc): string {
  return JSON.stringify({ app: 'streak-calendar', version: 3, exported: new Date().toISOString(), data: doc })
}

export interface Parsed { habits: Habit[]; notes: Record<string, string>; avoid: AvoidItem[]; settings?: Partial<Settings> }
export interface Counts { habits: number; marks: number; notes: number }
export const countOf = (d: Parsed): Counts => ({ habits: d.habits.length, marks: d.habits.reduce((n, h) => n + Object.keys(h.marks).length, 0), notes: Object.keys(d.notes).length })

const text = (v: unknown, max: number) => typeof v === 'string' && v ? v.slice(0, max) : undefined
const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined
const count = (v: unknown) => Number.isInteger(v) && (v as number) > 0 ? v as number : undefined
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined

function dayMap<T>(raw: unknown, pick: (v: unknown) => T | undefined): Record<string, T> | undefined {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(raw && typeof raw === 'object' ? raw : {})) { const p = pick(v); if (DAY.test(k) && p !== undefined) out[k] = p }
  return Object.keys(out).length ? out : undefined
}

function readHabit(h: any): Habit {
  const marks: Record<string, Mark> = {}
  for (const [k, m] of Object.entries(h.marks || {})) if (DAY.test(k) && (m === 't' || m === 'x')) marks[k] = m
  const out: Habit = { id: h.id, name: String(h.name || 'Habit').slice(0, 24), marks }
  const opt: Partial<Habit> = {
    kind: KINDS.includes(h.kind) ? h.kind : undefined,
    goal: count(h.goal), budget: count(h.budget), target: positive(h.target),
    unit: text(h.unit, 24), timerMin: count(h.timerMin), replacement: text(h.replacement, 80),
    later: h.later === true ? true : undefined,
    reasons: dayMap(h.reasons, v => text(v, 500)), urges: dayMap(h.urges, count),
    slips: dayMap(h.slips, count), values: dayMap(h.values, finite),
  }
  for (const [k, v] of Object.entries(opt)) if (v !== undefined) (out as any)[k] = v
  return out
}

export function parseBackup(raw: string): Parsed | null {
  let v: any
  try { v = JSON.parse(raw.trim()); if (typeof v === 'string') v = JSON.parse(v) } catch { return null }
  if (v && v.app === 'streak-calendar' && v.data) v = v.data
  if (!v || !Array.isArray(v.habits)) return null
  const habits: Habit[] = []
  for (const h of v.habits) {
    if (!h || typeof h.id !== 'string' || !h.id || h.id.length > 40 || habits.some(x => x.id === h.id)) continue
    habits.push(readHabit(h))
  }
  if (!habits.length) return null
  const notes: Record<string, string> = {}
  for (const [k, t] of Object.entries(v.notes || {})) if (DAY.test(k) && typeof t === 'string' && t) notes[k] = t.slice(0, 5000)
  const avoid: AvoidItem[] = []
  for (const a of Array.isArray(v.avoid) ? v.avoid : []) if (a && typeof a.id === 'string' && a.id && a.id.length <= 40 && !avoid.some(x => x.id === a.id)) avoid.push({ id: a.id, name: text(a.name, 40) || 'Avoid', replacement: text(a.replacement, 80) || '' })
  const out: Parsed = { habits, notes, avoid }
  if (v.settings && typeof v.settings === 'object') {
    const s: Partial<Settings> = {}
    if (Number.isInteger(v.settings.weekStart) && v.settings.weekStart >= 0 && v.settings.weekStart <= 6) s.weekStart = v.settings.weekStart
    if (typeof v.settings.missRules === 'boolean') s.missRules = v.settings.missRules
    out.settings = s
  }
  return out
}

const MAPS = ['marks', 'reasons', 'urges', 'slips', 'values'] as const

export function mergeBackup(cur: Doc, b: Parsed): Doc {
  const habits = cur.habits.map(h => {
    const o = b.habits.find(x => x.id === h.id)
    if (!o) return h
    const m: any = { ...h, ...o }
    for (const k of MAPS) if (h[k] || o[k]) m[k] = { ...h[k], ...o[k] }
    return upsertHabit({ ...cur, habits: [h] }, m).habits[0]
  })
  for (const o of b.habits) if (!cur.habits.some(h => h.id === o.id)) habits.push(o)
  const avoid = [...(cur.avoid || [])]
  for (const a of b.avoid) if (!avoid.some(x => x.id === a.id)) avoid.push(a)
  return { ...cur, habits, avoid, notes: { ...cur.notes, ...b.notes } }
}
