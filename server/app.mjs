// Streak Calendar sync server: one shared SQLite DB, per-record last-write-wins, also serves the web build.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const KEY_RE = /^(habit|mark|note):[A-Za-z0-9_:.-]{1,100}$/
const MAX_BODY = 5 * 1024 * 1024
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.map': 'application/json' }

export function createApp({ dbFile, token, webRoot }) {
  if (!token || token.length < 16) throw new Error('SYNC_TOKEN must be set (16+ chars)')
  const db = new DatabaseSync(dbFile)
  db.exec('PRAGMA journal_mode=WAL')
  db.exec('CREATE TABLE IF NOT EXISTS records (key TEXT PRIMARY KEY, value TEXT, ts INTEGER NOT NULL, seq INTEGER NOT NULL)')
  db.exec('CREATE INDEX IF NOT EXISTS records_seq ON records(seq)')
  const getRow = db.prepare('SELECT ts FROM records WHERE key = ?')
  const upsert = db.prepare('INSERT INTO records (key, value, ts, seq) VALUES (?, ?, ?, (SELECT COALESCE(MAX(seq),0)+1 FROM records)) ON CONFLICT(key) DO UPDATE SET value=excluded.value, ts=excluded.ts, seq=excluded.seq')
  const since = db.prepare('SELECT key, value, ts, seq FROM records WHERE seq > ? ORDER BY seq LIMIT 5000')
  const maxSeq = db.prepare('SELECT COALESCE(MAX(seq),0) AS s FROM records')
  const want = Buffer.from(token)

  const authed = req => {
    const h = req.headers.authorization || ''
    const got = Buffer.from(h.startsWith('Bearer ') ? h.slice(7) : '')
    return got.length === want.length && crypto.timingSafeEqual(got, want)
  }
  const send = (res, code, body, headers = {}) => {
    res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers })
    res.end(JSON.stringify(body))
  }
  const readBody = req => new Promise((resolve, reject) => {
    let n = 0; const chunks = []
    req.on('data', c => { n += c.length; if (n > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy() } else chunks.push(c) })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

  function sync(body) {
    const sinceSeq = Number.isInteger(body.since) && body.since >= 0 ? body.since : 0
    const changes = Array.isArray(body.changes) ? body.changes : []
    db.exec('BEGIN IMMEDIATE')
    try {
      for (const c of changes) {
        if (!c || typeof c.key !== 'string' || !KEY_RE.test(c.key) || !Number.isFinite(c.ts)) continue
        const value = c.value === null || c.value === undefined ? null : JSON.stringify(c.value)
        if (value && value.length > 20000) continue
        const cur = getRow.get(c.key)
        if (cur && cur.ts > c.ts) continue // server copy is newer: it wins and is sent back below
        upsert.run(c.key, value, Math.floor(c.ts))
      }
      db.exec('COMMIT')
    } catch (e) { db.exec('ROLLBACK'); throw e }
    const rows = since.all(sinceSeq)
    const seq = rows.length ? rows[rows.length - 1].seq : Math.max(sinceSeq, maxSeq.get().s)
    return { seq, more: rows.length === 5000, changes: rows.map(r => ({ key: r.key, value: r.value === null ? null : JSON.parse(r.value), ts: r.ts })) }
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-max-age': '86400' }
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end() }
      if (url.pathname === '/api/health') return send(res, 200, { ok: true }, cors)
      if (url.pathname === '/api/sync') {
        if (req.method !== 'POST') return send(res, 405, { error: 'method' }, cors)
        if (!authed(req)) return send(res, 401, { error: 'unauthorized' }, cors)
        let body; try { body = JSON.parse(await readBody(req) || '{}') } catch (e) { if (e.code === 413) return send(res, 413, { error: 'too large' }, cors); return send(res, 400, { error: 'bad json' }, cors) }
        return send(res, 200, sync(body), cors)
      }
      if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' }, cors)
      if (!webRoot || !fs.existsSync(webRoot)) return send(res, 404, { error: 'web build not found; run npm run build' })
      let f = path.join(webRoot, path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''))
      if (!f.startsWith(webRoot)) { res.writeHead(403); return res.end() }
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(webRoot, 'index.html')
      const ext = path.extname(f)
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': f.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' })
      fs.createReadStream(f).pipe(res)
    } catch (e) { console.error(e); if (!res.headersSent) send(res, 500, { error: 'server' }, cors) }
  })
  server.on('close', () => db.close())
  return server
}
