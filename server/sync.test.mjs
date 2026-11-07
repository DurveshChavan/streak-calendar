import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { createApp } from './app.mjs'

const TOKEN = 'test-token-0123456789'
async function boot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-'))
  const srv = createApp({ dbFile: path.join(dir, 'db'), token: TOKEN, webRoot: null })
  await new Promise(r => srv.listen(0, r))
  const base = 'http://127.0.0.1:' + srv.address().port
  const post = (body, token = TOKEN) => fetch(base + '/api/sync', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return { srv, base, post }
}

test('rejects bad token', async () => {
  const { srv, post } = await boot()
  assert.equal((await post({}, 'nope')).status, 401); srv.close()
})
test('two devices converge, newest timestamp wins, deletes propagate', async () => {
  const { srv, post } = await boot()
  const a = await (await post({ since: 0, changes: [{ key: 'mark:h1:2026-11-06', value: 't', ts: 100 }, { key: 'habit:h1', value: { name: 'Run', order: 0 }, ts: 100 }] })).json()
  assert.equal(a.changes.length, 2)
  // device B pushes an older edit (ignored) and a newer one
  const b = await (await post({ since: 0, changes: [{ key: 'mark:h1:2026-11-06', value: 'x', ts: 50 }, { key: 'note:2026-11-06', value: 'hi', ts: 120 }] })).json()
  assert.equal(b.changes.find(c => c.key === 'mark:h1:2026-11-06').value, 't')
  assert.equal(b.changes.find(c => c.key === 'note:2026-11-06').value, 'hi')
  const del = await (await post({ since: b.seq, changes: [{ key: 'mark:h1:2026-11-06', value: null, ts: 200 }] })).json()
  assert.deepEqual(del.changes, [{ key: 'mark:h1:2026-11-06', value: null, ts: 200 }])
  const none = await (await post({ since: del.seq })).json()
  assert.equal(none.changes.length, 0); srv.close()
})
test('ignores invalid keys', async () => {
  const { srv, post } = await boot()
  const r = await (await post({ since: 0, changes: [{ key: '../etc', value: 1, ts: 1 }, { key: 'evil', value: 1, ts: 1 }] })).json()
  assert.equal(r.changes.length, 0); srv.close()
})
