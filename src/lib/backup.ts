// Backup & restore as plain text (JSON), so data can always be carried to a new install or a new phone.
// Restore merges: it never deletes anything already on this device.
import type { Doc, Habit } from './store'
import type { Mark } from './streaks'

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function makeBackup(doc: Doc): string {
  return JSON.stringify({ app: 'streak-calendar', version: 2, exported: new Date().toISOString(), data: doc })
}

export interface Parsed { habits: Habit[]; notes: Record<string, string> }
export interface Counts { habits: number; marks: number; notes: number }
export const countOf = (d: Parsed): Counts => ({ habits: d.habits.length, marks: d.habits.reduce((n, h) => n + Object.keys(h.marks).length, 0), notes: Object.keys(d.notes).length })

/** Accepts a 2.0 backup, the raw 1.0/2.0 local data ({habits:[...]}) or either one JSON-encoded as a string. */
export function parseBackup(text: string): Parsed | null {
  let v: any
  try { v = JSON.parse(text.trim()); if (typeof v === 'string') v = JSON.parse(v) } catch { return null }
  if (v && v.app === 'streak-calendar' && v.data) v = v.data
  if (!v || !Array.isArray(v.habits)) return null
  const habits: Habit[] = []
  for (const h of v.habits) {
    if (!h || typeof h.id !== 'string' || !h.id || h.id.length > 40 || habits.some(x => x.id === h.id)) continue
    const marks: Record<string, Mark> = {}
    for (const [k, m] of Object.entries(h.marks || {})) if (DAY.test(k) && (m === 't' || m === 'x')) marks[k] = m
    habits.push({ id: h.id, name: String(h.name || 'Habit').slice(0, 24), marks })
  }
  if (!habits.length) return null
  const notes: Record<string, string> = {}
  for (const [k, t] of Object.entries(v.notes || {})) if (DAY.test(k) && typeof t === 'string' && t) notes[k] = t.slice(0, 5000)
  return { habits, notes }
}

/** Habits with the same id are combined (the backup's name and, for the same day, the backup's mark win); others are added. */
export function mergeBackup(cur: Doc, b: Parsed): Doc {
  const habits = cur.habits.map(h => { const o = b.habits.find(x => x.id === h.id); return o ? { ...h, name: o.name, marks: { ...h.marks, ...o.marks } } : h })
  for (const o of b.habits) if (!cur.habits.some(h => h.id === o.id)) habits.push(o)
  return { ...cur, habits, notes: { ...cur.notes, ...b.notes } }
}
