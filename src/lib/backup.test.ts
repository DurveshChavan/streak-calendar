import test from 'node:test'
import assert from 'node:assert/strict'
import { makeBackup, parseBackup, mergeBackup, countOf } from './backup.ts'

const v1 = { habits: [{ id: 'h1', name: 'Run', marks: { '2026-11-01': 't', '2026-11-02': 'x', bad: 't', '2026-11-03': 'z' } }, { id: 'hk', name: 'Read', marks: { '2026-11-02': 't' } }], cur: 'h1', notes: { '2026-11-01': '5k' }, theme: 'light' }

test('reads the raw 1.0 local data and drops invalid marks', () => {
  const p = parseBackup(JSON.stringify(v1))!
  assert.deepEqual(countOf(p), { habits: 2, marks: 3, notes: 1 })
})
test('reads a 2.0 backup and a double-encoded string', () => {
  const doc: any = { ...v1, habits: [{ id: 'h1', name: 'Run', marks: { '2026-11-01': 't' } }] }
  assert.equal(parseBackup(makeBackup(doc))!.habits[0].name, 'Run')
  assert.equal(parseBackup(JSON.stringify(JSON.stringify(v1)))!.habits.length, 2)
})
test('rejects text that is not a backup', () => {
  for (const t of ['', 'hello', '{}', '{"habits":[]}', '[1,2]']) assert.equal(parseBackup(t), null, t)
})
test('merge keeps everything already on the device', () => {
  const cur: any = { habits: [{ id: 'h1', name: 'Habit 1', marks: { '2026-11-05': 't', '2026-11-02': 't' } }, { id: 'new', name: 'Gym', marks: {} }], cur: 'new', notes: { '2026-11-05': 'hi' }, theme: 'dark' }
  const m = mergeBackup(cur, parseBackup(JSON.stringify(v1))!)
  assert.deepEqual(m.habits.map(h => h.id), ['h1', 'new', 'hk'])
  assert.equal(m.habits[0].name, 'Run')
  assert.deepEqual(m.habits[0].marks, { '2026-11-05': 't', '2026-11-02': 'x', '2026-11-01': 't' })
  assert.deepEqual(m.notes, { '2026-11-05': 'hi', '2026-11-01': '5k' })
  assert.equal(m.cur, 'new'); assert.equal(m.theme, 'dark')
})

const v31: any = {
  habits: [
    { id: 'h1', name: 'Run', marks: { '2026-11-02': 'x' }, reasons: { '2026-11-02': 'rain', bad: 'x' } },
    { id: 'r1', name: 'Phone', kind: 'reduce', budget: 5, replacement: 'walk', marks: {}, urges: { '2026-11-03': 4, '2026-11-04': -2 }, slips: { '2026-11-03': 1 } },
    { id: 'n1', name: 'Pages', kind: 'number', target: 70, unit: 'pages', later: true, marks: {}, values: { '2026-11-03': 12.5, '2026-11-04': 'a' } },
    { id: 'w1', name: 'Speak', kind: 'weekly', goal: 3, marks: {}, junk: 1 },
  ],
  avoid: [{ id: 'a1', name: 'Sugar', replacement: 'fruit' }, { id: '', name: 'x', replacement: '' }],
  settings: { weekStart: 1, missRules: false },
  cur: 'h1', notes: {}, theme: 'light',
}

test('a 3.1 backup keeps kinds, day facts, avoid items and settings', () => {
  const p = parseBackup(makeBackup(v31))!
  assert.deepEqual(p.habits[0].reasons, { '2026-11-02': 'rain' })
  assert.deepEqual(p.habits[1], { id: 'r1', name: 'Phone', kind: 'reduce', budget: 5, replacement: 'walk', marks: {}, urges: { '2026-11-03': 4 }, slips: { '2026-11-03': 1 } })
  assert.deepEqual(p.habits[2], { id: 'n1', name: 'Pages', kind: 'number', target: 70, unit: 'pages', later: true, marks: {}, values: { '2026-11-03': 12.5 } })
  assert.deepEqual(p.habits[3], { id: 'w1', name: 'Speak', kind: 'weekly', goal: 3, marks: {} })
  assert.deepEqual(p.avoid, [{ id: 'a1', name: 'Sugar', replacement: 'fruit' }])
  assert.deepEqual(p.settings, { weekStart: 1, missRules: false })
  assert.equal(JSON.parse(makeBackup(v31)).version, 3)
})
test('merge combines day facts and adds avoid items', () => {
  const cur: any = { habits: [{ id: 'r1', name: 'Phone', kind: 'reduce', marks: {}, urges: { '2026-11-01': 2 } }], avoid: [], settings: { weekStart: 0, missRules: true }, cur: 'r1', notes: {}, theme: 'light' }
  const m = mergeBackup(cur, parseBackup(makeBackup(v31))!)
  assert.deepEqual(m.habits[0].urges, { '2026-11-01': 2, '2026-11-03': 4 })
  assert.equal(m.habits[0].budget, 5)
  assert.deepEqual(m.avoid.map(a => a.id), ['a1'])
  assert.deepEqual(m.settings, { weekStart: 0, missRules: true })
})
test('restore keeps the device kind unless the switch is daily or weekly (E1)', () => {
  const cur: any = { habits: [{ id: 'h1', name: 'Run', marks: { '2026-11-01': 't' } }], avoid: [], settings: { weekStart: 0, missRules: true }, cur: 'h1', notes: {}, theme: 'light' }
  const toReduce = parseBackup(JSON.stringify({ habits: [{ id: 'h1', name: 'Run', kind: 'reduce', marks: {} }] }))!
  assert.equal(mergeBackup(cur, toReduce).habits[0].kind, undefined)
  const toWeekly = parseBackup(JSON.stringify({ habits: [{ id: 'h1', name: 'Run', kind: 'weekly', goal: 3, marks: {} }] }))!
  assert.equal(mergeBackup(cur, toWeekly).habits[0].kind, 'weekly')
})
