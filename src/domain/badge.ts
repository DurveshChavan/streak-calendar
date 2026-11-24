import { kindOf, type DayKey, type Habit, type WeekStart } from './types.ts'
import { streak, thisWeek, total } from './progress.ts'

export function badge(h: Habit, today: DayKey, ws: WeekStart): { total: number; sub: string } {
  const t = total(h, today), s = streak(h, today, ws), k = kindOf(h)
  if (s) return { total: t, sub: s.unit === 'day' ? 'streak ' + s.cur : s.cur + ' wk streak' }
  if (k === 'reduce') return { total: t, sub: 'urges resisted' }
  return { total: t, sub: (h.unit ? h.unit + ' ' : '') + 'in total' }
}

export function weekLine(h: Habit, today: DayKey, ws: WeekStart): string {
  const w = thisWeek(h, today, ws), k = kindOf(h)
  if (k === 'reduce') return w.of ? `${w.used} of ${w.of} used` : `${w.amount} resisted`
  const unit = k === 'number' && h.unit ? ' ' + h.unit : ''
  return (w.of ? `${w.amount} / ${w.of}` : String(w.amount)) + unit
}
