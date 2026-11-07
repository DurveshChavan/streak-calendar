import { MONTHS, pad, parse } from './calendar.ts'

export type Mark = 't' | 'x'
export type Marks = Record<string, Mark>
export interface Streaks { cur: number; best: number; prev: number }

// Milestones: 7, 21, 30, 50, 100, 150, 200, 250, 300, 365, then every 100
const MS = [7, 21, 30, 50, 100, 150, 200, 250, 300, 365]
export const isMs = (n: number) => MS.includes(n) || (n > 365 && n % 100 === 0)
export const nextMs = (n: number) => MS.find(m => m > n) || (Math.floor(n / 100) + 1) * 100

/** Only a missed day (✕) breaks a run; unmarked days neither extend nor break it. Days after `today` are ignored. */
export function streaks(marks: Marks, today: string): Streaks {
  const keys = Object.keys(marks).filter(k => k <= today).sort()
  let run = 0, best = 0, prev = 0
  for (const k of keys) {
    if (marks[k] === 't') { run++; if (run > best) best = run }
    else { if (run > prev) prev = run; run = 0 }
  }
  return { cur: run, best, prev }
}

export interface Peak { label: string; month: boolean; best: boolean }
export function peaks(k: string, v: Mark | null, b: Streaks, a: Streaks, marks: Marks, habitLabel: string): Peak | null {
  if (v !== 't') return null
  const d = parse(k), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), pre = k.slice(0, 8), parts: string[] = []
  let full = true; for (let i = 1; i <= dim; i++) if (marks[pre + pad(i)] !== 't') { full = false; break }
  let ms = 0; for (let n = b.cur + 1; n <= a.cur; n++) if (isMs(n)) ms = n
  const best = b.prev >= 3 && b.cur <= b.prev && a.cur > b.prev
  if (full) parts.push('Perfect ' + MONTHS[d.getMonth()])
  if (ms) parts.push(ms + '-day streak')
  if (best) parts.push(parts.length ? 'new best' : 'New best · ' + a.cur + ' days')
  return parts.length ? { label: (habitLabel ? habitLabel + ' · ' : '') + parts.join(' · '), month: full, best } : null
}
