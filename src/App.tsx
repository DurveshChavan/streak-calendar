import React from 'react'
import { flushSync } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
import { MONTHS, WD, pad, keyOf, parse, holiday, holidaysFor, isoWeek, dayOfYear, short, panchang, tithiLabel } from './lib/calendar'
import { streaks as calcStreaks, peaks as calcPeaks, nextMs, type Marks, type Mark } from './lib/streaks'
import { store, type Doc, type Habit } from './lib/store'
import { setSystemBars } from './lib/widget'
import { makeBackup, parseBackup, mergeBackup, countOf, type Parsed } from './lib/backup'

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Roboto,sans-serif"
const EASE = 'cubic-bezier(.2,.8,.2,1)'
const glass = (blur = 20, sat = 1.3): React.CSSProperties => ({ background: 'var(--glass)', backdropFilter: `blur(${blur}px) saturate(${sat})`, WebkitBackdropFilter: `blur(${blur}px) saturate(${sat})`, border: '1px solid var(--line)' })
const sq = (w: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ width: w, height: w, flex: 'none', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--cell)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, ...extra })

// on-screen angle of a day's cube, read mid-turn; the turn speed is capped from it
function cubeAngle(btn: Element | null) { const c = btn && btn.firstElementChild; if (!c) return 0; try { const m = new DOMMatrix(getComputedStyle(c).transform); return Math.atan2(-m.m13, m.m11) * 180 / Math.PI } catch { return 0 } }
const turnTime = (deg: number) => +Math.min(.4, Math.max(.06, Math.abs(deg) / 90 * .4)).toFixed(3)

type Face = ReturnType<typeof faceVals> & { disp: string; tf: string; sh: string; shTr: string; tr: string; numTr: string; icoTr: string; dashTr: string; dashTr2: string }
// One cube face showing the move from one mark to another (p = 0..1): date slides to the corner, tick or cross draws
function faceVals(from: Mark | null, to: Mark | null, p: number, isToday: boolean, red: boolean) {
  const mix = (a: number, b: number) => a + (b - a) * p, nP = mix(from ? 1 : 0, to ? 1 : 0), tP = mix(from === 't' ? 1 : 0, to === 't' ? 1 : 0), xP = mix(from === 'x' ? 1 : 0, to === 'x' ? 1 : 0)
  const x1 = Math.min(1, xP / .6), x2 = Math.max(0, (xP - .4) / .6), n3 = nP.toFixed(3)
  return {
    bg: to === 't' ? 'var(--tick)' : to === 'x' ? 'var(--cross)' : isToday ? 'var(--c10)' : 'var(--cell)',
    fg: to ? '#fff' : isToday ? (red ? '#B00000' : '#14161A') : red ? 'var(--red)' : 'var(--ink)', border: isToday ? '2px solid var(--c10)' : '1px solid var(--line)',
    numT: nP > .001 ? `translate(calc((-50% + 10px) * ${n3}), calc((-50% + 9px) * ${n3})) scale(${(1 - .42 * nP).toFixed(3)})` : 'none',
    tOp: Math.min(1, tP * 3).toFixed(2), tSc: (.7 + .3 * tP).toFixed(3), tOff: (25 * (1 - tP)).toFixed(2) + 'px',
    xOp: Math.min(1, xP * 3).toFixed(2), xSc: (.7 + .3 * xP).toFixed(3), x1Off: (25 * (1 - x1)).toFixed(2) + 'px', x2Off: (25 * (1 - x2)).toFixed(2) + 'px',
  }
}

function CubeFace({ name, v, num }: { name: string; v: Face; num: number }) {
  return (
    <span data-face={name} style={{ position: 'absolute', inset: 0, display: v.disp, boxSizing: 'border-box', borderRadius: 12, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: v.tf, background: v.bg, color: v.fg, border: v.border, transition: v.tr }}>
      <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontVariantNumeric: 'tabular-nums', transform: v.numT, transition: v.numTr }}>{num}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', inset: 0, margin: 'auto', width: '46%', height: '46%', opacity: v.tOp, transform: `scale(${v.tSc})`, transition: v.icoTr }}>
        <polyline points="4.5 12.5 10 18 19.5 6.5" strokeDasharray="24" style={{ strokeDashoffset: v.tOff, transition: v.dashTr }} />
      </svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" aria-hidden="true" style={{ position: 'absolute', inset: 0, margin: 'auto', width: '42%', height: '42%', opacity: v.xOp, transform: `scale(${v.xSc})`, transition: v.icoTr }}>
        <line x1="5" y1="5" x2="19" y2="19" strokeDasharray="24" style={{ strokeDashoffset: v.x1Off, transition: v.dashTr }} />
        <line x1="19" y1="5" x2="5" y2="19" strokeDasharray="24" style={{ strokeDashoffset: v.x2Off, transition: v.dashTr2 }} />
      </svg>
      <span aria-hidden="true" style={{ position: 'absolute', inset: -1, borderRadius: 'inherit', background: '#000', pointerEvents: 'none', opacity: v.sh, transition: v.shTr }} />
    </span>
  )
}

interface Props { showWeekNumbers?: boolean; haptics?: boolean }
interface State {
  y: number; m: number; habits: Habit[]; cur: string; notes: Record<string, string>; theme: 'light' | 'dark'
  sel: string | null; drag: { k: string; dx: number; dur: number } | null; lastDrag: string | null; snap: string | null
  turn: { k: string; from: Mark | null; dir: number; ph: number } | null; settle: { k: string; from: Mark | null; to: Mark | null; dir: number; dur: number } | null
  toast: { k: string; prev: Mark | null; hid: string; text: string } | null; toastOut: boolean; closing: boolean; instant: boolean
  hOpen: boolean; hClosing: boolean; editId: string | null; editName: string; confirmId: string | null; newName: string
  syncOpen: boolean; syncUrl: string; syncToken: string
  bkOpen: boolean; bkText: string; bkMsg: string; bkPending: Parsed | null
}

export default class App extends React.Component<Props, State> {
  raf: Record<string, number> = {}; rt: Record<string, any> = {}
  tt: any; to: any; ct: any; hct: any; tnt: any; stt: any
  g: any = null; bg: any = null; bSwiped = false; peak: any = null; switching = false
  dragAt = 0; scrimArmed = false; nt: any = null; noteDraft: { k: string; v: string } | null = null; barsDark: boolean | null = null
  nums: any = null; shown: any = null

  constructor(p: Props) {
    super(p)
    const d = store.doc, t = new Date()
    this.state = { y: t.getFullYear(), m: t.getMonth(), habits: d.habits, cur: d.cur, notes: d.notes, theme: d.theme,
      sel: null, drag: null, lastDrag: null, snap: null, turn: null, settle: null, toast: null, toastOut: false, closing: false, instant: false,
      hOpen: false, hClosing: false, editId: null, editName: '', confirmId: null, newName: '', syncOpen: false, syncUrl: store.meta.url, syncToken: store.meta.token, bkOpen: false, bkText: '', bkMsg: '', bkPending: null }
    store.onRemote((doc: Doc) => this.setState({ habits: doc.habits, notes: doc.notes, cur: doc.cur }))
    store.onStatus(() => this.forceUpdate())
  }
  componentDidMount() {
    this.applyTheme(); this.shown = this.nums; document.addEventListener('visibilitychange', this.onVis)
    // Android back closes the open sheet first, instead of leaving the app
    if (Capacitor.isNativePlatform()) NativeApp.addListener('backButton', () => { if (this.state.sel) this.closeSheet(); else if (this.state.hOpen) this.closeHabits(); else NativeApp.minimizeApp() })
  }
  componentDidUpdate() { this.applyTheme(); this.animNums() }
  componentWillUnmount() { [this.tt, this.to, this.ct, this.hct, this.tnt, this.stt].forEach(clearTimeout); Object.values(this.rt).forEach(clearTimeout); Object.values(this.raf).forEach(cancelAnimationFrame); document.removeEventListener('visibilitychange', this.onVis) }
  // the day rolls over while the app sits open in the background
  lastDay = keyOf(new Date())
  onVis = () => {
    if (document.visibilityState === 'hidden') this.flushNote()
    else if (this.today() !== this.lastDay) { this.lastDay = this.today(); this.forceUpdate() }
  }

  applyTheme() { const dark = this.state.theme === 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; const m = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null; if (m) m.content = dark ? '#030303' : '#B7D8F5'; if (this.barsDark !== dark) { this.barsDark = dark; setSystemBars(dark) } }
  persist() { const s = this.state; store.commit({ habits: s.habits, cur: s.cur, notes: s.notes, theme: s.theme }) }
  save(patch: Partial<State>, after?: () => void) {
    this.setState(patch as any, () => { this.persist(); if (after) after() })
  }
  // Swap the theme instantly with every transition switched off, under one GPU cross-fade (View Transition).
  // Letting hundreds of blurred glass elements transition their colours one by one is what made the toggle lag on Android.
  toggleTheme = () => {
    const theme: 'light' | 'dark' = this.state.theme === 'dark' ? 'light' : 'dark', root = document.documentElement, doc = document as any
    const swap = () => { flushSync(() => this.setState({ theme })); this.persist() }
    const done = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-swap')))
    root.classList.add('theme-swap')
    if (!this.rm() && typeof doc.startViewTransition === 'function') {
      try { doc.startViewTransition(swap).finished.finally(done); return } catch { /* fall through to an instant swap */ }
    }
    swap(); done()
  }
  today() { return keyOf(new Date()) }
  hIdx(s = this.state) { const i = s.habits.findIndex(h => h.id === s.cur); return i < 0 ? 0 : i }
  habit(s = this.state) { return s.habits[this.hIdx(s)] }
  buzz(p: number | number[]) { if ((this.props.haptics ?? true) && 'vibrate' in navigator) navigator.vibrate(p) }
  streaks(marks: Marks = this.habit().marks) { return calcStreaks(marks, this.today()) }

  setMark(k: string, v: Mark | null, toast?: boolean, src?: any, how?: string, sdir?: number) {
    const i = this.hIdx(), H = this.habit(), prev = H.marks[k] || null, marks = { ...H.marks }
    if (v) marks[k] = v; else delete marks[k]
    const habits = this.state.habits.slice(); habits[i] = { ...H, marks }
    const b = this.streaks(H.marks), a = this.streaks(marks), peak = calcPeaks(k, v, b, a, marks, this.state.habits.length > 1 ? H.name : ''), stung = v === 'x' && b.cur > 0 && a.cur < b.cur
    const patch: Partial<State> & { snap?: string | null } = { habits }
    if (how === 'drag') { if (this.rm()) patch.snap = k; else { { const dir = sdir || this.turnDir(prev, v); patch.settle = { k, from: prev, to: v, dir, dur: Math.max(.18, turnTime(dir * 90 - cubeAngle(src))) } } const o = this.state.settle; if (o && o.k !== k) patch.snap = o.k } }
    else if (!this.rm()) patch.turn = { k, from: prev, dir: sdir || this.turnDir(prev, v), ph: 0 }
    if (toast) { clearTimeout(this.tt); clearTimeout(this.to); patch.toastOut = false; patch.toast = { k, prev, hid: H.id, text: (v === 't' ? 'Done' : v === 'x' ? 'Missed' : 'Cleared') + ' · ' + short(parse(k)) }; this.tt = setTimeout(() => this.hideToast(), 3500) }
    this.peak = peak
    this.save(patch, () => { this.peak = null; if (patch.turn) this.turnGo(); if (patch.snap) this.unsnap(); if (patch.settle) this.settleGo(k); if (peak) this.celebrate(peak, k, src); else if (stung) this.sting() })
    this.buzz(peak ? [12, 50, 18, 50, 28] : stung ? [30, 40, 30, 40, 30] : v === 'x' ? [10, 40, 10] : 12)
  }
  swipe(k: string, dir: number, src: any, how: string) { const cur = this.habit().marks[k], d = dir > 0 ? 1 : -1; this.setMark(k, cur ? null : d > 0 ? 'x' : 't', true, src, how, d) }
  turnDir(from: Mark | null, to: Mark | null) { return to === 't' ? -1 : to === 'x' ? 1 : from === 't' ? 1 : -1 }
  turnGo() { requestAnimationFrame(() => requestAnimationFrame(() => { const t = this.state.turn; if (!t) return; this.setState({ turn: { ...t, ph: 1 } }); clearTimeout(this.tnt); this.tnt = setTimeout(() => this.setState({ turn: null }), 420) })) }
  settleGo(k: string) { clearTimeout(this.stt); this.stt = setTimeout(() => { this.setState({ settle: null, snap: k }); this.unsnap() }, 420) }
  unsnap() { requestAnimationFrame(() => requestAnimationFrame(() => { if (this.state.snap) this.setState({ snap: null }) })) }

  // One handler on the calendar: a short left/right swipe on a day marks it (the cube turns); a long swipe (past
  // ~2 cells), or any swipe that starts off the days, pages the month. Days open on click, not pointerup, so a tap's
  // own trailing click can't land on the sheet's backdrop and close it straight away.
  gDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button && e.button !== 0) return
    const t = e.target as Element, cell = t.closest('[data-key]') as HTMLElement | null
    if (!cell && t.closest('button')) return
    this.g = { k: cell ? cell.dataset.key : null, x: e.clientX, y: e.clientY, id: e.pointerId, el: cell, box: e.currentTarget, mode: null, mx: 0,
      T: Math.max(88, (cell ? cell.getBoundingClientRect().width : 44) * 2) }
  }
  gMove = (e: React.PointerEvent<HTMLElement>) => {
    const g = this.g; if (!g || g.id !== e.pointerId) return; const dx = e.clientX - g.x, dy = e.clientY - g.y
    if (!g.mode) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { g.mode = g.k ? 'h' : 'm'; this.dragAt = Infinity; try { g.box.setPointerCapture(g.id) } catch { /* ignore */ } }
      else if (Math.abs(dy) > 8) { g.mode = 'v'; this.dragAt = Infinity }
    }
    if (g.mode === 'h' && Math.abs(dx) > g.T) { g.mode = 'm'; g.mx = dx; g.on = false; this.buzz(8); this.setState({ drag: null }) }
    else if (g.mode === 'm' && g.k && Math.abs(dx) < g.T * .75) { g.mode = 'h'; this.page(0) }
    if (g.mode === 'h') { const on = Math.abs(dx) > 24; if (on !== !!g.on) { g.on = on; if (on) this.buzz(6) } const cx = Math.max(-40, Math.min(40, dx)), to = Math.sign(cx) * Math.min(1, Math.abs(cx) / 24) * 90; this.setState({ drag: { k: g.k, dx: cx, dur: turnTime(to - cubeAngle(g.el)) }, lastDrag: g.k }) }
    else if (g.mode === 'm') this.page(dx - g.mx)
  }
  gUp = (e: React.PointerEvent<HTMLElement>) => {
    const g = this.g; this.g = null; if (!g || g.id !== e.pointerId) return; const dx = e.clientX - g.x
    if (g.mode) this.dragAt = Date.now()
    if (g.mode === 'h') { this.setState({ drag: null }); if (Math.abs(dx) > 24) this.swipe(g.k, dx, g.el, 'drag') }
    else if (g.mode === 'm') { if (Math.abs(dx) > (g.k ? g.T : 48)) { this.page(0); this.buzz(6); this.shift(dx < 0 ? 1 : -1) } else this.page(0, true) }
  }
  gCancel = () => { const g = this.g; this.g = null; if (!g) return; if (g.mode) this.dragAt = Date.now(); this.setState({ drag: null }); if (g.mode === 'm') this.page(0, true) }
  dayClick = (e: React.MouseEvent<HTMLButtonElement>) => { if (Date.now() - this.dragAt < 350) return; this.open(e.currentTarget.dataset.key!) }
  onKey = (e: React.KeyboardEvent<HTMLButtonElement>) => { const k = e.currentTarget.dataset.key!; if (e.key === 'ArrowRight') { e.preventDefault(); this.swipe(k, 1, e.currentTarget, 'auto') } else if (e.key === 'ArrowLeft') { e.preventDefault(); this.swipe(k, -1, e.currentTarget, 'auto') } }
  // while paging, the grid follows the finger; let go short of the threshold and it springs back
  page(off: number, settle = false) {
    const el = this.q('[data-anim="grid"]'); if (!el) return
    const from = el.style.transform
    el.style.transform = off ? `translateX(${(off * .6).toFixed(1)}px)` : ''
    el.style.opacity = off ? String(Math.max(.45, 1 - Math.abs(off) / 360)) : ''
    if (settle && from && !this.rm()) el.animate([{ transform: from }, { transform: 'none' }], { duration: 200, easing: EASE })
  }
  bDown = (e: React.PointerEvent<HTMLButtonElement>) => { this.bSwiped = false; if (e.button && e.button !== 0) return; this.bg = { x: e.clientX, y: e.clientY, id: e.pointerId, el: e.currentTarget, mode: null } }
  bMove = (e: React.PointerEvent<HTMLButtonElement>) => { const g = this.bg; if (!g || g.id !== e.pointerId || g.mode) return; const dx = e.clientX - g.x, dy = e.clientY - g.y; if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { g.mode = 'v'; try { g.el.setPointerCapture(g.id) } catch { /* ignore */ } } }
  bUp = (e: React.PointerEvent<HTMLButtonElement>) => { const g = this.bg; this.bg = null; if (!g || g.mode !== 'v') return; this.bSwiped = true; const dy = e.clientY - g.y; if (Math.abs(dy) > 20) this.switchHabit(dy < 0 ? 1 : -1) }
  bCancel = () => { this.bg = null }
  bClick = () => { if (this.bSwiped) { this.bSwiped = false; return } this.openHabits() }
  bKey = (e: React.KeyboardEvent) => { if (e.key === 'ArrowDown') { e.preventDefault(); this.switchHabit(1) } else if (e.key === 'ArrowUp') { e.preventDefault(); this.switchHabit(-1) } }

  shift(n: number) { this.setState(s => { const d = new Date(s.y, s.m + n, 1); return { y: d.getFullYear(), m: d.getMonth(), instant: true } }, () => this.afterNav(Math.sign(n))) }
  go(y: number, m: number, sel?: string) { const s = this.state, dir = Math.sign(y * 12 + m - (s.y * 12 + s.m)), patch: Partial<State> = { y, m, instant: !!dir }; if (sel) { clearTimeout(this.ct); patch.sel = sel; patch.closing = false } this.setState(patch as any, () => this.afterNav(dir)) }
  afterNav(dir: number) { this.slide(dir); requestAnimationFrame(() => requestAnimationFrame(() => { if (this.state.instant) this.setState({ instant: false }) })) }
  open(k: string) { clearTimeout(this.ct); this.setState({ sel: k, closing: false }) }

  // ---- habits ----
  switchHabit(dir: number) { const s = this.state, j = this.hIdx() + dir; if (j < 0 || j >= s.habits.length) { this.bump(dir); return } this.toHabit(s.habits[j].id, dir) }
  toHabit(id: string, dir: number) { if (id === this.state.cur) return; this.switching = true; this.save({ cur: id }, () => { this.switching = false; this.rollBadge(dir) }); this.buzz(8) }
  rollBadge(dir: number) { if (this.rm()) return; const r = this.q('[data-anim="hroll"]'); if (r) r.animate([{ transform: `translateY(${dir > 0 ? 60 : -60}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: EASE }) }
  bump(dir: number) { this.buzz([5, 40, 5]); if (this.rm()) return; const b = this.q('[data-anim="badge"]'); if (b) b.animate([{ transform: 'none' }, { transform: `translateY(${dir > 0 ? -5 : 5}px)`, offset: .4 }, { transform: 'none' }], { duration: 280, easing: 'ease-out' }) }
  openHabits() { clearTimeout(this.hct); this.setState({ hOpen: true, hClosing: false, editId: null, confirmId: null, newName: '' }) }
  closeHabits() {
    if (this.state.hClosing || !this.state.hOpen) return
    if (this.rm()) { this.setState({ hOpen: false, editId: null, confirmId: null }); return }
    this.setState({ hClosing: true }); clearTimeout(this.hct); this.hct = setTimeout(() => this.setState({ hOpen: false, hClosing: false, editId: null, confirmId: null }), 200)
  }
  pickHabit(id: string, i: number) { const d = Math.sign(i - this.hIdx()); if (d) this.toHabit(id, d); this.closeHabits() }
  addHabit() {
    const s = this.state, taken = new Set(s.habits.map(h => h.name)); let n = s.habits.length + 1; while (taken.has('Habit ' + n)) n++
    const id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name = s.newName.trim().slice(0, 24) || 'Habit ' + n
    this.switching = true; this.save({ habits: [...s.habits, { id, name, marks: {} }], cur: id, newName: '' }, () => { this.switching = false; this.rollBadge(1) }); this.buzz(8)
  }
  moveHabit(id: string, d: number) { const hs = this.state.habits.slice(), i = hs.findIndex(h => h.id === id), j = i + d; if (i < 0 || j < 0 || j >= hs.length) return;[hs[i], hs[j]] = [hs[j], hs[i]]; this.save({ habits: hs }) }
  startEdit(h: Habit) { this.setState({ editId: h.id, editName: h.name, confirmId: null }, () => { const el = this.q('[data-hedit]') as HTMLElement | null; if (el) el.focus() }) }
  saveEdit() { const s = this.state, name = s.editName.trim().slice(0, 24); this.save({ habits: s.habits.map(h => h.id === s.editId && name ? { ...h, name } : h), editId: null }) }
  delHabit(id: string) {
    const s = this.state; if (s.habits.length < 2) return; const i = s.habits.findIndex(h => h.id === id), hs = s.habits.filter(h => h.id !== id), patch: Partial<State> = { habits: hs, confirmId: null }, wasCur = s.cur === id
    if (wasCur) { patch.cur = hs[Math.max(0, i - 1)].id; this.switching = true }
    this.save(patch, () => { if (wasCur) { this.switching = false; this.rollBadge(-1) } })
  }

  // ---- motion ----
  rm() { return !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) }
  q(sel: string) { return document.querySelector(sel) as HTMLElement | null }
  animNums() {
    const p = this.shown, c = this.nums; this.shown = c; if (!p || !c || this.rm()) return
    const lag = this.peak ? 520 : 0
    ;['streak', 'best', 'mt', 'mx'].forEach(n => { if (p[n] !== c[n] && !(n === 'streak' && this.switching)) this.countTo(n, p[n], c[n], n === 'streak' || n === 'best' ? lag : 0) })
    const bar = this.q('[data-anim="bar"]')
    if (bar && p.bar !== c.bar) { const f = `scaleX(${p.bar})`, t = `scaleX(${c.bar})`; bar.animate(this.peak && c.bar < p.bar ? [{ transform: f }, { transform: 'scaleX(1)', offset: .45 }, { transform: 'scaleX(1)', offset: .7 }, { transform: t }] : [{ transform: f }, { transform: t }], { duration: this.peak ? 1300 : 450, easing: EASE }) }
  }
  countTo(n: string, from: number, to: number, delay: number) {
    const el = this.q(`[data-anim="${n}"]`); if (!el) return
    cancelAnimationFrame(this.raf[n]); clearTimeout(this.rt[n])
    if (Math.abs(to - from) === 1) { el.animate([{ transform: `translateY(${to > from ? 55 : -55}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, delay, easing: EASE, fill: 'backwards' }); return }
    const tn = document.createTreeWalker(el, NodeFilter.SHOW_TEXT).nextNode(); if (!tn) return
    tn.nodeValue = String(from)
    const run = () => { const t0 = performance.now(), D = Math.min(900, 300 + Math.abs(to - from) * 35); const step = (now: number) => { const p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3); tn.nodeValue = String(Math.round(from + (to - from) * e)); if (p < 1) this.raf[n] = requestAnimationFrame(step) }; this.raf[n] = requestAnimationFrame(step) }
    if (delay) this.rt[n] = setTimeout(run, delay); else run()
  }
  slide(dir: number) {
    if (!dir || this.rm()) return; const o = { duration: 260, easing: EASE }, g = this.q('[data-anim="grid"]'), t = this.q('[data-anim="title"]')
    if (g) g.animate([{ transform: `translateX(${dir * 28}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], o)
    if (t) t.animate([{ transform: `translateX(${dir * 14}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], o)
  }
  hideToast() { clearTimeout(this.tt); if (!this.state.toast) return; if (this.rm()) { this.setState({ toast: null, toastOut: false }); return } this.setState({ toastOut: true }); clearTimeout(this.to); this.to = setTimeout(() => this.setState({ toast: null, toastOut: false }), 180) }
  closeSheet() { this.flushNote(); if (this.state.closing || !this.state.sel) return; if (this.rm()) { this.setState({ sel: null }); return } this.setState({ closing: true }); clearTimeout(this.ct); this.ct = setTimeout(() => this.setState({ sel: null, closing: false }), 200) }
  // notes save while typing (debounced) so nothing is lost if the app is closed mid-note
  noteInput(k: string, v: string) { this.noteDraft = { k, v }; clearTimeout(this.nt); this.nt = setTimeout(() => this.flushNote(), 400) }
  flushNote() {
    clearTimeout(this.nt); const d = this.noteDraft; this.noteDraft = null
    if (!d || d.v === (this.state.notes[d.k] || '')) return
    const notes = { ...this.state.notes }; if (d.v) notes[d.k] = d.v; else delete notes[d.k]; this.save({ notes })
  }
  sting() {
    if (this.rm()) return; const b = this.q('[data-anim="badge"]'), d = this.q('[data-anim="drain"]')
    if (b) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)', offset: .15 }, { transform: 'translateX(6px)', offset: .35 }, { transform: 'translateX(-4px)', offset: .55 }, { transform: 'translateX(2px)', offset: .75 }, { transform: 'translateX(0)' }], { duration: 460, easing: 'ease-out' })
    if (d) d.animate([{ transform: 'scaleY(0)', opacity: 1 }, { transform: 'scaleY(1)', opacity: 1, offset: .55 }, { transform: 'scaleY(1)', opacity: 0 }], { duration: 1000, easing: EASE })
  }
  celebrate(pk: { label: string; month: boolean; best: boolean }, k: string, src: any) {
    this.flash(pk.label)
    const badge = this.q('[data-anim="badge"]'); if (this.rm() || !badge) return
    const card = this.q('[data-anim="monthcard"]'), cell = src && src.isConnected ? src : this.q(`[data-day="${k}"]`)
    this.sparks(pk.month && card ? card : cell || badge, badge, pk.month ? 22 : 14)
    badge.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: .35 }, { transform: 'scale(.97)', offset: .7 }, { transform: 'scale(1)' }], { duration: 620, delay: 520, easing: 'ease-out' })
    this.ring(badge)
    const best = pk.best && this.q('[data-anim="best"]')
    if (best) best.animate([{ scale: '1' }, { scale: '1.3', offset: .4 }, { scale: '1' }], { duration: 640, delay: 520, easing: 'ease-out' })
    if (pk.month && card) { this.sheen(card); document.querySelectorAll(`[data-day^="${k.slice(0, 8)}"]`).forEach((el, i) => el.animate([{ scale: '1' }, { scale: '1.12', offset: .4 }, { scale: '1' }], { duration: 420, delay: 120 + i * 22, easing: 'ease-out' })) }
  }
  sparks(from: Element, to: Element, n: number) {
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, bx = b.left + b.width / 2, by = b.top + b.height / 2, cols = ['var(--c10)', 'var(--c30)', 'var(--tick)', '#fff']
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'), z = 5 + Math.random() * 4, ang = i / n * Math.PI * 2 + Math.random() * .6, r = 34 + Math.random() * 46, mx = ax + Math.cos(ang) * r, my = ay + Math.sin(ang) * r
      s.setAttribute('aria-hidden', 'true'); s.dataset.fx = 'spark'
      s.style.cssText = `position:fixed;left:0;top:0;width:${z}px;height:${z}px;margin:${-z / 2}px 0 0 ${-z / 2}px;border-radius:${i % 3 ? '50%' : '2px'};background:${cols[i % 4]};box-shadow:0 0 0 1px rgba(20,22,26,.12);pointer-events:none;z-index:40`
      document.body.appendChild(s)
      s.animate([{ transform: `translate(${ax}px,${ay}px) scale(.3)`, opacity: 0, easing: EASE }, { transform: `translate(${mx}px,${my}px) scale(1)`, opacity: 1, offset: .32, easing: 'cubic-bezier(.55,0,.85,.35)' }, { transform: `translate(${bx}px,${by}px) scale(.4)`, opacity: 1, offset: .9 }, { transform: `translate(${bx}px,${by}px) scale(0)`, opacity: 0 }], { duration: 560 + Math.random() * 120, delay: Math.random() * 50, fill: 'backwards' })
      setTimeout(() => s.remove(), 1000)
    }
  }
  ring(badge: Element) {
    const r = badge.getBoundingClientRect(), o = document.createElement('span'); o.setAttribute('aria-hidden', 'true')
    o.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:16px;border:2px solid var(--c10);box-sizing:border-box;opacity:0;pointer-events:none;z-index:6`
    document.body.appendChild(o)
    o.animate([{ transform: 'scale(1)', opacity: .9 }, { transform: 'scale(1.45)', opacity: 0 }], { duration: 640, delay: 560, easing: EASE })
    setTimeout(() => o.remove(), 1300)
  }
  sheen(card: Element) {
    const r = card.getBoundingClientRect(), w = document.createElement('div'), s = document.createElement('div'); w.setAttribute('aria-hidden', 'true')
    w.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:24px;overflow:hidden;pointer-events:none;z-index:6`
    s.style.cssText = 'position:absolute;top:-20%;bottom:-20%;left:0;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);transform:translateX(-110%)'
    w.appendChild(s); document.body.appendChild(w)
    s.animate([{ transform: 'translateX(-110%) skewX(-12deg)' }, { transform: `translateX(${Math.round(r.width * 1.1)}px) skewX(-12deg)` }], { duration: 900, delay: 240, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' })
    setTimeout(() => w.remove(), 1300)
  }
  flash(text: string) {
    const old = document.getElementById('streak-peak'); if (old) old.remove()
    const hd = this.q('header'), top = hd ? Math.round(hd.getBoundingClientRect().bottom + 10) : 80, el = document.createElement('div')
    el.id = 'streak-peak'; el.setAttribute('role', 'status'); el.textContent = text
    el.style.cssText = `position:fixed;left:50%;top:${top}px;z-index:30;transform:translateX(-50%);max-width:calc(100vw - 32px);box-sizing:border-box;padding:10px 16px;border-radius:999px;background:var(--glass);backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);border:1px solid var(--line);color:var(--ink);box-shadow:0 8px 24px rgba(0,0,0,.14);font:500 15px/1.25 ${FONT};text-align:center;pointer-events:none`
    document.body.appendChild(el)
    if (!this.rm()) el.animate([{ transform: 'translate(-50%,-14px) scale(.94)', opacity: 0 }, { transform: 'translateX(-50%) scale(1)', opacity: 1 }], { duration: 420, delay: 560, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })
    setTimeout(() => { if (!el.isConnected) return; if (this.rm()) { el.remove(); return } el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-8px)' }], { duration: 260, easing: 'ease', fill: 'forwards' }).onfinish = () => el.remove() }, 2900)
  }

  undo = () => {
    const tt = this.state.toast; if (!tt) return; clearTimeout(this.tt)
    const hs = this.state.habits.slice(), j = hs.findIndex(h => h.id === tt.hid)
    if (j >= 0) {
      const marks = { ...hs[j].marks }, from = marks[tt.k] || null; if (tt.prev) marks[tt.k] = tt.prev; else delete marks[tt.k]; hs[j] = { ...hs[j], marks }
      const patch: Partial<State> = { habits: hs }; if (!this.rm() && tt.hid === this.state.cur) patch.turn = { k: tt.k, from, dir: this.turnDir(from, tt.prev || null), ph: 0 }
      this.save(patch, () => { if (patch.turn) this.turnGo() })
    }
    this.hideToast()
  }

  // ---- backup ----
  copyBackup = async () => {
    const s = this.state, text = makeBackup({ habits: s.habits, cur: s.cur, notes: s.notes, theme: s.theme }), c = countOf(s)
    let done = false
    try { await navigator.clipboard.writeText(text); done = true } catch { /* fall back below */ }
    if (!done) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0'
      document.body.appendChild(ta); ta.select(); try { done = document.execCommand('copy') } catch { done = false } ta.remove()
    }
    this.setState({ bkMsg: done ? `Backup copied: ${c.habits} habit${c.habits === 1 ? '' : 's'}, ${c.marks} marks. Paste it somewhere safe, like a note or an email to yourself.` : 'Couldn’t copy on this device.' })
  }
  checkBackup = () => { const p = parseBackup(this.state.bkText); this.setState({ bkPending: p, bkMsg: p ? '' : 'That isn’t a Streak Calendar backup. Paste the whole text, starting with {' }) }
  applyBackup = () => {
    const s = this.state, p = s.bkPending; if (!p) return
    const d = mergeBackup({ habits: s.habits, cur: s.cur, notes: s.notes, theme: s.theme }, p), c = countOf(p)
    this.switching = true
    this.save({ habits: d.habits, notes: d.notes, bkPending: null, bkOpen: false, bkText: '', bkMsg: `Restored ${c.habits} habit${c.habits === 1 ? '' : 's'} and ${c.marks} marks.` }, () => { this.switching = false })
    this.buzz(12)
  }

  // ---- sync ----
  syncLabel() {
    const st = store.state
    if (st === 'off') return 'Saved on this device · tap to sync'
    if (st === 'syncing') return 'Syncing…'
    if (st === 'auth') return 'Sync: wrong token'
    if (st === 'offline') return 'Offline · will sync when back'
    if (st === 'error') return 'Sync failed · will retry'
    return store.lastSync ? 'Synced · ' + new Date(store.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sync on'
  }

  renderVals() {
    const s = this.state, t = this.today(), dark = s.theme === 'dark', H = this.habit(), M = H.marks, nH = s.habits.length, hi = this.hIdx(), still = !!s.instant, flat = this.rm()
    const first = new Date(s.y, s.m, 1), weeks: any[] = []; let mt = 0, mx = 0
    for (let c = 0; c < 6; c++) {
      const days: any[] = []
      for (let r = 0; r < 7; r++) {
        const dt = new Date(s.y, s.m, 1 - first.getDay() + c * 7 + r)
        const k = keyOf(dt), out = dt.getMonth() !== s.m, mark = M[k] as Mark | undefined, hol = holiday(k), red = dt.getDay() === 0 || !!hol, isToday = k === t
        if (!out) { if (mark === 't') mt++; if (mark === 'x') mx++ }
        const dx = s.drag && s.drag.k === k ? s.drag.dx : 0, q = Math.min(1, Math.abs(dx) / 24)
        // a real cube: date on front and back, tick on the right face (swipe left), cross on the left face (swipe right);
        // a marked day turns back to a date either way. Reduced motion keeps it flat.
        const st8 = s.settle && s.settle.k === k ? s.settle : null, turn = s.turn && s.turn.k === k ? s.turn : null, snap = s.snap === k
        const base: Mark | null = st8 ? st8.from : mark || null, tR: Mark | null = base ? null : 'x', tL: Mark | null = base ? null : 't'
        const ang = flat ? 0 : st8 ? st8.dir * 90 : dx ? (dx > 0 ? 1 : -1) * q * 90 : turn && !turn.ph ? -turn.dir * 90 : 0, sides = !flat && (!!dx || !!turn || !!st8 || s.lastDrag === k)
        const tm = still || snap ? 0 : dx ? s.drag!.dur : st8 ? st8.dur : .4, E = dx ? 'linear' : 'cubic-bezier(.2,.8,.2,1)', ct = tm && !(turn && !turn.ph) ? tm + 's ' + E : '', cubeTr = ct ? 'transform ' + ct : 'none'
        const fx = (v: any, b: number, show: boolean): Face => Object.assign(v, { disp: show ? 'block' : 'none', tf: `rotateY(${b}deg) translateZ(calc(var(--c) / 2))`,
          sh: (Math.min(1, Math.abs(ang + b) / 90) * .35).toFixed(3), shTr: ct ? 'opacity ' + ct : 'none', tr: tm ? 'background-color .2s ease, color .2s ease, border-color .2s ease' : 'none',
          numTr: tm ? `transform ${tm}s ${E}` : 'none', icoTr: tm ? `opacity ${tm}s ${E}, transform ${tm}s ${E}` : 'none',
          dashTr: tm ? `stroke-dashoffset ${tm}s ${E}` : 'none', dashTr2: tm ? `stroke-dashoffset ${(tm * .75).toFixed(2)}s ${E} ${(tm * .2).toFixed(2)}s` : 'none' })
        const was = turn ? turn.from : null, pR = st8 ? (st8.dir > 0 ? 1 : 0) : dx > 0 ? q : 0, pL = st8 ? (st8.dir < 0 ? 1 : 0) : dx < 0 ? q : 0
        days.push({ key: k, num: dt.getDate(), op: out ? '.38' : '1', z: sides ? 3 : 'auto', weight: red || isToday ? 700 : 400, ang: ang.toFixed(2), cubeTr,
          f: fx(flat && dx ? faceVals(base, dx > 0 ? tR : tL, q, isToday, red) : faceVals(base, base, 1, isToday, red), 0, true),
          l: fx(turn ? faceVals(was, was, 1, isToday, red) : faceVals(base, tR, pR, isToday, red), -90, sides),
          r: fx(turn ? faceVals(was, was, 1, isToday, red) : faceVals(base, tL, pL, isToday, red), 90, sides),
          aria: WD[dt.getDay()] + ' ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()] + (out ? ' (other month)' : '') + (hol ? ', ' + hol : '') + (mark === 't' ? ', done' : mark === 'x' ? ', missed' : '') })
      }
      const mon = new Date(s.y, s.m, 1 - first.getDay() + c * 7 + 1)
      weeks.push({ wk: 'W' + isoWeek(mon), days })
    }
    const st = this.streaks(M), nx = nextMs(st.cur)
    this.nums = { streak: st.cur, best: st.best, mt, mx, bar: +Math.min(1, st.cur / nx).toFixed(3) }
    const seed = s.y * 12 + s.m, off = (i: number, r: number) => { const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return Math.round((v - Math.floor(v) - .5) * 2 * r) + 'px' }
    const upcoming: any[] = []; const ty = +t.slice(0, 4)
    ;[ty, ty + 1].forEach(y => Object.entries(holidaysFor(y)).sort().forEach(([k, n]) => { if (k >= t && upcoming.length < 4) { const d = parse(k); const diff = Math.round((+d - +parse(t)) / 864e5); upcoming.push({ key: k, cls: 'hol' + (upcoming.length + 1), name: n.join(' · '), when: short(d) + (diff === 0 ? ' · today' : diff === 1 ? ' · tomorrow' : diff < 31 ? ' · in ' + diff + ' days' : '') }) } }))
    const dots: any[] = []; if (nH > 1) { const W = 5, a0 = nH <= W ? 0 : Math.min(Math.max(0, hi - 2), nH - W), a1 = Math.min(nH, a0 + W); for (let i = a0; i < a1; i++) { const edge = nH > W && ((i === a0 && a0 > 0) || (i === a1 - 1 && a1 < nH)); dots.push({ s: i === hi ? 6 : edge ? 3 : 5, bg: i === hi ? '#14161A' : 'rgba(20,22,26,.32)' }) } }
    let sel: any = null
    if (s.sel) {
      const d = parse(s.sel), hol = holiday(s.sel), mark = M[s.sel], yl = new Date(d.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365
      sel = { weekday: WD[d.getDay()] + (s.sel === t ? ' · Today' : ''), dayColor: d.getDay() === 0 || hol ? 'var(--red)' : 'var(--ink)', date: d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(), hol, tithi: tithiLabel(panchang(d)),
        facts: (nH > 1 ? [H.name] : []).concat(['Day ' + dayOfYear(d) + ' of ' + yl, 'Week ' + isoWeek(d)]), mark, note: s.notes[s.sel] || '' }
    }
    return { st, nx, weeks, upcoming, dots, sel, dark, off, mt, mx }
  }

  render() {
    const s = this.state, V = this.renderVals(), H = this.habit(), nH = s.habits.length, hi = this.hIdx(), sw = this.props.showWeekNumbers ?? true
    const { st, nx, weeks, upcoming, dots, sel, dark, off } = V
    const bg = (a: string, b: string) => `translate(${off(...(a.split(',').map(Number) as [number, number]))},${off(...(b.split(',').map(Number) as [number, number]))})`
    const bgA = bg('1,36', '2,28'), bgB = bg('3,18', '4,56'), bgC = bg('5,56', '6,22'), bgD = bg('7,22', '8,40')
    const discs: [React.CSSProperties, string][] = [
      [{ width: 340, height: 340, borderRadius: '50%', background: 'var(--c30)', top: -90, right: -130 }, bgA],
      [{ width: 120, height: 120, borderRadius: '50%', background: 'var(--c10)', top: '44%', left: -40 }, bgB],
      [{ width: 240, height: 240, borderRadius: '50%', background: 'var(--c30)', bottom: -100, left: '28%' }, bgC],
      [{ width: 64, height: 64, borderRadius: '50%', background: 'var(--c10)', bottom: '24%', right: '7%' }, bgD],
      [{ width: 520, height: 520, borderRadius: '50%', border: '1px solid var(--contour)', top: -180, right: -250 }, bgA],
      [{ width: 700, height: 700, borderRadius: '50%', border: '1px solid var(--contour)', top: -280, right: -350 }, bgA],
      [{ width: 380, height: 380, borderRadius: '50%', border: '1px solid var(--contour)', bottom: -170, left: '18%' }, bgC],
    ]
    const lbl: React.CSSProperties = { font: `500 11px/1 ${FONT}`, letterSpacing: '.08em', textTransform: 'uppercase' }
    const sheet = (open: boolean, closing: boolean): React.CSSProperties => ({ position: 'fixed', left: 0, right: 0, bottom: 'var(--kb, 0px)', zIndex: 21, maxWidth: 560, maxHeight: 'min(88vh, calc(100vh - var(--kb, 0px) - 12px))', overflow: 'auto', overscrollBehavior: 'contain', transition: 'bottom .22s cubic-bezier(.2,.8,.2,1), max-height .22s cubic-bezier(.2,.8,.2,1)', margin: '0 auto', padding: '10px 18px max(20px, env(safe-area-inset-bottom))', boxSizing: 'border-box', borderRadius: '26px 26px 0 0', ...glass(30, 1.4), borderBottom: 0, display: 'flex', flexDirection: 'column', animation: closing ? 'sheetDown .2s cubic-bezier(.4,0,1,1) forwards' : 'sheetUp .25s cubic-bezier(.2,.8,.2,1)' })
    const scrim = (closing: boolean, close: () => void): any => ({ 'data-scrim': '1', onPointerDown: () => { this.scrimArmed = true }, onClick: () => { if (this.scrimArmed) close(); this.scrimArmed = false },
      style: { position: 'fixed', inset: 0, zIndex: 20, background: 'rgba(0,0,0,.3)', animation: closing ? 'fadeOut .2s ease forwards' : 'fadeIn .2s ease' } })
    const rowBtn: React.CSSProperties = { width: 38, height: 38, flex: 'none', display: 'grid', placeItems: 'center', padding: 0, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--cell)', cursor: 'pointer' }
    const ico = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
    const input: React.CSSProperties = { minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--cell)', color: 'var(--ink)', font: `400 16px/1 ${FONT}` }
    const btnY: React.CSSProperties = { border: 0, background: 'var(--c10)', color: '#14161A', cursor: 'pointer', font: `600 14px/1 ${FONT}` }
    const btnG: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--cell)', cursor: 'pointer', font: `400 14px/1 ${FONT}` }
    const goToday = () => { const d = new Date(); this.go(d.getFullYear(), d.getMonth()) }
    const habitName = H.name

    return (
      <>
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
          {discs.map(([st1, tr], i) => <div key={i} className="disc" style={{ position: 'absolute', ...st1, transform: tr }} />)}
        </div>

        <div className="app" style={{ ['--wn' as any]: sw ? '18px' : '0px' }}>
          <div className="main">

          <header className="rise glassfade" style={{ flex: 'none', height: 64, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '6px 7px 6px 16px', borderRadius: 20, ...glass() }}>
            <button className="tap" data-anim="title" onClick={goToday} aria-label="Go to today" style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ font: `300 24px/1.05 ${FONT}`, letterSpacing: '-.02em' }}>{MONTHS[s.m]}</span>
              <span style={{ font: `300 12px/1.2 ${FONT}` }}>{s.y}</span>
            </button>
            <button data-anim="badge" aria-label={`${habitName}: ${st.cur}-day streak, next milestone ${nx}.${nH > 1 ? ` Habit ${hi + 1} of ${nH}.` : ''} Tap to manage habits${nH > 1 ? ', swipe up or down to switch.' : '.'}`}
              onClick={this.bClick} onKeyDown={this.bKey} onPointerDown={this.bDown} onPointerMove={this.bMove} onPointerUp={this.bUp} onPointerCancel={this.bCancel} onContextMenu={e => e.preventDefault()}
              style={{ position: 'relative', flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 50, padding: `0 ${nH > 1 ? 10 : 14}px 4px 12px`, boxSizing: 'border-box', border: 0, borderRadius: 15, background: 'var(--c10)', color: '#14161A', overflow: 'hidden', cursor: 'pointer', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}>
              <span data-anim="drain" aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(20,22,26,.3)', transform: 'scaleY(0)', transformOrigin: 'top', pointerEvents: 'none' }} />
              <span data-anim="hroll" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9 }}>
                <span data-anim="streak" style={{ font: `600 28px/1 ${FONT}`, fontVariantNumeric: 'tabular-nums', minWidth: 18, textAlign: 'right' }}>{st.cur}</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', font: `500 11px/1.15 ${FONT}`, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  <span style={{ maxWidth: 84, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habitName}</span>
                  <span>streak</span>
                </span>
              </span>
              {nH > 1 && <span aria-hidden="true" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: 6 }}>
                {dots.map((o, i) => <span key={i} style={{ display: 'block', width: o.s, height: o.s, borderRadius: '50%', background: o.bg, transition: 'width .25s,height .25s,background-color .25s' }} />)}
              </span>}
              <span aria-hidden="true" style={{ position: 'absolute', left: 12, right: nH > 1 ? 26 : 14, bottom: 5, height: 3, borderRadius: 2, background: 'rgba(20,22,26,.18)', overflow: 'hidden' }}>
                <span data-anim="bar" style={{ display: 'block', height: '100%', borderRadius: 2, background: '#14161A', transformOrigin: 'left', transform: `scaleX(${this.nums.bar})` }} />
              </span>
            </button>
          </header>

          <section className="rise glassfade" onPointerDown={this.gDown} onPointerMove={this.gMove} onPointerUp={this.gUp} onPointerCancel={this.gCancel} style={{ animationDelay: '40ms', flex: 'none', padding: 10, borderRadius: 22, ...glass(), display: 'flex', flexDirection: 'column', gap: 8, touchAction: 'pinch-zoom' }}>
            <div className="navrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 44 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="glassfade" aria-label="Previous month" onClick={() => this.shift(-1)} style={{ ...sq(44), font: '300 24px/1 sans-serif' }}>‹</button>
                <button className="glassfade" aria-label="Next month" onClick={() => this.shift(1)} style={{ ...sq(44), font: '300 24px/1 sans-serif' }}>›</button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="glassfade" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={this.toggleTheme} style={sq(44)}>
                  {dark
                    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></svg>
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" /></svg>}
                </button>
                <button className="glassfade" onClick={goToday} style={{ ...sq(44), width: 'auto', padding: '0 16px', font: `400 14px/1 ${FONT}` }}>Today</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 18, flex: 'none' }}>
                {sw && <div className="wkn" style={{ height: 14 }} />}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ height: 'var(--c)', display: 'grid', placeItems: 'center', font: `${i === 0 ? 700 : 500} 14px/1 sans-serif`, color: i === 0 ? 'var(--red)' : undefined }}>{d}</div>)}
              </div>
              <div data-anim="grid" style={{ display: 'flex', gap: 4 }}>
                {weeks.map((w: any, wi: number) => (
                  <div key={wi} style={{ width: 'var(--c)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sw && <div className="wkn" style={{ height: 14, textAlign: 'center', font: '400 10px/14px ui-monospace,Menlo,monospace' }}>{w.wk}</div>}
                    {w.days.map((d: any) => (
                      <button key={d.key} data-key={d.key} data-day={d.key} aria-label={d.aria} onClick={this.dayClick} onKeyDown={this.onKey} onContextMenu={e => e.preventDefault()}
                        style={{ width: 'var(--c)', height: 'var(--c)', padding: 0, position: 'relative', zIndex: d.z, border: 0, borderRadius: 12, background: 'none', cursor: 'pointer', touchAction: 'pinch-zoom', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', opacity: d.op, perspective: 'calc(var(--c) * 4)', font: `${d.weight} clamp(14px, calc(var(--c) * .36), 22px)/1 ${FONT}` } as React.CSSProperties}>
                        <span style={{ position: 'absolute', inset: 0, display: 'block', transformStyle: 'preserve-3d', transform: `translateZ(calc(var(--c) / -2)) rotateY(${d.ang}deg)`, transition: d.cubeTr }}>
                          <CubeFace name="f" v={d.f} num={d.num} />
                          <CubeFace name="l" v={d.l} num={d.num} />
                          <CubeFace name="r" v={d.r} num={d.num} />
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
          </div>

          <div className="rise cards" style={{ animationDelay: '80ms' }}>
            <section data-anim="monthcard" className="glassfade" style={{ padding: '11px 14px', borderRadius: 20, background: 'var(--card30)', color: '#fff', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>
              <div style={lbl}>This month</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {([['Done', 'mt', V.mt], ['Missed', 'mx', V.mx]] as const).map(([l, a, v]) => <div key={a} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}><span style={{ font: `300 14px/1.2 ${FONT}` }}>{l}</span><span data-anim={a} style={{ font: `400 20px/1 ${FONT}`, fontVariantNumeric: 'tabular-nums' }}>{v}</span></div>)}
                <div style={{ height: 1, background: 'rgba(255,255,255,.4)' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}><span style={{ font: `300 14px/1.2 ${FONT}` }}>Best streak</span><span data-anim="best" style={{ font: `400 20px/1 ${FONT}`, fontVariantNumeric: 'tabular-nums' }}>{st.best}</span></div>
              </div>
            </section>
            <section className="glassfade" style={{ padding: '11px 14px', borderRadius: 20, ...glass(), display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
              <div style={lbl}>Next holidays</div>
              {upcoming.map((h: any) => (
                <button key={h.key} className={'tap ' + h.cls} data-key={h.key} onClick={() => { const d = parse(h.key); this.go(d.getFullYear(), d.getMonth(), h.key) }} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ font: `600 13px/1.2 ${FONT}`, color: 'var(--red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.when}</span>
                  <span style={{ font: `300 13px/1.25 ${FONT}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                </button>
              ))}
            </section>
          </div>
        </div>

        {s.toast && (
          <div role="status" style={{ position: 'fixed', left: '50%', bottom: 'calc(max(18px, env(safe-area-inset-bottom)) + var(--kb, 0px))', transform: 'translateX(-50%)', zIndex: 15, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px 8px 16px', borderRadius: 16, background: '#14161A', color: '#F4F6FA', boxShadow: '0 8px 24px rgba(0,0,0,.25)', animation: s.toastOut ? 'toastOut .18s ease forwards' : 'toastIn .24s cubic-bezier(.2,.8,.2,1)', whiteSpace: 'nowrap' }}>
            <span style={{ font: `400 14px/1.2 ${FONT}` }}>{s.toast.text}</span>
            <button onClick={this.undo} style={{ ...btnY, height: 36, padding: '0 14px', borderRadius: 10, font: `600 14px/1 ${FONT}` }}>Undo</button>
          </div>
        )}

        {s.sel && sel && (<>
          <div {...scrim(s.closing, () => this.closeSheet())} />
          <div role="dialog" aria-label="Day details" style={{ ...sheet(true, s.closing), gap: 14 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ font: `600 12px/1 ${FONT}`, letterSpacing: '.08em', textTransform: 'uppercase', color: sel.dayColor }}>{sel.weekday}</div>
                <div style={{ font: `300 30px/1.1 ${FONT}`, letterSpacing: '-.02em' }}>{sel.date}</div>
              </div>
              <button className="glassfade" aria-label="Close" onClick={() => this.closeSheet()} style={{ ...sq(44), font: '300 24px/1 sans-serif' }}>×</button>
            </div>
            {sel.hol && <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: `600 15px/1.3 ${FONT}`, color: 'var(--red)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flex: 'none' }} />{sel.hol}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 14px', borderRadius: 14, background: 'var(--cell)', border: '1px solid var(--line)' }}>
              <span style={{ font: `500 11px/1.4 ${FONT}`, letterSpacing: '.08em', textTransform: 'uppercase' }}>Tithi · approx.</span>
              <span style={{ font: `400 16px/1.35 ${FONT}` }}>{sel.tithi}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sel.facts.map((f: string) => <span key={f} style={{ padding: '8px 11px', borderRadius: 10, background: 'var(--cell)', border: '1px solid var(--line)', font: `300 13px/1 ${FONT}` }}>{f}</span>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
              <button className="glassfade" onClick={e => this.setMark(s.sel!, 't', false, e.currentTarget)} style={{ height: 48, borderRadius: 14, cursor: 'pointer', font: `500 15px/1 ${FONT}`, border: '1px solid var(--line)', background: sel.mark === 't' ? 'var(--tick)' : 'var(--cell)', color: sel.mark === 't' ? '#fff' : 'var(--ink)' }}>✓ Done</button>
              <button className="glassfade" onClick={() => this.setMark(s.sel!, 'x')} style={{ height: 48, borderRadius: 14, cursor: 'pointer', font: `500 15px/1 ${FONT}`, border: '1px solid var(--line)', background: sel.mark === 'x' ? 'var(--cross)' : 'var(--cell)', color: sel.mark === 'x' ? '#fff' : 'var(--ink)' }}>✕ Missed</button>
              <button className="glassfade" onClick={() => this.setMark(s.sel!, null)} style={{ height: 48, padding: '0 14px', borderRadius: 14, cursor: 'pointer', font: `400 14px/1 ${FONT}`, border: '1px solid var(--line)', background: 'var(--cell)' }}>Clear</button>
            </div>
            <textarea key={s.sel} defaultValue={sel.note} placeholder="Add a note for this day…" rows={3} onInput={e => this.noteInput(s.sel!, (e.target as HTMLTextAreaElement).value)} onBlur={() => this.flushNote()}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none', padding: '12px 14px', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--cell)', color: 'var(--ink)', font: `300 16px/1.4 ${FONT}` }} />
          </div>
        </>)}

        {s.hOpen && (<>
          <div {...scrim(s.hClosing, () => this.closeHabits())} />
          <div role="dialog" aria-label="Habits" style={{ ...sheet(true, s.hClosing), gap: 12 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ font: `300 28px/1.1 ${FONT}`, letterSpacing: '-.02em' }}>Habits</div>
              <button className="glassfade" aria-label="Close" onClick={() => this.closeHabits()} style={{ ...sq(44), font: '300 24px/1 sans-serif' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.habits.map((h, i) => {
                const ed = s.editId === h.id, cf = s.confirmId === h.id, isCur = h.id === s.cur, ticks = Object.values(h.marks).filter(v => v === 't').length
                const dis = (off: boolean): React.CSSProperties => ({ opacity: off ? .35 : 1 })
                return (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 50, padding: 4, boxSizing: 'border-box', borderRadius: 14, border: '1px solid var(--line)', background: isCur ? 'var(--cell)' : 'transparent' }}>
                    {!ed && !cf && (<>
                      <button className="tap" onClick={() => this.pickHabit(h.id, i)} aria-label={'Switch to ' + h.name + (isCur ? ', current habit' : '')} style={{ all: 'unset', cursor: 'pointer', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px 8px 8px' }}>
                        <span style={{ width: 10, height: 10, flex: 'none', boxSizing: 'border-box', borderRadius: '50%', border: '1.5px solid var(--ink)', background: isCur ? 'var(--c10)' : 'transparent' }} />
                        <span style={{ font: `400 16px/1.2 ${FONT}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                      </button>
                      <button className="glassfade" aria-label={'Move ' + h.name + ' up'} disabled={i === 0} onClick={() => this.moveHabit(h.id, -1)} style={{ ...rowBtn, ...dis(i === 0) }}>{ico('M12 19V5M6 11l6-6 6 6')}</button>
                      <button className="glassfade" aria-label={'Move ' + h.name + ' down'} disabled={i === nH - 1} onClick={() => this.moveHabit(h.id, 1)} style={{ ...rowBtn, ...dis(i === nH - 1) }}>{ico('M12 5v14M6 13l6 6 6-6')}</button>
                      <button className="glassfade" aria-label={'Rename ' + h.name} onClick={() => this.startEdit(h)} style={rowBtn}>{ico('M4 20h4L19 9l-4-4L4 16v4z')}</button>
                      <button className="glassfade" aria-label={'Delete ' + h.name} disabled={nH < 2} onClick={() => this.setState({ confirmId: h.id, editId: null })} style={{ ...rowBtn, ...dis(nH < 2) }}>{ico('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')}</button>
                    </>)}
                    {ed && (<>
                      <input data-hedit="1" value={s.editName} onChange={e => this.setState({ editName: e.target.value.slice(0, 24) })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); this.saveEdit() } else if (e.key === 'Escape') { e.preventDefault(); this.setState({ editId: null }) } }} aria-label="Habit name" placeholder="Habit name" style={{ ...input, flex: 1, height: 40, padding: '0 12px' }} />
                      <button className="glassfade" onClick={() => this.saveEdit()} style={{ ...btnY, height: 40, padding: '0 12px', borderRadius: 12 }}>Save</button>
                      <button className="glassfade" onClick={() => this.setState({ editId: null })} style={{ ...btnG, height: 40, padding: '0 12px', borderRadius: 12 }}>Cancel</button>
                    </>)}
                    {cf && (<>
                      <span style={{ flex: 1, minWidth: 0, padding: '0 6px', font: `400 14px/1.3 ${FONT}` }}>{`Delete ${h.name} and its ${ticks} ${ticks === 1 ? 'tick?' : 'ticks?'}`}</span>
                      <button className="glassfade" onClick={() => this.delHabit(h.id)} style={{ height: 40, padding: '0 12px', borderRadius: 12, border: 0, background: 'var(--cross)', color: '#fff', cursor: 'pointer', font: `600 14px/1 ${FONT}` }}>Delete</button>
                      <button className="glassfade" onClick={() => this.setState({ confirmId: null })} style={{ ...btnG, height: 40, padding: '0 12px', borderRadius: 12 }}>Cancel</button>
                    </>)}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={s.newName} onChange={e => this.setState({ newName: e.target.value.slice(0, 24) })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); this.addHabit() } }} aria-label="New habit name" placeholder="New habit name" style={{ ...input, flex: 1, height: 48, borderRadius: 14, padding: '0 14px' }} />
              <button className="glassfade" onClick={() => this.addHabit()} style={{ ...btnY, height: 48, padding: '0 18px', borderRadius: 14, font: `600 15px/1 ${FONT}` }}>Add</button>
            </div>

            <button className="tap" onClick={() => this.setState({ syncOpen: !s.syncOpen })} aria-expanded={s.syncOpen} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, font: `300 13px/1.3 ${FONT}` }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: store.state === 'idle' ? 'var(--tick)' : store.state === 'off' ? 'var(--line)' : store.state === 'syncing' ? 'var(--c10)' : 'var(--cross)' }} />
              {this.syncLabel()}
            </button>
            {s.syncOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--cell)' }}>
                <input value={s.syncUrl} onChange={e => this.setState({ syncUrl: e.target.value })} aria-label="Server URL" placeholder="Server URL (https://…)" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{ ...input, height: 44, padding: '0 12px', width: '100%' }} />
                <input value={s.syncToken} onChange={e => this.setState({ syncToken: e.target.value })} aria-label="Sync token" placeholder="Sync token" type="password" autoCapitalize="off" autoCorrect="off" spellCheck={false} style={{ ...input, height: 44, padding: '0 12px', width: '100%' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="glassfade" onClick={() => store.configure(s.syncUrl, s.syncToken)} style={{ ...btnY, flex: 1, height: 44, borderRadius: 12 }}>{store.enabled ? 'Update & sync' : 'Connect'}</button>
                  {store.enabled && <button className="glassfade" onClick={() => { store.disconnect(); this.setState({ syncUrl: '', syncToken: '' }) }} style={{ ...btnG, height: 44, padding: '0 14px', borderRadius: 12 }}>Disconnect</button>}
                </div>
              </div>
            )}

            <div style={lbl}>Backup</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="glassfade" onClick={this.copyBackup} style={{ ...btnG, flex: 1, height: 44, borderRadius: 12 }}>Copy backup</button>
              <button className="glassfade" onClick={() => this.setState({ bkOpen: !s.bkOpen, bkMsg: '', bkPending: null })} aria-expanded={s.bkOpen} style={{ ...btnG, flex: 1, height: 44, borderRadius: 12 }}>Restore…</button>
            </div>
            {s.bkMsg && <div role="status" style={{ font: `300 13px/1.35 ${FONT}` }}>{s.bkMsg}</div>}
            {s.bkOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--cell)' }}>
                {!s.bkPending ? (<>
                  <textarea value={s.bkText} onChange={e => this.setState({ bkText: e.target.value })} aria-label="Backup text" placeholder="Paste a backup here" rows={3} spellCheck={false} autoCapitalize="off" autoCorrect="off"
                    style={{ ...input, width: '100%', resize: 'none', padding: '10px 12px', font: `300 14px/1.35 ${FONT}` }} />
                  <button className="glassfade" onClick={this.checkBackup} disabled={!s.bkText.trim()} style={{ ...btnY, height: 44, borderRadius: 12, opacity: s.bkText.trim() ? 1 : .5 }}>Restore</button>
                </>) : (() => { const c = countOf(s.bkPending); return (<>
                  <span style={{ font: `400 14px/1.35 ${FONT}` }}>{`Add ${c.habits} habit${c.habits === 1 ? '' : 's'}, ${c.marks} marks and ${c.notes} note${c.notes === 1 ? '' : 's'} to this phone? Nothing here is deleted; where both have the same day, the backup wins.`}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="glassfade" onClick={this.applyBackup} style={{ ...btnY, flex: 1, height: 44, borderRadius: 12 }}>Restore</button>
                    <button className="glassfade" onClick={() => this.setState({ bkPending: null })} style={{ ...btnG, height: 44, padding: '0 14px', borderRadius: 12 }}>Cancel</button>
                  </div>
                </>) })()}
              </div>
            )}
          </div>
        </>)}
      </>
    )
  }
}
