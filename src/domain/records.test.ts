import test from 'node:test'
import assert from 'node:assert/strict'
import { normalize, flatten, rebuild } from './records.ts'

const v2 = { habits: [{ id: 'h1', name: 'Run', marks: { '2026-11-01': 't', '2026-11-02': 'x' } }, { id: 'h2', name: 'Read', marks: {} }], cur: 'h2', notes: { '2026-11-01': '5k' }, theme: 'dark' }

test('a 2.0 doc round-trips unchanged through normalize, flatten and rebuild', () => {
  const d = normalize(JSON.parse(JSON.stringify(v2)), null)
  assert.deepEqual(d, v2)
  assert.deepEqual(rebuild(flatten(d), d), v2)
})
test('a 1.0 doc becomes one habit', () => {
  const d = normalize(null, { marks: { '2026-11-01': 't' }, notes: { '2026-11-01': 'a' }, theme: 'dark' })
  assert.deepEqual(d, { habits: [{ id: 'h1', name: 'Habit 1', marks: { '2026-11-01': 't' } }], cur: 'h1', notes: { '2026-11-01': 'a' }, theme: 'dark' })
})
test('nothing stored gives the default doc', () => {
  assert.deepEqual(normalize(null, null), { habits: [{ id: 'h1', name: 'Habit 1', marks: {} }], cur: 'h1', notes: {}, theme: 'light' })
})
test('an unknown current habit falls back to the first', () => {
  assert.equal(normalize({ ...v2, cur: 'gone' }, null).cur, 'h1')
})
