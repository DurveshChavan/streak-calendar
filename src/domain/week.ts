import { keyOf, parse } from './calendar.ts'
import type { DayKey, WeekStart } from './types.ts'

export const addDays = (day: DayKey, n: number): DayKey => { const d = parse(day); d.setDate(d.getDate() + n); return keyOf(d) }

export function weekOf(day: DayKey, ws: WeekStart): DayKey {
  return addDays(day, -((parse(day).getDay() - ws + 7) % 7))
}

export const weekDays = (first: DayKey): DayKey[] => Array.from({ length: 7 }, (_, i) => addDays(first, i))

export function lastWeeks(today: DayKey, ws: WeekStart, n: number): DayKey[] {
  const cur = weekOf(today, ws)
  return Array.from({ length: n }, (_, i) => addDays(cur, (i - n + 1) * 7))
}

export const isLastDayOfWeek = (day: DayKey, ws: WeekStart) => addDays(weekOf(day, ws), 6) === day
