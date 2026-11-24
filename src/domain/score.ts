import { kindOf, type DayKey, type Doc } from './types.ts'

export function dailyScore(doc: Doc, day: DayKey): { done: number; of: number } | null {
  const hs = doc.habits.filter(h => kindOf(h) === 'daily' && !h.later)
  return hs.length ? { done: hs.filter(h => h.marks[day] === 't').length, of: hs.length } : null
}
