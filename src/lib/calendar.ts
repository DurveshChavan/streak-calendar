// Date helpers + Indian holiday / Panchang engine, ported 1:1 from the design.
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const WD = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MASA = ['Chaitra','Vaishakh','Jyeshtha','Ashadh','Shravan','Bhadrapad','Ashwin','Kartik','Margashirsha','Paush','Magh','Phalgun']
const TITHI = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi']
const FIXED: Record<string,string> = {'01-26':'Republic Day','02-19':'Chhatrapati Shivaji Maharaj Jayanti','04-14':'Dr. Babasaheb Ambedkar Jayanti','05-01':'Maharashtra Din','08-15':'Independence Day','10-02':'Gandhi Jayanti','12-25':'Christmas'}
// Exact published dates where known; other years are calculated
const KNOWN: Record<number, Record<string,string>> = {2026:{'2026-02-15':'Mahashivratri','2026-03-03':'Holi (Dhulivandan)','2026-03-19':'Gudhi Padwa','2026-03-21':'Ramzan Eid','2026-03-26':'Ram Navami','2026-03-31':'Mahavir Jayanti','2026-04-03':'Good Friday','2026-05-01':'Buddha Pournima','2026-05-28':'Bakri Eid','2026-06-26':'Muharram','2026-08-15':'Parsi New Year','2026-08-26':'Id-e-Milad','2026-09-14':'Ganesh Chaturthi','2026-10-20':'Dasara','2026-11-08':'Diwali (Lakshmi Pujan)','2026-11-10':'Diwali (Bali Pratipada)','2026-11-11':'Bhaubeej','2026-11-24':'Guru Nanak Jayanti'}}
// [name, masa, tithi, hourUTC, dayOffset]
const LUNAR: [string,number,number,number,number][] = [['Mahashivratri',10,28,18.5,0],['Holi (Dhulivandan)',11,14,13,1],['Gudhi Padwa',0,0,0.75,0],['Ram Navami',0,8,0.75,0],['Mahavir Jayanti',0,12,0.75,0],['Buddha Pournima',1,14,0.75,0],['Ganesh Chaturthi',5,3,0.75,0],['Dasara',6,9,0.75,0],['Diwali (Lakshmi Pujan)',6,29,13,0],['Diwali (Bali Pratipada)',7,0,0.75,0],['Bhaubeej',7,1,0.75,0],['Guru Nanak Jayanti',7,14,0.75,0]]
const ISLAMIC: [string,number,number][] = [['Muharram',1,10],['Id-e-Milad',3,12],['Ramzan Eid',10,1],['Bakri Eid',12,10]]

export const pad = (n: number) => String(n).padStart(2, '0')
export const keyOf = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
export const parse = (k: string) => { const [a, b, c] = k.split('-').map(Number); return new Date(a, b - 1, c) }
const R = Math.PI / 180
const n360 = (a: number) => ((a % 360) + 360) % 360
const S = (x: number) => Math.sin(x * R)
const sunLon = (d: number) => { const g = 357.529 + 0.98560028 * d, L = 280.459 + 0.98564736 * d; return n360(L + 1.915 * S(g) + 0.020 * S(2 * g)) }
const moonLon = (d: number) => { const L = 218.316 + 13.176396 * d, M = 134.963 + 13.064993 * d, D = 297.850 + 12.190749 * d, F = 93.272 + 13.229350 * d, g = 357.529 + 0.98560028 * d; return n360(L + 6.289 * S(M) + 1.274 * S(2 * D - M) + 0.658 * S(2 * D) + 0.214 * S(2 * M) - 0.186 * S(g) - 0.114 * S(2 * F) + 0.059 * S(2 * D - 2 * M) + 0.057 * S(2 * D - g - M) + 0.053 * S(2 * D + M) + 0.046 * S(2 * D - g) - 0.041 * S(g - M) - 0.035 * S(D) - 0.031 * S(g + M)) }
const elong = (d: number) => n360(moonLon(d) - sunLon(d))
const rashi = (t: number) => Math.floor(n360(sunLon(t) - (23.86 + t / 365.25 * 0.01397)) / 30)
const newMoon = (t: number) => { for (let i = 0; i < 4; i++) { let e = elong(t); if (e > 180) e -= 360; t -= e / 12.1907 } return t }
const jdays = (dt: Date, h: number) => (Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) + h * 36e5 - Date.UTC(2000, 0, 1, 12)) / 864e5
export function panchang(dt: Date, h = 0.75) { const d = jdays(dt, h), e = elong(d), t = Math.floor(e / 12), a = newMoon(d - e / 12.1907), b = newMoon(a + 29.53), r = rashi(a); return { t, mo: (r + 1) % 12, adhik: r === rashi(b) } }
export function tithiLabel(p: { t: number; mo: number; adhik: boolean }) { const shukla = p.t < 15, i = p.t % 15; const name = i === 14 ? (shukla ? 'Purnima' : 'Amavasya') : TITHI[i]; return (p.adhik ? 'Adhik ' : '') + MASA[p.mo] + ' · ' + (shukla ? 'Shukla' : 'Krishna') + ' ' + name }
function easter(y: number) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, da) }
function hijri(y: number, m: number, d: number) { const jd = d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948439.5 - 1; const u = new Date((jd - 2440587.5) * 864e5); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate() + 1) }

const HCACHE: Record<number, Record<string,string[]>> = {}
export function holidaysFor(y: number): Record<string,string[]> {
  if (HCACHE[y]) return HCACHE[y]
  const map: Record<string,string[]> = {}
  const add = (k: string, n: string) => { (map[k] = map[k] || []).includes(n) || map[k].push(n) }
  Object.entries(FIXED).forEach(([md, n]) => add(y + '-' + md, n))
  if (KNOWN[y]) Object.entries(KNOWN[y]).forEach(([k, n]) => add(k, n))
  else {
    const gf = easter(y); gf.setDate(gf.getDate() - 2); add(keyOf(gf), 'Good Friday')
    add(y + '-08-15', 'Parsi New Year')
    const hy = Math.floor((y - 622) * 33 / 32)
    for (let h = hy - 1; h <= hy + 2; h++) ISLAMIC.forEach(([n, m, d]) => { const dt = hijri(h, m, d); if (dt.getFullYear() === y) add(keyOf(dt), n) })
    const cache: Record<string, ReturnType<typeof panchang>> = {}
    const P = (dt: Date, hr: number) => { const k = keyOf(dt) + hr; return cache[k] || (cache[k] = panchang(dt, hr)) }
    const days: Date[] = []; for (let i = 0; i < 366; i++) { const dt = new Date(y, 0, 1 + i); if (dt.getFullYear() !== y) break; days.push(dt) }
    LUNAR.forEach(([n, mo, t, hr, off]) => {
      let f = days.find(dt => { const p = P(dt, hr); return p.mo === mo && !p.adhik && p.t === t })
      if (!f) f = days.find(dt => { const p = P(dt, hr); return p.mo === mo && !p.adhik && p.t === (t + 1) % 30 })
      if (f) { const dt = new Date(f); dt.setDate(dt.getDate() + off); if (dt.getFullYear() === y) add(keyOf(dt), n) }
    })
  }
  return HCACHE[y] = map
}
export const holiday = (k: string) => (holidaysFor(+k.slice(0, 4))[k] || []).join(' · ')
export const isoWeek = (d: Date) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((+t - +y0) / 864e5 + 1) / 7) }
export const dayOfYear = (d: Date) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 864e5) + 1
export const short = (d: Date) => WD[d.getDay()].slice(0, 3) + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3)
