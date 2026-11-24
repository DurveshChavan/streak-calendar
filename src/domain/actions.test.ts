import test from 'node:test'
import assert from 'node:assert/strict'
import { setMark, setReason, addUrge, addSlip, setValue, upsertHabit, setLater, upsertAvoid, removeAvoid, setSettings } from './actions.ts'
import { normalize } from './records.ts'
import type { Doc } from './types.ts'

const D = '2026-11-25'
const doc = (): Doc => normalize({ habits: [
  { id: 'h', name: 'Run', marks: {} },
  { id: 'w', name: 'Speak', kind: 'weekly', goal: 2, marks: {} },
  { id: 'r', name: 'Phone', kind: 'reduce', budget: 3, marks: {} },
  { id: 'n', name: 'Pages', kind: 'number', marks: {} },
] }, null)

test('setMark sets and clears a mark without touching the input', () => {
  const d0 = doc(), d1 = setMark(d0, 'h', D, 'x')
  assert.equal(d1.habits[0].marks[D], 'x')
  assert.deepEqual(d0.habits[0].marks, {})
  assert.equal(D in setMark(d1, 'h', D, null).habits[0].marks, false)
})
test('a reason is kept when the mark leaves x', () => {
  let d = setMark(doc(), 'h', D, 'x')
  d = setReason(d, 'h', D, 'rain')
  d = setMark(d, 'h', D, 't')
  assert.equal(d.habits[0].reasons![D], 'rain')
})
test('an empty reason is removed', () => {
  const d = setReason(setReason(doc(), 'h', D, 'rain'), 'h', D, '  ')
  assert.equal(D in (d.habits[0].reasons || {}), false)
})
test('urges and slips count up and never go below zero', () => {
  let d = addUrge(addUrge(doc(), 'r', D, 1), 'r', D, 1)
  assert.equal(d.habits[2].urges![D], 2)
  d = addUrge(addUrge(addUrge(d, 'r', D, -1), 'r', D, -1), 'r', D, -1)
  assert.equal(D in d.habits[2].urges!, false)
  assert.equal(addSlip(doc(), 'r', D, 1).habits[2].slips![D], 1)
})
test('slips need a budget', () => {
  const d = upsertHabit(doc(), { ...doc().habits[2], budget: undefined })
  assert.equal(addSlip(d, 'r', D, 1).habits[2].slips?.[D], undefined)
})
test('setValue sets and clears a number value', () => {
  const d = setValue(doc(), 'n', D, 12.5)
  assert.equal(d.habits[3].values![D], 12.5)
  assert.equal(D in setValue(d, 'n', D, null).habits[3].values!, false)
})
test('kind can switch between daily and weekly only (E1)', () => {
  const d = doc()
  assert.equal(upsertHabit(d, { ...d.habits[0], kind: 'weekly', goal: 3 }).habits[0].kind, 'weekly')
  assert.equal(upsertHabit(d, { ...d.habits[0], kind: 'reduce' }).habits[0].kind, undefined)
  assert.equal(upsertHabit(d, { ...d.habits[2], kind: 'daily' }).habits[2].kind, 'reduce')
})
test('upsertHabit adds a new habit at the end', () => {
  const d = upsertHabit(doc(), { id: 'x', name: 'New', kind: 'number', marks: {} })
  assert.deepEqual(d.habits.map(h => h.id), ['h', 'w', 'r', 'n', 'x'])
})
test('later moves a habit out and back', () => {
  const d = setLater(doc(), 'h', true)
  assert.equal(d.habits[0].later, true)
  assert.equal(setLater(d, 'h', false).habits[0].later, undefined)
})
test('avoid items are added, edited and removed', () => {
  let d = upsertAvoid(doc(), { id: 'a', name: 'Sugar', replacement: 'fruit' })
  d = upsertAvoid(d, { id: 'a', name: 'Sugar', replacement: 'water' })
  assert.deepEqual(d.avoid, [{ id: 'a', name: 'Sugar', replacement: 'water' }])
  assert.deepEqual(removeAvoid(d, 'a').avoid, [])
})
test('settings merge', () => {
  assert.deepEqual(setSettings(doc(), { weekStart: 1 }).settings, { weekStart: 1, missRules: true })
})
