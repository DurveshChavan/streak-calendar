let native = 0

function update() {
  const vv = window.visualViewport
  const web = vv && Math.abs(vv.scale - 1) < 0.01 ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0
  const kb = Math.max(native, web > 80 ? web : 0)
  const root = document.documentElement, next = kb + 'px'
  if (root.style.getPropertyValue('--kb') === next) return
  root.style.setProperty('--kb', next)
  const a = document.activeElement as HTMLElement | null
  if (kb > 0 && a && a.closest('[role=dialog]')) setTimeout(() => a.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 240)
}

export function initKeyboard() {
  window.addEventListener('nativekeyboard', e => { native = Math.max(0, Number((e as CustomEvent).detail?.height) || 0); update() })
  window.visualViewport?.addEventListener('resize', update)
  window.visualViewport?.addEventListener('scroll', update)
  update()
}
