import type { Timer } from '../domain/timer.ts'
import type { StartTimer, TimerPort } from './timerPort.ts'

interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }
interface State { current: Timer | null; finished: Timer[] }

const KEY = 'streakcal.timer'

export class WebTimerPort implements TimerPort {
  private kv: KV
  private now: () => number
  constructor(kv: KV, now: () => number = Date.now) { this.kv = kv; this.now = now }

  private read(): State {
    try { const s = JSON.parse(this.kv.getItem(KEY) || 'null'); if (s && Array.isArray(s.finished)) return s } catch { }
    return { current: null, finished: [] }
  }

  private due(): State {
    const s = this.read()
    if (s.current && this.now() >= s.current.endsAt) { s.finished.push(s.current); s.current = null; this.write(s) }
    return s
  }

  private write(s: State) { this.kv.setItem(KEY, JSON.stringify(s)) }

  async current() { return this.due().current }

  async start(t: StartTimer) {
    const s = this.due()
    if (s.current) throw new Error('busy')
    const startedAt = this.now()
    s.current = { habitId: t.habitId, kind: t.kind, startedAt, endsAt: startedAt + t.minutes * 60000 }
    this.write(s)
    return s.current
  }

  async cancel() { const s = this.due(); s.current = null; this.write(s) }

  async drain() { const s = this.due(), out = s.finished; s.finished = []; this.write(s); return out }
}
