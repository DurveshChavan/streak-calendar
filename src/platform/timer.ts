import { Capacitor, registerPlugin } from '@capacitor/core'
import type { Timer } from '../domain/timer.ts'
import { WebTimerPort } from './webTimer.ts'
import type { StartTimer, TimerPort } from './timerPort.ts'

interface Bridge {
  current(): Promise<{ timer: Timer | null }>
  start(t: StartTimer): Promise<{ timer: Timer }>
  cancel(): Promise<void>
  drain(): Promise<{ timers: Timer[] }>
  permission(): Promise<{ state: string }>
  requestPermission(): Promise<{ state: string }>
}

class NativeTimerPort implements TimerPort {
  private b = registerPlugin<Bridge>('TimerBridge')
  async current() { return (await this.b.current()).timer }
  async start(t: StartTimer) {
    try { return (await this.b.start(t)).timer } catch (e: any) { throw new Error(String(e?.message || e).includes('busy') ? 'busy' : 'failed') }
  }
  async cancel() { await this.b.cancel() }
  async drain() { return (await this.b.drain()).timers || [] }
  async notifications() { const r = await this.b.requestPermission(); return r.state === 'granted' }
}

export const timerPort: TimerPort & { notifications?(): Promise<boolean> } = Capacitor.isNativePlatform() ? new NativeTimerPort() : new WebTimerPort(localStorage)
