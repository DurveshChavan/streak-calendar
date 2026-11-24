import React from 'react'
import type { ReviewRow } from '../domain/review'
import { MONTHS, parse } from '../domain/calendar'
import Sheet, { btn, eyebrow } from './Sheet'
import { FONT } from './style'

const short = (k: string) => { const d = parse(k); return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) }

export default function Review({ rows, onDone, onClose }: { rows: ReviewRow[]; onDone(): void; onClose(): void }) {
  return (
    <Sheet label="Weekly review" title="This week" onClose={onClose}>
      {rows.map(r => (
        <div key={r.habit} style={{ padding: '12px 14px', borderRadius: 16, background: 'var(--cell)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <span style={{ font: `500 16px/1.2 ${FONT}`, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span style={{ font: `400 16px/1 ${FONT}`, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.line}{r.met === true ? ' ✓' : ''}</span>
          </div>
          {r.average !== undefined && <span style={{ font: `300 13px/1.3 ${FONT}` }}>Average {r.average} a day</span>}
          {r.reasons.map(x => <div key={x.day} style={{ font: `300 14px/1.4 ${FONT}` }}><span style={eyebrow}>{short(x.day)} · </span>{x.text}</div>)}
        </div>
      ))}
      <button className="glassfade" onClick={onDone} style={btn(true)}>Done for this week</button>
    </Sheet>
  )
}
