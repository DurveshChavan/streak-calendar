import test from 'node:test'
import assert from 'node:assert/strict'
import { restartPrompts, twoMissAfter } from './rules.ts'
import { normalize } from './records.ts'

const mk = (habits: any[], missRules = true) => normalize({ habits, settings: { weekStart: 0, missRules } }, null)

test('restart prompt after a missed day when today is blank (E7)', () => {
  const d = mk([{ id: 'a', name: 'A', marks: { '2026-11-24': 'x' } }, { id: 'b', name: 'B', marks: { '2026-11-24': 'x', '2026-11-25': 't' } }, { id: 'c', name: 'C', marks: {} }])
  assert.deepEqual(restartPrompts(d, '2026-11-25'), [{ kind: 'restart', habit: 'a' }])
})
test('no restart prompt after a blank day, for weekly or later habits, or when rules are off', () => {
  assert.deepEqual(restartPrompts(mk([{ id: 'w', name: 'W', kind: 'weekly', goal: 2, marks: { '2026-11-24': 'x' } }, { id: 'l', name: 'L', later: true, marks: { '2026-11-24': 'x' } }]), '2026-11-25'), [])
  assert.deepEqual(restartPrompts(mk([{ id: 'a', name: 'A', marks: { '2026-11-24': 'x' } }], false), '2026-11-25'), [])
})
test('two-miss check after the second consecutive miss, with both reasons (E6)', () => {
  const d = mk([{ id: 'a', name: 'A', marks: { '2026-11-24': 'x', '2026-11-25': 'x' }, reasons: { '2026-11-24': 'tired' } }])
  assert.deepEqual(twoMissAfter(d, 'a', '2026-11-25'), { kind: 'twoMiss', habit: 'a', days: ['2026-11-24', '2026-11-25'], reasons: ['tired', ''] })
  assert.deepEqual(twoMissAfter(d, 'a', '2026-11-24'), { kind: 'twoMiss', habit: 'a', days: ['2026-11-24', '2026-11-25'], reasons: ['tired', ''] })
})
test('a blank day between two misses is not in a row', () => {
  const d = mk([{ id: 'a', name: 'A', marks: { '2026-11-23': 'x', '2026-11-25': 'x' } }])
  assert.equal(twoMissAfter(d, 'a', '2026-11-25'), null)
})
test('no two-miss check for weekly habits or when rules are off', () => {
  assert.equal(twoMissAfter(mk([{ id: 'w', name: 'W', kind: 'weekly', goal: 2, marks: { '2026-11-24': 'x', '2026-11-25': 'x' } }]), 'w', '2026-11-25'), null)
  assert.equal(twoMissAfter(mk([{ id: 'a', name: 'A', marks: { '2026-11-24': 'x', '2026-11-25': 'x' } }], false), 'a', '2026-11-25'), null)
})
