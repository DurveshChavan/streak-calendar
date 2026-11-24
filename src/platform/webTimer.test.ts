import test from 'node:test'
import assert from 'node:assert/strict'
import { WebTimerPort } from './webTimer.ts'

function setup(start = 1_000_000) {
  const mem: Record<string, string> = {}
  let now = start
  const port = new WebTimerPort({ getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v } }, () => now)
  return { port, mem, tick: (ms: number) => { now += ms } }
}

test('start runs one timer; a second start is refused (R-T3)', async () => {
  const { port } = setup()
  const t = await port.start({ habitId: 'h', kind: 'start', minutes: 5 })
  assert.equal(t.endsAt - t.startedAt, 300000)
  assert.deepEqual(await port.current(), t)
  await assert.rejects(port.start({ habitId: 'r', kind: 'delay', minutes: 20 }), /busy/)
})
test('cancel counts nothing (R-T2)', async () => {
  const { port, tick } = setup()
  await port.start({ habitId: 'h', kind: 'start', minutes: 5 })
  await port.cancel(); tick(600000)
  assert.deepEqual(await port.drain(), [])
  assert.equal(await port.current(), null)
})
test('an ended timer is drained exactly once', async () => {
  const { port, tick } = setup()
  const t = await port.start({ habitId: 'h', kind: 'start', minutes: 5 })
  tick(299999); assert.deepEqual(await port.drain(), [])
  tick(1); assert.equal(await port.current(), null)
  assert.deepEqual(await port.drain(), [t])
  assert.deepEqual(await port.drain(), [])
})
test('state survives a reload of the port (R-T5)', async () => {
  const { port, mem, tick } = setup()
  const t = await port.start({ habitId: 'h', kind: 'start', minutes: 5 })
  tick(400000)
  const again = new WebTimerPort({ getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v } }, () => t.startedAt + 400000)
  assert.deepEqual(await again.drain(), [t])
})
