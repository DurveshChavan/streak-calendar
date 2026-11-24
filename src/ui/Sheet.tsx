import React from 'react'
import { FONT, glass, sq } from './style'

export const btn = (primary: boolean): React.CSSProperties => ({ minHeight: 48, padding: '0 18px', borderRadius: 14, cursor: 'pointer', font: `${primary ? 600 : 400} 15px/1 ${FONT}`, border: primary ? 0 : '1px solid var(--line)', background: primary ? 'var(--c10)' : 'var(--cell)', color: primary ? '#14161A' : 'var(--ink)' })
export const eyebrow: React.CSSProperties = { font: `500 12px/1.3 ${FONT}`, letterSpacing: '.02em' }

export default function Sheet({ label, title, onClose, z = 24, children }: { label: string; title: string; onClose(): void; z?: number; children: React.ReactNode }) {
  return (<>
    <div data-scrim="1" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: z - 1, background: 'rgba(0,0,0,.3)', animation: 'fadeIn .2s ease' }} />
    <div role="dialog" aria-modal="true" aria-label={label} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: z, maxWidth: 560, maxHeight: '90vh', overflow: 'auto', margin: '0 auto', padding: '10px 18px max(20px, env(safe-area-inset-bottom))', boxSizing: 'border-box', borderRadius: '26px 26px 0 0', ...glass(30, 1.4), borderBottom: 0, display: 'flex', flexDirection: 'column', gap: 14, color: 'var(--ink)', animation: 'sheetUp .25s cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, font: `300 28px/1.1 ${FONT}`, letterSpacing: '-.02em', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h2>
        <button className="glassfade" aria-label="Close" onClick={onClose} style={{ ...sq(44), font: '300 24px/1 sans-serif', color: 'var(--ink)' }}>×</button>
      </div>
      {children}
    </div>
  </>)
}
