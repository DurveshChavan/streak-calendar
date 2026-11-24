import { kindOf, type DayKey, type Habit, type WeekStart } from './types.ts'
import { streak, total } from './progress.ts'

export function badge(h: Habit, today: DayKey, ws: WeekStart): { total: number; sub: string } {
  const t = total(h, today), s = streak(h, today, ws), k = kindOf(h)
  if (s) return { total: t, sub: s.unit === 'day' ? 'streak ' + s.cur : s.cur + ' wk streak' }
  if (k === 'reduce') return { total: t, sub: 'urges resisted' }
  return { total: t, sub: (h.unit ? h.unit + ' ' : '') + 'in total' }
}
