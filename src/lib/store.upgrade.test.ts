import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../../server/app.mjs'

const token = 'token-0123456789abcdef'
const srv = createApp({ dbFile: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-')), 'db'), token, webRoot: null })
await new Promise<void>(r => srv.listen(0, () => r()))
const url = 'http://127.0.0.1:' + (srv.address() as any).port
const realFetch = globalThis.fetch
const post = (body: any) => realFetch(url + '/api/sync', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ v: 3, ...body }) }).then(r => r.json())

const doc = { habits: [{ id: 'h1', name: 'Workout', marks: { '2026-11-20': 't' } }], cur: 'h1', notes: {}, theme: 'light' }
const flat2 = { 'habit:h1': { name: 'Workout', order: 0 }, 'mark:h1:2026-11-20': 't' }
const t0 = Date.now() - 86400000
await post({ since: 0, changes: Object.entries(flat2).map(([key, value]) => ({ key, value, ts: t0 })) })
const seq = (await post({ since: 0, changes: [] })).seq

const mem: Record<string, string> = {
  'streakcal.v2': JSON.stringify(doc),
  'streakcal.sync': JSON.stringify({ url, token, seq, ts: { 'habit:h1': t0, 'mark:h1:2026-11-20': t0 }, flat: flat2, dirty: [] }),
}
const g = globalThis as any
g.localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v } }
g.window = { addEventListener() {} }
g.document = { addEventListener() {}, visibilityState: 'visible' }
let online = false
g.fetch = (u: string, i?: any) => online ? realFetch(u, i) : Promise.reject(new TypeError('offline'))

test('a phone upgraded from 2.0 does not overwrite settings another phone chose', async () => {
  await post({ since: 0, changes: [{ key: 'set:weekStart', value: 1, ts: Date.now() }] })
  const { store } = await import('./store.ts')
  const d = JSON.parse(JSON.stringify(store.doc)); d.habits[0].marks['2026-11-24'] = 't'
  store.commit(d, true)
  online = true
  await store.syncNow()
  const rows = (await post({ since: 0, changes: [] })).changes
  assert.equal(rows.find((c: any) => c.key === 'set:weekStart').value, 1)
  assert.equal(rows.find((c: any) => c.key === 'mark:h1:2026-11-24').value, 't')
  assert.equal(store.doc.settings.weekStart, 1)
  srv.close()
})
