import { kindOf, type DayKey, type Doc } from './types.ts'
import { addDays } from './week.ts'

export type Prompt =
  | { kind: 'restart'; habit: string }
  | { kind: 'twoMiss'; habit: string; days: [DayKey, DayKey]; reasons: [string, string] }

const daily = (doc: Doc) => (doc.settings.missRules ? doc.habits.filter(h => kindOf(h) === 'daily' && !h.later) : [])

export function restartPrompts(doc: Doc, today: DayKey): Prompt[] {
  const y = addDays(today, -1)
  return daily(doc).filter(h => h.marks[y] === 'x' && !h.marks[today]).map(h => ({ kind: 'restart', habit: h.id }))
}

export type TwoMissPrompt = Extract<Prompt, { kind: 'twoMiss' }>

export function twoMissAfter(doc: Doc, habitId: string, day: DayKey): TwoMissPrompt | null {
  const h = daily(doc).find(x => x.id === habitId)
  if (!h || h.marks[day] !== 'x') return null
  const prev = addDays(day, -1), next = addDays(day, 1)
  const pair: [DayKey, DayKey] | null = h.marks[prev] === 'x' ? [prev, day] : h.marks[next] === 'x' ? [day, next] : null
  if (!pair) return null
  return { kind: 'twoMiss', habit: h.id, days: pair, reasons: [h.reasons?.[pair[0]] || '', h.reasons?.[pair[1]] || ''] }
}
