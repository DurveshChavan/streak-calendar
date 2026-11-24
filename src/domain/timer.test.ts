import test from 'node:test'
import assert from 'node:assert/strict'
import { settle, settleAll, timerKind } from './timer.ts'
import { normalize } from './records.ts'

const at = (s: string) => new Date(s).getTime()
const doc = () => normalize({ habits: [
  { id: 'h', name: 'Run', marks: { '2026-11-24': 'x' }, reasons: { '2026-11-24': 'tired' } },
  { id: 'r', name: 'Phone', kind: 'reduce', marks: {}, urges: { '2026-11-24': 2 } },
  { id: 'l', name: 'Later', later: true, marks: {} },
] }, null)
const t = (habitId: string, kind: 'start' | 'delay', start: string, min: number) => ({ habitId, kind, startedAt: at(start), endsAt: at(start) + min * 60000 })

test('a start timer marks its day done', () => {
  const d = settle(doc(), t('h', 'start', '2026-11-25T08:00:00', 5), at('2026-11-25T08:06:00'))
  assert.equal(d.habits[0].marks['2026-11-25'], 't')
})
test('a delay timer adds one resisted urge', () => {
  const d = settle(doc(), t('r', 'delay', '2026-11-24T21:00:00', 20), at('2026-11-24T21:30:00'))
  assert.equal(d.habits[1].urges!['2026-11-24'], 3)
})
test('a timer that has not ended changes nothing', () => {
  const d0 = doc()
  assert.equal(settle(d0, t('h', 'start', '2026-11-25T08:00:00', 5), at('2026-11-25T08:04:59')), d0)
})
test('a timer that ends after midnight settles on its start day (E3)', () => {
  const d = settle(doc(), t('r', 'delay', '2026-11-24T23:55:00', 20), at('2026-11-25T09:00:00'))
  assert.equal(d.habits[1].urges!['2026-11-24'], 3)
  assert.equal(d.habits[1].urges!['2026-11-25'], undefined)
})
test('a missed day becomes done and keeps its reason hidden (E4)', () => {
  const d = settle(doc(), t('h', 'start', '2026-11-24T20:00:00', 5), at('2026-11-24T20:10:00'))
  assert.equal(d.habits[0].marks['2026-11-24'], 't')
  assert.equal(d.habits[0].reasons!['2026-11-24'], 'tired')
})
test('a deleted or later habit drops the timer (E5)', () => {
  const d0 = doc()
  assert.equal(settle(d0, t('gone', 'start', '2026-11-25T08:00:00', 5), at('2026-11-25T09:00:00')), d0)
  assert.equal(settle(d0, t('l', 'start', '2026-11-25T08:00:00', 5), at('2026-11-25T09:00:00')), d0)
})
test('timer kind follows the habit kind', () => {
  assert.equal(timerKind(doc().habits[0]), 'start')
  assert.equal(timerKind(doc().habits[1]), 'delay')
  assert.equal(timerKind({ id: 'n', name: 'N', kind: 'number', marks: {} }), null)
})

test('a timer settled twice counts once', () => {
  const r = t('r', 'delay', '2026-11-24T21:00:00', 20), h = t('h', 'start', '2026-11-25T08:00:00', 5), now = at('2026-11-25T09:00:00')
  const first = settleAll(doc(), [r, h], now, [])
  assert.equal(first.doc.habits[1].urges!['2026-11-24'], 3)
  const again = settleAll(first.doc, [r, h], now, first.seen)
  assert.equal(again.doc, first.doc)
  assert.deepEqual(again.seen, first.seen)
})

test('a timer that has not ended is not remembered as settled', () => {
  const r = t('r', 'delay', '2026-11-24T21:00:00', 20)
  const early = settleAll(doc(), [r], at('2026-11-24T21:10:00'), [])
  assert.deepEqual(early.seen, [])
  assert.equal(settleAll(early.doc, [r], at('2026-11-24T21:30:00'), early.seen).doc.habits[1].urges!['2026-11-24'], 3)
})

test('the settled list keeps only the newest 50', () => {
  const seen = Array.from({ length: 60 }, (_, i) => 'x@' + i)
  const r = settleAll(doc(), [t('r', 'delay', '2026-11-24T21:00:00', 20)], at('2026-11-25T09:00:00'), seen)
  assert.equal(r.seen.length, 50)
  assert.equal(r.seen[49], 'r@' + at('2026-11-24T21:00:00'))
})
