import test from 'node:test'
import assert from 'node:assert/strict'
import { weekReview } from './review.ts'
import { normalize } from './records.ts'

test('weekly review: each active habit against its goal, reasons only for missed days in the week', () => {
  const d = normalize({ habits: [
    { id: 'a', name: 'Run', marks: { '2026-11-23': 'x', '2026-11-24': 't', '2026-11-16': 'x' }, reasons: { '2026-11-23': 'rain', '2026-11-24': 'old', '2026-11-16': 'last week' } },
    { id: 'r', name: 'Phone', kind: 'reduce', budget: 5, marks: {}, urges: { '2026-11-23': 3 }, slips: { '2026-11-23': 2 } },
    { id: 'n', name: 'Pages', kind: 'number', marks: {}, values: { '2026-11-23': 10, '2026-11-24': 20 } },
    { id: 'l', name: 'Later', later: true, marks: {} },
  ], settings: { weekStart: 0, missRules: true } }, null)
  const r = weekReview(d, '2026-11-28')
  assert.deepEqual(r.map(x => x.habit), ['a', 'r', 'n'])
  assert.deepEqual(r[0].reasons, [{ day: '2026-11-23', text: 'rain' }])
  assert.equal(r[0].line, '1 / 7')
  assert.equal(r[1].line, '2 of 5 used')
  assert.equal(r[2].line, '30')
  assert.equal(r[2].average, 15)
})
