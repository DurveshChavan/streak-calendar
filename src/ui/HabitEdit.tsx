import React from 'react'
import type { Habit, Kind } from '../domain/types'
import { fromForm, toForm, kindChoices, DEFAULT_TIMER, type HabitForm } from '../domain/habitForm'
import { FONT, sq } from './style'

const KIND_LABEL: Record<Kind, [string, string]> = {
  daily: ['Every day', 'Due each day. Counts in today’s score.'],
  weekly: ['Some days a week', 'A goal of N days a week.'],
  reduce: ['Break a habit', 'Count urges you resist. Optional weekly budget.'],
  number: ['Track a number', 'One value a day, like pages or minutes.'],
}

interface Props { old?: Habit; newId: string; onSave(h: Habit): void; onCancel(): void; onLater?(): void }

export default function HabitEdit({ old, newId, onSave, onCancel, onLater }: Props) {
  const [f, setF] = React.useState<HabitForm>(() => toForm(old))
  const [err, setErr] = React.useState('')
  const set = (k: keyof HabitForm) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const save = () => { const r = fromForm(f, old?.id || newId, old); if (r.habit) onSave(r.habit); else setErr(r.error || '') }
  const input: React.CSSProperties = { boxSizing: 'border-box', width: '100%', height: 48, padding: '0 14px', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--cell)', color: 'var(--ink)', font: `400 16px/1 ${FONT}` }
  const field = (label: string, k: keyof HabitForm, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, font: `400 13px/1.3 ${FONT}` }}>
      {label}
      <input value={f[k]} onChange={set(k)} style={input} {...props} />
    </label>
  )
  const choices = kindChoices(old)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ font: `300 28px/1.1 ${FONT}`, letterSpacing: '-.02em' }}>{old ? 'Edit habit' : 'New habit'}</div>
        <button className="glassfade" aria-label="Close" onClick={onCancel} style={{ ...sq(44), font: '300 24px/1 sans-serif', color: 'var(--ink)' }}>×</button>
      </div>
      {field('Name', 'name', { maxLength: 24, placeholder: 'Read 10 pages', autoFocus: !old })}
      {choices.length > 1 && <div role="radiogroup" aria-label="Kind" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {choices.map(k => (
          <button key={k} role="radio" aria-checked={f.kind === k} onClick={() => setF({ ...f, kind: k })} className="glassfade"
            style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 14, cursor: 'pointer', color: 'var(--ink)', border: f.kind === k ? '2px solid var(--ink)' : '1px solid var(--line)', background: 'var(--cell)' }}>
            <span style={{ font: `600 14px/1.2 ${FONT}` }}>{KIND_LABEL[k][0]}</span>
            <span style={{ font: `300 12px/1.3 ${FONT}` }}>{KIND_LABEL[k][1]}</span>
          </button>
        ))}
      </div>}
      {choices.length === 1 && <div style={{ font: `300 13px/1.3 ${FONT}` }}>{KIND_LABEL[f.kind][0]}. {KIND_LABEL[f.kind][1]}</div>}
      {f.kind === 'weekly' && field('Days a week', 'goal', { inputMode: 'numeric', placeholder: '3' })}
      {f.kind === 'reduce' && field('Weekly budget (optional)', 'budget', { inputMode: 'numeric', placeholder: 'No budget' })}
      {f.kind === 'reduce' && field('Instead, I will…', 'replacement', { maxLength: 80, placeholder: 'Walk outside' })}
      {f.kind === 'number' && field('Unit (optional)', 'unit', { maxLength: 24, placeholder: 'pages' })}
      {f.kind === 'number' && field('Weekly target (optional)', 'target', { inputMode: 'decimal', placeholder: 'No target' })}
      {f.kind !== 'number' && field(f.kind === 'reduce' ? 'Delay timer, minutes' : 'Start timer, minutes', 'timerMin', { inputMode: 'numeric', placeholder: String(DEFAULT_TIMER[f.kind]) })}
      {err && <div role="alert" style={{ font: `500 14px/1.3 ${FONT}` }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <button className="glassfade" onClick={save} style={{ height: 48, borderRadius: 14, border: 0, background: 'var(--c10)', color: '#14161A', cursor: 'pointer', font: `600 15px/1 ${FONT}` }}>Save habit</button>
        <button className="glassfade" onClick={onCancel} style={{ height: 48, padding: '0 18px', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--cell)', color: 'var(--ink)', cursor: 'pointer', font: `400 15px/1 ${FONT}` }}>Cancel</button>
      </div>
      {old && onLater && <button className="glassfade" onClick={onLater} style={{ height: 44, borderRadius: 14, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', font: `400 14px/1 ${FONT}` }}>Move to Later</button>}
    </div>
  )
}
