const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Opened { dialog: HTMLElement; opener: HTMLElement | null; key: string | null; text: string }

const keyOf = (e: HTMLElement | null) => {
  if (!e) return null
  for (const a of ['data-day', 'data-anim', 'aria-label']) { const v = e.getAttribute(a); if (v) return `[${a}="${CSS.escape(v)}"]` }
  return null
}

const visible = (e: HTMLElement) => e.offsetParent !== null || e === document.activeElement

function top(stack: Opened[]): Opened | undefined {
  let best: Opened | undefined, z = -Infinity
  for (const o of stack) { const v = Number(getComputedStyle(o.dialog).zIndex) || 0; if (v >= z) { z = v; best = o } }
  return best
}

const items = (d: HTMLElement) => [...d.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible)

export function initModals() {
  const stack: Opened[] = []
  let left: HTMLElement | null = null
  document.addEventListener('focusout', e => { if (e.target instanceof HTMLElement) left = e.target }, true)
  const open = (dialog: HTMLElement) => {
    if (stack.some(o => o.dialog === dialog)) return
    const a = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    const opener = a && !dialog.contains(a) ? a : left && !dialog.contains(left) ? left : null
    stack.push({ dialog, opener, key: keyOf(opener), text: opener?.textContent?.trim() || '' })
    dialog.setAttribute('aria-modal', 'true')
    if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1')
    requestAnimationFrame(() => { if (!dialog.contains(document.activeElement)) (dialog.querySelector<HTMLElement>('[autofocus]') || items(dialog)[0] || dialog).focus({ preventScroll: true }) })
  }
  const close = (o: Opened) => {
    stack.splice(stack.indexOf(o), 1)
    requestAnimationFrame(() => {
      const t = top(stack)
      if (t && t.dialog.contains(document.activeElement)) return
      const scope = t ? t.dialog : document
      const back = o.opener?.isConnected ? o.opener
        : o.key ? scope.querySelector<HTMLElement>(o.key)
        : o.text ? [...scope.querySelectorAll<HTMLElement>('button')].find(b => b.textContent?.trim() === o.text) || null : null
      if (back && (!t || t.dialog.contains(back))) back.focus({ preventScroll: true })
      else if (t) (items(t.dialog)[0] || t.dialog).focus({ preventScroll: true })
    })
  }
  const scan = () => {
    for (const d of document.querySelectorAll<HTMLElement>('[role="dialog"]')) open(d)
    for (const o of [...stack]) if (!o.dialog.isConnected) close(o)
  }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true })
  scan()
  document.addEventListener('keydown', e => {
    const t = top(stack)
    if (!t) return
    if (e.key === 'Escape') {
      const c = [...t.dialog.querySelectorAll<HTMLElement>('[aria-label="Close"]')].find(visible)
      if (c) { e.preventDefault(); const a = document.activeElement; if (a instanceof HTMLElement && t.dialog.contains(a)) a.blur(); c.click() }
      return
    }
    if (e.key !== 'Tab') return
    const list = items(t.dialog)
    if (!list.length) { e.preventDefault(); t.dialog.focus(); return }
    const i = list.indexOf(document.activeElement as HTMLElement)
    if (i < 0) { e.preventDefault(); list[e.shiftKey ? list.length - 1 : 0].focus(); return }
    if (!e.shiftKey && i === list.length - 1) { e.preventDefault(); list[0].focus() }
    else if (e.shiftKey && i === 0) { e.preventDefault(); list[list.length - 1].focus() }
  })
}
