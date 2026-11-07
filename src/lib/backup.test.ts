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
