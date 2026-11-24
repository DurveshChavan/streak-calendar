import { isBuild, kindOf, type DayKey, type Doc, type Kind } from './types.ts'
import { thisWeek } from './progress.ts'
import { weekLine } from './badge.ts'
import { addDays, weekOf } from './week.ts'

export interface ReviewRow { habit: string; name: string; kind: Kind; line: string; met: boolean | null; average?: number; reasons: { day: DayKey; text: string }[] }

export function weekReview(doc: Doc, today: DayKey): ReviewRow[] {
  const ws = doc.settings.weekStart, first = weekOf(today, ws), last = addDays(first, 6)
  const inWeek = (k: DayKey) => k >= first && k <= last && k <= today
  return doc.habits.filter(h => !h.later).map(h => {
    const w = thisWeek(h, today, ws), row: ReviewRow = { habit: h.id, name: h.name, kind: kindOf(h), line: weekLine(h, today, ws), met: w.met, reasons: [] }
    if (isBuild(h)) row.reasons = Object.entries(h.reasons || {}).filter(([k]) => inWeek(k) && h.marks[k] === 'x').sort().map(([day, text]) => ({ day, text }))
    if (kindOf(h) === 'number') { const vs = Object.entries(h.values || {}).filter(([k]) => inWeek(k)).map(([, v]) => v); if (vs.length) row.average = Math.round(vs.reduce((a, b) => a + b, 0) / vs.length * 10) / 10 }
    return row
  })
}
