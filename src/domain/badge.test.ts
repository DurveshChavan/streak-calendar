import test from 'node:test'
import assert from 'node:assert/strict'
import { badge } from './badge.ts'

const today = '2026-11-25'
test('build daily: total big, day streak small', () => {
  assert.deepEqual(badge({ id: 'a', name: 'Run', marks: { '2026-11-24': 't', '2026-11-25': 't', '2026-11-20': 't' } }, today, 0), { total: 3, sub: 'streak 3' })
})
test('build weekly: week streak', () => {
  assert.deepEqual(badge({ id: 'w', name: 'Speak', kind: 'weekly', goal: 1, marks: { '2026-11-24': 't' } }, today, 0), { total: 1, sub: '1 wk streak' })
})
test('reduce: urges resisted', () => {
  assert.deepEqual(badge({ id: 'r', name: 'Phone', kind: 'reduce', marks: {}, urges: { '2026-11-25': 4 } }, today, 0), { total: 4, sub: 'urges resisted' })
})
test('number: total with unit', () => {
  assert.deepEqual(badge({ id: 'n', name: 'Pages', kind: 'number', unit: 'pages', marks: {}, values: { '2026-11-25': 12 } }, today, 0), { total: 12, sub: 'pages in total' })
  assert.deepEqual(badge({ id: 'n', name: 'Pages', kind: 'number', marks: {}, values: {} }, today, 0), { total: 0, sub: 'in total' })
})
