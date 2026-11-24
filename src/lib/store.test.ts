import test from 'node:test'
import assert from 'node:assert/strict'

const mem: Record<string, string> = {}
const g = globalThis as any
g.localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v } }
g.window = { addEventListener() {} }
g.document = { addEventListener() {}, visibilityState: 'visible' }
const calls: { url: string; body?: any }[] = []
let protocol: number | undefined = 3
g.fetch = async (url: string, init?: any) => {
  calls.push({ url, body: init?.body ? JSON.parse(init.body) : undefined })
  if (url.endsWith('/api/health')) return { ok: true, status: 200, json: async () => (protocol ? { ok: true, protocol } : { ok: true }) }
  return { ok: true, status: 200, json: async () => ({ seq: 1, more: false, changes: [] }) }
}
const { store } = await import('./store.ts')
const settled = async () => { for (let i = 0; i < 50 && store.state === 'syncing'; i++) await new Promise(r => setTimeout(r, 1)) }

test('sends protocol 3 with every sync request', async () => {
  calls.length = 0; protocol = 3
  store.configure('http://s', 'token-0123456789abcdef')
  await settled()
  const sync = calls.find(c => c.url.endsWith('/api/sync'))!
  assert.equal(sync.body.v, 3)
  assert.equal(store.state, 'idle')
})
test('does not push to a server older than protocol 3', async () => {
  calls.length = 0; protocol = undefined
  store.configure('http://old', 'token-0123456789abcdef')
  await settled()
  assert.equal(calls.some(c => c.url.endsWith('/api/sync')), false)
  assert.equal(store.state, 'server')
})
