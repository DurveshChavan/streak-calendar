// Dev tool: draws PreviewTool's JSON with Canvas 2D, mirroring WidgetRenderer.java, and saves PNGs.
// node render.cjs <json> <out.png> [backdrop: none|app|photo]
const { chromium } = require('playwright')
const path = require('path'), fs = require('fs')
const fontB64 = w => fs.readFileSync(path.resolve(__dirname, `../../node_modules/@fontsource/roboto/files/roboto-latin-${w}-normal.woff2`)).toString('base64')
;(async () => {
  const [jsonFile, outFile, backdrop = 'none'] = process.argv.slice(2)
  const spec = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  const fonts = Object.fromEntries([300, 400, 500, 700].map(w => [w, fontB64(w)]))
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: spec.w, height: spec.h } })
  await p.setContent(`<style>html,body{margin:0;background:transparent}</style><canvas id=c width=${spec.w} height=${spec.h}></canvas>`)
  await p.evaluate(async ({ spec, backdrop, fonts }) => {
    for (const [w, b64] of Object.entries(fonts)) { const f = new FontFace('R', Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)).buffer, { weight: w }); await f.load(); document.fonts.add(f) }
    const c = document.getElementById('c').getContext('2d'), d = spec.density
    const col = v => { v = v >>> 0; return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${((v >>> 24) / 255).toFixed(4)})` }
    const W = { light: 300, regular: 400, medium: 500, bold: 700 }
    if (backdrop !== 'none') { // what the glass sits on (the picker preview uses the app's own backdrop)
      c.save(); c.beginPath(); c.roundRect(0, 0, spec.w, spec.h, 26 * d); c.clip()
      if (backdrop === 'app') {
        c.fillStyle = '#B7D8F5'; c.fillRect(0, 0, spec.w, spec.h)
        const disc = (x, y, r, f) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = f; c.fill() }
        disc(spec.w * 1.02, spec.h * 0.02, spec.w * 0.52, '#E10600'); disc(spec.w * 0.02, spec.h * 0.58, spec.w * 0.17, '#FFD700')
        disc(spec.w * 0.55, spec.h * 1.08, spec.w * 0.40, '#E10600'); disc(spec.w * 0.92, spec.h * 0.70, spec.w * 0.08, '#FFD700')
      } else { // a busy, photo-like wallpaper to check legibility
        const g = c.createLinearGradient(0, 0, spec.w, spec.h); g.addColorStop(0, '#1d3b5a'); g.addColorStop(.45, '#e08a3c'); g.addColorStop(.7, '#f4e3c1'); g.addColorStop(1, '#2c5d3f')
        c.fillStyle = g; c.fillRect(0, 0, spec.w, spec.h)
        for (let i = 0; i < 40; i++) { c.beginPath(); c.arc((i * 97) % spec.w, (i * 173) % spec.h, 18 * d + (i % 5) * 9 * d, 0, 7); c.fillStyle = `rgba(255,255,255,${0.05 + (i % 4) * 0.06})`; c.fill() }
      }
      c.restore()
    }
    const ell = (s, max) => { if (c.measureText(s).width <= max) return s; while (s.length > 1 && c.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…' }
    for (const o of spec.ops) {
      c.save()
      if (o.type === 0) {
        if (o.fill) { c.fillStyle = col(o.fill); c.beginPath(); c.roundRect(o.l, o.t, o.r - o.l, o.b - o.t, o.radius); c.fill() }
        if (o.gradTop && o.gradH > 0) { const g = c.createLinearGradient(0, o.t, 0, o.t + o.gradH); g.addColorStop(0, col(o.gradTop)); g.addColorStop(1, col(o.gradTop & 0xFFFFFF)); c.fillStyle = g; c.beginPath(); c.roundRect(o.l, o.t, o.r - o.l, o.b - o.t, o.radius); c.fill() }
        if (o.stroke && o.strokeWidth > 0) { const h = o.strokeWidth / 2; c.strokeStyle = col(o.stroke); c.lineWidth = o.strokeWidth; c.beginPath(); c.roundRect(o.l + h, o.t + h, o.r - o.l - 2 * h, o.b - o.t - 2 * h, Math.max(0, o.radius - h)); c.stroke() }
      } else if (o.type === 1) {
        c.font = `${W[o.font] || 400} ${o.size}px R`; c.letterSpacing = (o.letterSpacing * o.size) + 'px'
        c.textAlign = ['left', 'center', 'right'][o.align]; c.fillStyle = col(o.color)
        if (o.shadowRadius > 0) { c.shadowBlur = o.shadowRadius * 2; c.shadowOffsetY = o.shadowRadius * .3; c.shadowColor = col(o.shadowColor) }
        c.fillText(o.maxWidth > 0 ? ell(o.text, o.maxWidth) : o.text, o.x, o.y)
      } else if (o.type === 2) {
        c.strokeStyle = col(o.color); c.lineWidth = o.strokeWidth; c.lineCap = 'round'; c.lineJoin = 'round'
        c.beginPath(); c.moveTo(o.pts[0], o.pts[1]); for (let i = 2; i + 1 < o.pts.length; i += 2) c.lineTo(o.pts[i], o.pts[i + 1]); c.stroke()
      } else { c.fillStyle = col(o.fill); c.beginPath(); c.arc(o.x, o.y, o.radius, 0, 7); c.fill() }
      c.restore()
    }
  }, { spec, backdrop, fonts })
  await p.locator('#c').screenshot({ path: outFile, omitBackground: true })
  await b.close()
})()
