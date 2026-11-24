import React from 'react'
import type { Prompt } from '../domain/rules'
import { MONTHS, parse } from '../domain/calendar'
import Sheet, { btn, eyebrow } from './Sheet'
import { FONT } from './style'

const short = (k: string) => { const d = parse(k); return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) }

export default function TwoMiss({ name, prompt, onChange, onKeep }: { name: string; prompt: Extract<Prompt, { kind: 'twoMiss' }>; onChange(): void; onKeep(): void }) {
  return (
    <Sheet label="Two misses in a row" title="Two misses in a row" onClose={onKeep}>
      <div style={{ font: `300 15px/1.4 ${FONT}` }}>{name} was missed two days in a row. What got in the way?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {prompt.days.map((d, i) => (
          <div key={d} style={{ padding: '12px 14px', borderRadius: 16, background: 'var(--cell)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 72 }}>
            <span style={eyebrow}>{short(d)}</span>
            <span style={{ font: `400 15px/1.35 ${FONT}`, opacity: prompt.reasons[i] ? 1 : .6 }}>{prompt.reasons[i] || 'No reason written'}</span>
          </div>
        ))}
      </div>
      <div style={{ font: `400 15px/1.4 ${FONT}` }}>Change the time, make it smaller, or keep it?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <button className="glassfade" onClick={onChange} style={btn(false)}>Change</button>
        <button className="glassfade" onClick={onChange} style={btn(false)}>Smaller</button>
        <button className="glassfade" onClick={onKeep} style={btn(true)}>Keep it</button>
      </div>
    </Sheet>
  )
}
