// The data the Android widget reads (see WidgetData.java): every habit, the app theme and ~a year of holidays,
// so the widget can switch habits, colour holidays red and list the next ones without the app running.
import type { Doc } from './store'
import { holidaysFor, keyOf } from './calendar'

export function widgetPayload(doc: Doc, now = new Date()): string {
  const from = keyOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to = keyOf(new Date(now.getFullYear() + 1, now.getMonth() + 1, 0))
  const hol: Record<string, string> = {}
  for (const y of [now.getFullYear(), now.getFullYear() + 1]) for (const [k, n] of Object.entries(holidaysFor(y))) if (k >= from && k <= to) hol[k] = n.join(' · ')
  return JSON.stringify({ v: 2, theme: doc.theme, habits: doc.habits.map(h => ({ id: h.id, name: h.name, marks: h.marks })), hol })
}
