import type React from 'react'

export const FONT = "Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif"
export const EASE = 'cubic-bezier(.2,.8,.2,1)'
export const glass = (blur = 22, sat = 1.6): React.CSSProperties => ({ background: 'var(--glass)', backdropFilter: `blur(${blur}px) saturate(${sat})`, WebkitBackdropFilter: `blur(${blur}px) saturate(${sat})`, border: 0, boxShadow: 'inset 0 0 0 1px var(--rim), inset 0 1px 0 var(--rim-hi), var(--lift)' })
export const sq = (w: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ width: w, height: w, flex: 'none', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--cell)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, ...extra })
