import test from 'node:test'
import assert from 'node:assert/strict'
import { fromForm, toForm, kindChoices } from './habitForm.ts'

const base = { name: '', kind: 'daily' as const, goal: '', budget: '', target: '', unit: '', timerMin: '', replacement: '' }

test('a daily habit needs only a name', () => {
  assert.deepEqual(fromForm({ ...base, name: '  Run  ' }, 'id1'), { habit: { id: 'id1', name: 'Run', marks: {} } })
  assert.deepEqual(fromForm(base, 'id1'), { error: 'Give the habit a name.' })
})
test('a weekly habit needs a goal from 1 to 7', () => {
  assert.deepEqual(fromForm({ ...base, name: 'Speak', kind: 'weekly', goal: '3' }, 'w').habit, { id: 'w', name: 'Speak', kind: 'weekly', goal: 3, marks: {} })
  assert.equal(fromForm({ ...base, name: 'Speak', kind: 'weekly', goal: '9' }, 'w').error, 'Pick a goal from 1 to 7 days a week.')
})
test('a reduce habit has an optional budget and a replacement', () => {
  assert.deepEqual(fromForm({ ...base, name: 'Phone', kind: 'reduce', budget: '5', replacement: ' walk ' }, 'r').habit, { id: 'r', name: 'Phone', kind: 'reduce', budget: 5, replacement: 'walk', marks: {} })
  assert.deepEqual(fromForm({ ...base, name: 'Phone', kind: 'reduce' }, 'r').habit, { id: 'r', name: 'Phone', kind: 'reduce', marks: {} })
  assert.equal(fromForm({ ...base, name: 'Phone', kind: 'reduce', budget: '0' }, 'r').error, 'The budget is a whole number, 1 or more, or empty.')
})
test('a number habit has an optional target and unit', () => {
  assert.deepEqual(fromForm({ ...base, name: 'Pages', kind: 'number', target: '70', unit: 'pages' }, 'n').habit, { id: 'n', name: 'Pages', kind: 'number', target: 70, unit: 'pages', marks: {} })
})
test('timer length is kept only when it differs from the default', () => {
  assert.equal(fromForm({ ...base, name: 'Run', timerMin: '5' }, 'a').habit!.timerMin, undefined)
  assert.equal(fromForm({ ...base, name: 'Run', timerMin: '10' }, 'a').habit!.timerMin, 10)
  assert.equal(fromForm({ ...base, name: 'Run', timerMin: '0' }, 'a').error, 'The timer is 1 to 120 minutes.')
})
test('editing keeps the day data of the old habit', () => {
  const old = { id: 'r', name: 'Phone', kind: 'reduce' as const, marks: {}, urges: { '2026-11-25': 3 }, later: true }
  assert.deepEqual(fromForm({ ...toForm(old), name: 'Phone use' }, 'r', old).habit, { id: 'r', name: 'Phone use', kind: 'reduce', marks: {}, urges: { '2026-11-25': 3 }, later: true })
})
test('kind choices follow E1 when editing', () => {
  assert.deepEqual(kindChoices(undefined), ['daily', 'weekly', 'reduce', 'number'])
  assert.deepEqual(kindChoices({ id: 'a', name: 'A', marks: {} }), ['daily', 'weekly'])
  assert.deepEqual(kindChoices({ id: 'a', name: 'A', kind: 'number', marks: {} }), ['number'])
})
