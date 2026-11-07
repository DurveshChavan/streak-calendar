import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR || path.join(here, 'data')
fs.mkdirSync(dataDir, { recursive: true })
const token = process.env.SYNC_TOKEN
if (!token || token.length < 16) {
  console.error('Set SYNC_TOKEN to a secret of 16+ characters, e.g.\n  SYNC_TOKEN=$(openssl rand -hex 24) npm run server')
  process.exit(1)
}
const port = Number(process.env.PORT) || 8787
createApp({ dbFile: path.join(dataDir, 'streaks.db'), token, webRoot: path.resolve(here, '..', 'dist') })
  .listen(port, () => console.log(`Streak Calendar listening on :${port}  (db: ${dataDir}/streaks.db)`))
