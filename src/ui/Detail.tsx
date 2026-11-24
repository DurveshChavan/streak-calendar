import React from 'react'
import { kindOf, type Habit, type WeekStart } from '../domain/types'
import { trend } from '../domain/progress'
import { badge, weekLine } from '../domain/badge'
import { timerKind, timerMinutes } from '../domain/timer'
import Sheet, { btn, eyebrow } from './Sheet'
import { FONT } from './style'

export default function Detail({ habit, today, ws, onStart, onEdit, onClose }: { habit: Habit; today: string; ws: WeekStart; onStart(): void; onEdit(): void; onClose(): void }) {
  const b = badge(habit, today, ws), weeks = trend(habit, today, ws), max = Math.max(1, ...weeks.map(w => Math.max(w.amount, w.of || 0)))
  const tk = timerKind(habit), tile: React.CSSProperties = { padding: '12px 14px', borderRadius: 16, background: 'var(--cell)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }
  const kindLabel = { daily: 'Every day', weekly: `${habit.goal || 1} days a week`, reduce: 'Break a habit', number: 'Track a number' }[kindOf(habit)]
  return (
    <Sheet label="Habit details" title={habit.name} onClose={onClose}>
      <div style={eyebrow}>{kindLabel}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={tile}><span style={eyebrow}>Total</span><span style={{ font: `300 40px/1 ${FONT}`, fontVariantNumeric: 'tabular-nums' }}>{b.total}</span><span style={{ font: `300 13px/1.3 ${FONT}` }}>{b.sub}</span></div>
        <div style={tile}><span style={eyebrow}>This week</span><span style={{ font: `300 28px/1.1 ${FONT}`, fontVariantNumeric: 'tabular-nums' }}>{weekLine(habit, today, ws)}</span></div>
      </div>
      <div style={tile}>
        <span style={eyebrow}>Last 8 weeks</span>
        <div role="img" aria-label={'Last 8 weeks: ' + weeks.map(w => w.amount).join(', ')} style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, paddingTop: 6 }}>
          {weeks.map((w, i) => <div key={w.first} style={{ flex: 1, height: Math.max(3, (w.amount / max) * 84), borderRadius: 6, background: i === weeks.length - 1 ? 'var(--c10)' : w.met === false ? 'var(--cross)' : 'var(--tick)', opacity: w.amount ? 1 : .35 }} />)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: tk ? '1fr 1fr' : '1fr', gap: 8 }}>
        {tk && <button className="glassfade" onClick={onStart} style={btn(true)}>{tk === 'delay' ? 'Delay' : 'Start'} {timerMinutes(habit)} min</button>}
        <button className="glassfade" onClick={onEdit} style={btn(false)}>Edit habit</button>
      </div>
    </Sheet>
  )
}
