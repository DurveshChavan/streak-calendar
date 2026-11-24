import { pushWidget } from './widget.ts'
import { normalize, flatten, rebuild, PROTOCOL, type Flat } from '../domain/records.ts'
import type { Doc } from '../domain/types.ts'
export type { Doc, Habit } from '../domain/types.ts'

const STORE = 'streakcal.v1', STORE2 = 'streakcal.v2', SYNC = 'streakcal.sync'

export function loadDoc(): Doc {
  const read = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
  return normalize(read(STORE2), read(STORE))
}

interface SyncMeta { url: string; token: string; seq: number; ts: Record<string, number>; flat: Flat; dirty: string[] }
const emptyMeta = (): SyncMeta => ({ url: '', token: '', seq: 0, ts: {}, flat: {}, dirty: [] })
export type SyncState = 'off' | 'idle' | 'syncing' | 'error' | 'offline' | 'auth' | 'server'

class Store {
  doc: Doc = loadDoc()
  meta: SyncMeta = emptyMeta()
  state: SyncState = 'off'
  lastSync = 0
  private remoteCb: ((d: Doc) => void) | null = null
  private statusCb: (() => void) | null = null
  private timer: any; private poll: any; private busy = false; private again = false; private checked = ''

  constructor() {
    try { Object.assign(this.meta, JSON.parse(localStorage.getItem(SYNC) || '{}')) } catch { /* ignore */ }
    if (!Object.keys(this.meta.flat).length) {
      const d = this.doc, pristine = d.habits.length === 1 && d.habits[0].id === 'h1' && d.habits[0].name === 'Habit 1' && !Object.keys(d.habits[0].marks).length && !Object.keys(d.notes).length
      this.commit(d, true, pristine ? 0 : undefined)
    }
    this.state = this.enabled ? 'idle' : 'off'
    pushWidget(this.doc)
  }
  get enabled() { return !!(this.meta.url && this.meta.token) }
  onRemote(cb: (d: Doc) => void) { this.remoteCb = cb }
  onStatus(cb: () => void) { this.statusCb = cb }
  private setState(s: SyncState) { this.state = s; this.statusCb?.() }
  private saveMeta() { try { localStorage.setItem(SYNC, JSON.stringify(this.meta)) } catch { /* ignore */ } }

  commit(doc: Doc, silent = false, stamp?: number) {
    this.doc = doc
    try { localStorage.setItem(STORE2, JSON.stringify(doc)) } catch { /* ignore */ }
    const next = flatten(doc), prev = this.meta.flat, now = stamp ?? Date.now(), dirty = new Set(this.meta.dirty)
    for (const k of Object.keys(next)) if (JSON.stringify(next[k]) !== JSON.stringify(prev[k])) { this.meta.ts[k] = now; dirty.add(k) }
    for (const k of Object.keys(prev)) if (!(k in next) && prev[k] != null) { this.meta.ts[k] = now; dirty.add(k); next[k] = null }
    this.meta.flat = next; this.meta.dirty = [...dirty]; this.saveMeta()
    if (!silent) { pushWidget(doc); this.schedule(700) }
  }

  configure(url: string, token: string) {
    this.meta.url = url.trim().replace(/\/+$/, ''); this.meta.token = token.trim()
    if (this.meta.url !== (JSON.parse(localStorage.getItem(SYNC) || '{}').url || '')) this.meta.seq = 0
    this.meta.dirty = Object.keys(this.meta.flat); this.saveMeta()
    this.setState(this.enabled ? 'idle' : 'off')
    if (this.enabled) this.syncNow(); else { clearInterval(this.poll) }
  }
  disconnect() { this.meta.url = ''; this.meta.token = ''; this.saveMeta(); clearInterval(this.poll); this.setState('off') }

  start() {
    window.addEventListener('online', () => this.schedule(200))
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.schedule(200) })
    this.poll = setInterval(() => { if (document.visibilityState === 'visible') this.syncNow() }, 30000)
    this.schedule(300)
  }
  private schedule(ms: number) { if (!this.enabled) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.syncNow(), ms) }

  async syncNow() {
    if (!this.enabled) return
    if (this.busy) { this.again = true; return }
    this.busy = true; this.setState('syncing')
    try {
      if (this.checked !== this.meta.url) {
        const h = await fetch(this.meta.url + '/api/health').then(r => r.json())
        if (!(h.protocol >= PROTOCOL)) { this.setState('server'); return }
        this.checked = this.meta.url
      }
      let more = true
      while (more) {
        const sent = [...this.meta.dirty]
        const changes = sent.map(k => ({ key: k, value: this.meta.flat[k] ?? null, ts: this.meta.ts[k] ?? Date.now() }))
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000)
        const r = await fetch(this.meta.url + '/api/sync', { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + this.meta.token }, body: JSON.stringify({ v: PROTOCOL, since: this.meta.seq, changes }) }).finally(() => clearTimeout(to))
        if (r.status === 401) { this.setState('auth'); return }
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const res = await r.json()
        const sentSet = new Set(sent)
        this.meta.dirty = this.meta.dirty.filter(k => !sentSet.has(k) || JSON.stringify(this.meta.flat[k] ?? null) !== JSON.stringify(changes.find(c => c.key === k)!.value))
        let changed = false
        for (const c of res.changes as { key: string; value: any; ts: number }[]) {
          const local = this.meta.ts[c.key] || 0
          if (this.meta.dirty.includes(c.key) && local > c.ts) continue
          if (JSON.stringify(this.meta.flat[c.key] ?? null) !== JSON.stringify(c.value)) { this.meta.flat[c.key] = c.value; changed = true }
          this.meta.ts[c.key] = c.ts
        }
        this.meta.seq = res.seq; more = !!res.more; this.saveMeta()
        if (changed) {
          this.doc = rebuild(this.meta.flat, this.doc)
          try { localStorage.setItem(STORE2, JSON.stringify(this.doc)) } catch { /* ignore */ }
          pushWidget(this.doc); this.remoteCb?.(this.doc)
        }
      }
      this.lastSync = Date.now(); this.setState('idle')
    } catch (e) {
      this.setState(navigator.onLine === false ? 'offline' : 'error')
    } finally {
      this.busy = false
      if (this.again) { this.again = false; this.schedule(300) }
    }
  }
}
export const store = new Store()
