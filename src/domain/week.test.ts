import test from 'node:test'
import assert from 'node:assert/strict'
import { weekOf, weekDays, lastWeeks, isLastDayOfWeek } from './week.ts'

test('week start follows the setting for every weekday', () => {
  const wed = '2026-11-25'
  const want = ['2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-19', '2026-11-20', '2026-11-21']
  for (let ws = 0; ws <= 6; ws++) assert.equal(weekOf(wed, ws as any), want[ws], 'ws ' + ws)
})
test('weeks cross month and year boundaries', () => {
  assert.equal(weekOf('2027-01-01', 0), '2026-12-27')
  assert.equal(weekOf('2026-03-01', 1), '2026-02-23')
  assert.deepEqual(weekDays('2026-12-27'), ['2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
})
test('last weeks are week starts, oldest first, ending with this week', () => {
  assert.deepEqual(lastWeeks('2026-11-24', 0, 3), ['2026-11-08', '2026-11-15', '2026-11-22'])
})
test('the last day of the week is the day before the week start', () => {
  assert.equal(isLastDayOfWeek('2026-11-28', 0), true)
  assert.equal(isLastDayOfWeek('2026-11-29', 1), true)
  assert.equal(isLastDayOfWeek('2026-11-28', 1), false)
})
