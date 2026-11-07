import test from 'node:test'
import assert from 'node:assert/strict'
import { streaks, nextMs, peaks } from './streaks.ts'

test('only a miss breaks the run; future marks ignored', () => {
  const m = { '2026-11-01': 't', '2026-11-02': 't', '2026-11-03': 'x', '2026-11-04': 't', '2026-11-06': 't', '2026-11-20': 't' } as const
  assert.deepEqual(streaks({ ...m }, '2026-11-06'), { cur: 2, best: 2, prev: 2 })
})
test('milestones', () => { assert.equal(nextMs(0), 7); assert.equal(nextMs(7), 21); assert.equal(nextMs(365), 400) })
test('7-day milestone peak', () => {
  const marks: any = {}; for (let i = 1; i <= 7; i++) marks['2026-11-0' + i] = 't'
  const b = streaks({ ...marks, '2026-11-07': undefined } as any, '2026-11-07'), a = streaks(marks, '2026-11-07')
  assert.equal(peaks('2026-11-07', 't', { cur: 6, best: 6, prev: 0 }, a, marks, '')?.label, '7-day streak')
  void b
})
