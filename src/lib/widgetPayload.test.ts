import test from 'node:test'
import assert from 'node:assert/strict'
import { widgetPayload } from './widgetPayload.ts'
import { normalize } from '../domain/records.ts'

test('payload v3 carries kinds, day facts and the week start', () => {
  const doc = normalize({ habits: [
    { id: 'h', name: 'Run', marks: { '2026-11-24': 't' } },
    { id: 'r', name: 'Phone', kind: 'reduce', budget: 5, timerMin: 15, marks: {}, urges: { '2026-11-24': 2 }, slips: { '2026-11-24': 1 }, reasons: { x: 'y' } },
    { id: 'n', name: 'Pages', kind: 'number', target: 70, unit: 'pages', later: true, marks: {}, values: { '2026-11-24': 12 } },
  ], settings: { weekStart: 1, missRules: true }, theme: 'dark' }, null)
  const p = JSON.parse(widgetPayload(doc, new Date(2026, 10, 24)))
  assert.equal(p.v, 3)
  assert.equal(p.weekStart, 1)
  assert.equal(p.theme, 'dark')
  assert.deepEqual(p.habits[0], { id: 'h', name: 'Run', kind: 'daily', marks: { '2026-11-24': 't' } })
  assert.deepEqual(p.habits[1], { id: 'r', name: 'Phone', kind: 'reduce', budget: 5, timerMin: 15, marks: {}, urges: { '2026-11-24': 2 }, slips: { '2026-11-24': 1 } })
  assert.deepEqual(p.habits[2], { id: 'n', name: 'Pages', kind: 'number', target: 70, unit: 'pages', later: true, marks: {}, values: { '2026-11-24': 12 } })
  assert.equal(p.hol['2026-11-24'], 'Guru Nanak Jayanti')
})
