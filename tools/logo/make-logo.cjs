// Usage: node tools/logo/make-logo.cjs <out-dir>, then copy mipmap-*/ into android/app/src/main/res and web/ into public/.
// Streak Calendar logo (concept C): one green "done" day on a frosted-glass panel over the app's red and yellow discs.
// Drawn on the 108-unit adaptive-icon canvas (visible area = the central 72, safe zone = 66 circle).
const { chromium } = require('playwright')
const fs = require('fs'), path = require('path')
const OUT = process.argv[2]
const discs = `<circle cx="88" cy="24" r="34" fill="#E10600"/><circle cx="22" cy="82" r="13" fill="#FFD700"/>`
function svg({ bg = true, viewBox = '0 0 108 108', mask = null }) {
  const clip = mask === 'circle' ? `<clipPath id="m"><circle cx="54" cy="54" r="36"/></clipPath>`
    : mask === 'rounded' ? `<clipPath id="m"><rect x="18" y="18" width="72" height="72" rx="16"/></clipPath>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><defs>${clip}
  <filter id="frost" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#14161A" flood-opacity=".24"/></filter>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="glass"><rect x="26" y="26" width="56" height="56" rx="15"/></clipPath></defs>
  <g ${mask ? 'clip-path="url(#m)"' : ''}>
   ${bg ? '<rect width="108" height="108" fill="#B7D8F5"/>' : ''}
   ${discs}
   <g clip-path="url(#glass)">
     <rect x="26" y="26" width="56" height="56" fill="#B7D8F5"/>
     <g filter="url(#frost)">${discs}</g>
     <rect x="26" y="26" width="56" height="56" fill="#fff" fill-opacity=".42"/>
     <rect x="26" y="26" width="56" height="56" fill="url(#sheen)"/>
   </g>
   <rect x="26.4" y="26.4" width="55.2" height="55.2" rx="14.6" fill="none" stroke="#14161A" stroke-opacity=".16" stroke-width=".8"/>
   <rect x="37" y="37" width="34" height="34" rx="9.5" fill="#0E8A43" filter="url(#lift)"/>
   <polyline points="45.5,54.5 51.5,60.5 63,48" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
  </g></svg>`
}
const jobs = []
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(dens)) {
  // adaptive foreground: the full 108 canvas, transparent where the background colour layer shows through
  jobs.push([`mipmap-${d}/ic_launcher_foreground.png`, svg({ bg: false }), 108 * k])
  // legacy (Android 6-7): pre-masked 48dp icons
  jobs.push([`mipmap-${d}/ic_launcher.png`, svg({ viewBox: '18 18 72 72', mask: 'rounded' }), 48 * k])
  jobs.push([`mipmap-${d}/ic_launcher_round.png`, svg({ viewBox: '18 18 72 72', mask: 'circle' }), 48 * k])
}
// web: maskable (content inside the 80% safe circle), apple touch icon, and the SVG favicon
jobs.push(['web/icon-192.png', svg({ viewBox: '9 9 90 90' }), 192], ['web/icon-512.png', svg({ viewBox: '9 9 90 90' }), 512], ['web/apple-touch-icon.png', svg({ viewBox: '12 12 84 84' }), 180])
jobs.push(['preview/sheet-big.png', svg({ viewBox: '18 18 72 72', mask: 'rounded' }), 512])
fs.mkdirSync(path.join(OUT, 'web'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'preview'), { recursive: true })
fs.writeFileSync(path.join(OUT, 'web/icon.svg'), svg({ viewBox: '18 18 72 72', mask: 'rounded' }))
fs.writeFileSync(path.join(OUT, 'web/icon-maskable.svg'), svg({ viewBox: '9 9 90 90' }))
;(async () => {
  const b = await chromium.launch()
  for (const [file, s, px] of jobs) {
    const p = await b.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 })
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>${s}`)
    fs.mkdirSync(path.join(OUT, path.dirname(file)), { recursive: true })
    await p.screenshot({ path: path.join(OUT, file), omitBackground: true }); await p.close()
  }
  await b.close(); console.log('rendered', jobs.length)
})()
