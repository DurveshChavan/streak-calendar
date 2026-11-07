// Local-first store: the doc lives in localStorage (works offline); a record-level sync engine mirrors it to the server.
import type { Marks } from './streaks'
import { pushWidget } from './widget'

export interface Habit { id: string; name: string; marks: Marks }
export interface Doc { habits: Habit[]; cur: string; notes: Record<string, string>; theme: 'light' | 'dark' }

const STORE = 'streakcal.v1', STORE2 = 'streakcal.v2', SYNC = 'streakcal.sync'

export function loadDoc(): Doc {
  let s: any = null
  try { s = JSON.parse(localStorage.getItem(STORE2) || 'null') } catch { /* ignore */ }
  if (!s || !Array.isArray(s.habits) || !s.habits.length) {
    let o: any = {}; try { o = JSON.parse(localStorage.getItem(STORE) || '{}') } catch { /* ignore */ }
    s = { habits: [{ id: 'h1', name: 'Habit 1', marks: o.marks || {} }], cur: 'h1', notes: o.notes || {}, theme: o.theme || 'light' }
  }
  return { habits: s.habits, cur: s.habits.some((h: Habit) => h.id === s.cur) ? s.cur : s.habits[0].id, notes: s.notes || {}, theme: s.theme || 'light' }
}

// ---- record model: habit:<id> {name,order} | mark:<id>:<day> 't'|'x' | note:<day> string ; null = deleted ----
type Flat = Record<string, any>
export function flatten(d: Doc): Flat {
  const f: Flat = {}
  d.habits.forEach((h, i) => {
    f['habit:' + h.id] = { name: h.name, order: i }
    for (const [day, v] of Object.entries(h.marks)) f['mark:' + h.id + ':' + day] = v
  })
  for (const [day, t] of Object.entries(d.notes)) f['note:' + day] = t
  return f
}
export function rebuild(flat: Flat, prev: Doc): Doc {
  const hs: { id: string; name: string; order: number }[] = []
  for (const [k, v] of Object.entries(flat)) if (k.startsWith('habit:') && v) hs.push({ id: k.slice(6), name: v.name, order: v.order })
  hs.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const byId: Record<string, Habit> = {}
  const habits = hs.map(h => (byId[h.id] = { id: h.id, name: h.name, marks: {} }))
  const notes: Record<string, string> = {}
  for (const [k, v] of Object.entries(flat)) {
    if (v == null) continue
    if (k.startsWith('mark:')) { const i = k.indexOf(':', 5), h = byId[k.slice(5, i)]; if (h) h.marks[k.slice(i + 1)] = v }
    else if (k.startsWith('note:')) notes[k.slice(5)] = v
  }
  if (!habits.length) return prev
  return { habits, notes, theme: prev.theme, cur: habits.some(h => h.id === prev.cur) ? prev.cur : habits[0].id }
}

interface SyncMeta { url: string; token: string; seq: number; ts: Record<string, number>; flat: Flat; dirty: string[] }
const emptyMeta = (): SyncMeta => ({ url: '', token: '', seq: 0, ts: {}, flat: {}, dirty: [] })
export type SyncState = 'off' | 'idle' | 'syncing' | 'error' | 'offline' | 'auth'

class Store {
  doc: Doc = loadDoc()
  meta: SyncMeta = emptyMeta()
  state: SyncState = 'off'
  lastSync = 0
  private remoteCb: ((d: Doc) => void) | null = null
  private statusCb: (() => void) | null = null
  private timer: any; private poll: any; private busy = false; private again = false

  constructor() {
    try { Object.assign(this.meta, JSON.parse(localStorage.getItem(SYNC) || '{}')) } catch { /* ignore */ }
    // first run on this device: seed baseline so existing data is pushed with a fresh timestamp
    if (!Object.keys(this.meta.flat).length) {
      const d = this.doc, pristine = d.habits.length === 1 && d.habits[0].id === 'h1' && d.habits[0].name === 'Habit 1' && !Object.keys(d.habits[0].marks).length && !Object.keys(d.notes).length
      // a pristine default doc gets timestamp 0 so it can never overwrite real data already on the server
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

  /** Persist a new doc locally, record which records changed, and schedule a sync. */
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
    // push everything we have on first connect; server keeps the newest per record
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
      let more = true
      while (more) {
        const sent = [...this.meta.dirty]
        const changes = sent.map(k => ({ key: k, value: this.meta.flat[k] ?? null, ts: this.meta.ts[k] ?? Date.now() }))
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000)
        const r = await fetch(this.meta.url + '/api/sync', { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + this.meta.token }, body: JSON.stringify({ since: this.meta.seq, changes }) }).finally(() => clearTimeout(to))
        if (r.status === 401) { this.setState('auth'); return }
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const res = await r.json()
        const sentSet = new Set(sent)
        // anything edited while the request was in flight stays dirty
        this.meta.dirty = this.meta.dirty.filter(k => !sentSet.has(k) || JSON.stringify(this.meta.flat[k] ?? null) !== JSON.stringify(changes.find(c => c.key === k)!.value))
        let changed = false
        for (const c of res.changes as { key: string; value: any; ts: number }[]) {
          const local = this.meta.ts[c.key] || 0
          if (this.meta.dirty.includes(c.key) && local > c.ts) continue // our pending edit is newer
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
