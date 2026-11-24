import test from 'node:test'
import assert from 'node:assert/strict'
import { normalize, flatten, rebuild } from './records.ts'
import { kindOf } from './types.ts'

const v2 = { habits: [{ id: 'h1', name: 'Run', marks: { '2026-11-01': 't', '2026-11-02': 'x' } }, { id: 'h2', name: 'Read', marks: {} }], cur: 'h2', notes: { '2026-11-01': '5k' }, theme: 'dark' }

test('a 2.0 doc round-trips unchanged through normalize, flatten and rebuild', () => {
  const d = normalize(JSON.parse(JSON.stringify(v2)), null)
  assert.deepEqual(d, { ...v2, avoid: [], settings: { weekStart: 0, missRules: true } })
  assert.deepEqual(rebuild(flatten(d), d), d)
})
test('a 1.0 doc becomes one habit', () => {
  const d = normalize(null, { marks: { '2026-11-01': 't' }, notes: { '2026-11-01': 'a' }, theme: 'dark' })
  assert.deepEqual(d, { habits: [{ id: 'h1', name: 'Habit 1', marks: { '2026-11-01': 't' } }], cur: 'h1', notes: { '2026-11-01': 'a' }, theme: 'dark', avoid: [], settings: { weekStart: 0, missRules: true } })
})
test('nothing stored gives the default doc', () => {
  assert.deepEqual(normalize(null, null), { habits: [{ id: 'h1', name: 'Habit 1', marks: {} }], cur: 'h1', notes: {}, theme: 'light', avoid: [], settings: { weekStart: 0, missRules: true } })
})
test('an unknown current habit falls back to the first', () => {
  assert.equal(normalize({ ...v2, cur: 'gone' }, null).cur, 'h1')
})

const v31 = {
  habits: [
    { id: 'h1', name: 'Run', marks: { '2026-11-02': 'x' }, reasons: { '2026-11-02': 'rain' } },
    { id: 'w1', name: 'Speak', kind: 'weekly', goal: 3, timerMin: 10, marks: { '2026-11-03': 't' } },
    { id: 'r1', name: 'Phone', kind: 'reduce', budget: 5, replacement: 'walk', marks: {}, urges: { '2026-11-03': 4 }, slips: { '2026-11-03': 1 } },
    { id: 'n1', name: 'Pages', kind: 'number', target: 70, unit: 'pages', later: true, marks: {}, values: { '2026-11-03': 12.5 } },
  ],
  avoid: [{ id: 'a1', name: 'Sugar', replacement: 'fruit' }],
  settings: { weekStart: 1, missRules: false },
  cur: 'h1', notes: {}, theme: 'light',
}

test('every 3.1 fact survives flatten and rebuild', () => {
  const d = normalize(JSON.parse(JSON.stringify(v31)), null)
  assert.deepEqual(rebuild(flatten(d), normalize(null, null)), d)
})
test('3.1 facts use their own record keys', () => {
  const f = flatten(normalize(JSON.parse(JSON.stringify(v31)), null))
  assert.equal(f['reason:h1:2026-11-02'], 'rain')
  assert.equal(f['urge:r1:2026-11-03'], 4)
  assert.equal(f['slip:r1:2026-11-03'], 1)
  assert.equal(f['val:n1:2026-11-03'], 12.5)
  assert.deepEqual(f['avoid:a1'], { name: 'Sugar', replacement: 'fruit', order: 0 })
  assert.equal(f['set:weekStart'], 1)
  assert.equal(f['set:missRules'], false)
  assert.deepEqual(f['habit:w1'], { name: 'Speak', order: 1, kind: 'weekly', goal: 3, timerMin: 10 })
  assert.deepEqual(f['habit:h1'], { name: 'Run', order: 0 })
})
test('zero counts and empty text are not stored', () => {
  const d = normalize(JSON.parse(JSON.stringify(v31)), null)
  d.habits[2].urges = { '2026-11-03': 0 }
  d.habits[0].reasons = { '2026-11-02': '' }
  const f = flatten(d)
  assert.equal('urge:r1:2026-11-03' in f, false)
  assert.equal('reason:h1:2026-11-02' in f, false)
})
test('a 2.0 habit reads as build daily', () => {
  assert.equal(kindOf(normalize(JSON.parse(JSON.stringify(v2)), null).habits[0]), 'daily')
})

test('a number value of 0 is kept in sync records', () => {
  const d = normalize({ habits: [{ id: 'n', name: 'N', kind: 'number', marks: {}, values: { '2026-11-25': 0 } }] }, null)
  assert.equal(flatten(d)['val:n:2026-11-25'], 0)
  assert.equal(rebuild(flatten(d), d).habits[0].values!['2026-11-25'], 0)
})
test('the current habit falls back to an active one when it is in Later', () => {
  const d = normalize({ habits: [{ id: 'a', name: 'A', later: true, marks: {} }, { id: 'b', name: 'B', marks: {} }], cur: 'a' }, null)
  assert.equal(d.cur, 'b')
  assert.equal(rebuild(flatten(d), { ...d, cur: 'a' }).cur, 'b')
})

test('synced settings with a wrong type fall back to the defaults', () => {
  const base = flatten(normalize(null, null))
  for (const [weekStart, missRules] of [['x', 'yes'], [9, 1], [2.5, null], [-1, 'false']] as const) {
    const d = rebuild({ ...base, 'set:weekStart': weekStart, 'set:missRules': missRules }, normalize(null, null))
    assert.deepEqual(d.settings, { weekStart: 0, missRules: true })
  }
  assert.deepEqual(rebuild({ ...base, 'set:weekStart': 3, 'set:missRules': false }, normalize(null, null)).settings, { weekStart: 3, missRules: false })
})
