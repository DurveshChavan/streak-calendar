import React from 'react'
import type { Habit } from '../domain/types'
import type { Timer } from '../domain/timer'
import Sheet, { btn, eyebrow } from './Sheet'
import { FONT } from './style'

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }

export default function TimerScreen({ timer, habit, onStop, onClose, onEnd, hint }: { timer: Timer; habit: Habit; onStop(): void; onClose(): void; onEnd(): void; hint?: string }) {
  const [now, setNow] = React.useState(Date.now())
  React.useEffect(() => {
    const i = setInterval(() => { const n = Date.now(); setNow(n); if (n >= timer.endsAt) { clearInterval(i); onEnd() } }, 250)
    return () => clearInterval(i)
  }, [timer.endsAt])
  const left = timer.endsAt - now, p = Math.min(1, Math.max(0, 1 - left / (timer.endsAt - timer.startedAt)))
  return (
    <Sheet label="Timer" title={habit.name} onClose={onClose}>
      <div style={eyebrow}>{timer.kind === 'delay' ? 'Wait it out. When the timer ends, one urge resisted is counted.' : 'Just start. When the timer ends, today is done.'}</div>
      <div role="timer" aria-live="off" style={{ font: `200 72px/1 ${FONT}`, textAlign: 'center', fontVariantNumeric: 'tabular-nums', padding: '12px 0' }}>{mmss(left)}</div>
      <div aria-hidden="true" style={{ height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}><div style={{ height: '100%', width: (p * 100).toFixed(1) + '%', background: 'var(--c10)', transition: 'width .25s linear' }} /></div>
      {timer.kind === 'delay' && habit.replacement && <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--cell)', border: '1px solid var(--line)' }}><div style={eyebrow}>Instead</div><div style={{ font: `400 18px/1.3 ${FONT}` }}>{habit.replacement}</div></div>}
      {hint && <div style={{ font: `300 13px/1.4 ${FONT}` }}>{hint}</div>}
      <button className="glassfade" onClick={onStop} style={btn(false)}>Stop timer</button>
      <div style={{ font: `300 12px/1.4 ${FONT}`, textAlign: 'center' }}>Stopping early counts nothing.</div>
    </Sheet>
  )
}
