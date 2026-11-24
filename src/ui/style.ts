import type React from 'react'

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Roboto,sans-serif"
export const EASE = 'cubic-bezier(.2,.8,.2,1)'
export const glass = (blur = 20, sat = 1.3): React.CSSProperties => ({ background: 'var(--glass)', backdropFilter: `blur(${blur}px) saturate(${sat})`, WebkitBackdropFilter: `blur(${blur}px) saturate(${sat})`, border: '1px solid var(--line)' })
export const sq = (w: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ width: w, height: w, flex: 'none', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--cell)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, ...extra })
