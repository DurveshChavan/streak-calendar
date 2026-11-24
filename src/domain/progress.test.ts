import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { total, thisWeek, trend, streak } from './progress.ts'
import { dailyScore } from './score.ts'
import { normalize } from './records.ts'

const dir = path.join(import.meta.dirname, '../../tests/fixtures/rules')
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  if (fx.habit) test(f + ': ' + fx.name, () => {
    assert.equal(total(fx.habit, fx.today), fx.expect.total)
    assert.deepEqual(thisWeek(fx.habit, fx.today, fx.weekStart), fx.expect.thisWeek)
    assert.deepEqual(streak(fx.habit, fx.today, fx.weekStart), fx.expect.streak)
  })
  else test(f + ': ' + fx.name, () => {
    assert.deepEqual(dailyScore(normalize({ habits: fx.habits }, null), fx.day), fx.expect)
  })
}

test('no score when there is no active build daily habit', () => {
  assert.equal(dailyScore(normalize({ habits: [{ id: 'w', name: 'W', kind: 'weekly', goal: 1, marks: {} }] }, null), '2026-11-25'), null)
})
test('trend gives 8 weeks, oldest first, ending with this week', () => {
  const h: any = { id: 'w', name: 'W', kind: 'weekly', goal: 1, marks: { '2026-11-24': 't', '2026-10-06': 't' } }
  const t = trend(h, '2026-11-25', 0)
  assert.equal(t.length, 8)
  assert.equal(t[0].first, '2026-10-04')
  assert.equal(t[7].first, '2026-11-22')
  assert.deepEqual(t.map(w => w.amount), [1, 0, 0, 0, 0, 0, 0, 1])
})
test('a week start change moves days between weeks', () => {
  const h: any = { id: 'h', name: 'H', marks: { '2026-11-22': 't', '2026-11-23': 't' } }
  assert.equal(thisWeek(h, '2026-11-24', 0).amount, 2)
  assert.equal(thisWeek(h, '2026-11-24', 1).amount, 1)
})
