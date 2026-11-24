import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import fs from 'node:fs'
import path from 'node:path'

const [journey, outArg] = process.argv.slice(2)
const STATE = process.env.VERIFY_STATE || path.join(process.env.TMPDIR || '/tmp', 'streakcal-verify')
const port = fs.readFileSync(path.join(STATE, 'port'), 'utf8').trim()
const token = fs.readFileSync(path.join(STATE, 'token'), 'utf8').trim()
const base = `http://127.0.0.1:${port}/`
const out = path.resolve(outArg || `verify-evidence/${new Date().toISOString().replace(/[:.]/g, '-')}-${journey}`)
fs.mkdirSync(out, { recursive: true })
const log = []
const note = s => { log.push(s); console.log(s) }
const pad = n => String(n).padStart(2, '0')
const d = new Date(), today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ago = n => { const x = new Date(d); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}` }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, reducedMotion: process.env.MOTION ? 'no-preference' : 'reduce', colorScheme: process.env.DARK ? 'dark' : 'light' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

const shot = async name => { const f = path.join(out, name + '.png'); await page.screenshot({ path: f }); note(`shot ${f}`) }
const doc = () => page.evaluate(() => JSON.parse(localStorage.getItem('streakcal.v2') || 'null'))
const badge = () => page.locator('button[data-anim="badge"]').getAttribute('aria-label')
const cell = k => page.locator(`button[data-day="${k}"]`)
const expect = (cond, msg) => { note((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1 }
const open = async seed => {
  if (seed) await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1') } }, ['streakcal.v2', JSON.stringify(seed)])
  await page.goto(base); await cell(today).waitFor()
}

const journeys = {
  async 'mark-today'() {
    await open()
    await shot('1-before'); note('badge before: ' + await badge())
    await cell(today).focus(); await page.keyboard.press('ArrowLeft')
    await page.waitForFunction(k => document.querySelector(`button[data-day="${k}"]`).getAttribute('aria-label').endsWith(', done'), today)
    await shot('2-after'); const b = await badge(); note('badge after: ' + b)
    expect(/1 total/.test(b), 'badge shows 1 total')
    await page.reload(); await cell(today).waitFor()
    const a = await cell(today).getAttribute('aria-label')
    expect(a.endsWith(', done'), 'mark survives reload: ' + a)
    const dd = await doc(); expect(dd.habits[0].marks[today] === 't', `stored doc has marks[${today}] = 't'`)
    fs.writeFileSync(path.join(out, 'doc.json'), JSON.stringify(dd, null, 1))
  },
  async 'v2-upgrade'() {
    const v2 = { habits: [{ id: 'h1', name: 'Workout', marks: { [ago(2)]: 't', [ago(1)]: 'x', [today]: 't' } }], cur: 'h1', notes: { [ago(1)]: 'tired' }, theme: 'light' }
    fs.writeFileSync(path.join(out, 'seed-v2.json'), JSON.stringify(v2, null, 1))
    await open(v2); await shot('1-loaded'); const b = await badge(); note('badge: ' + b)
    expect(/Workout: 2 total/.test(b), '2.0 doc loads as Build daily with total 2')
    const a1 = await cell(ago(1)).getAttribute('aria-label'); expect(a1.endsWith(', missed'), 'missed day kept: ' + a1)
    const dd = await doc(); expect(dd.habits[0].kind === undefined || dd.habits[0].kind === 'daily', 'kind daily or absent: ' + dd.habits[0].kind)
    expect(dd.notes[ago(1)] === 'tired', 'day note kept'); expect(dd.settings && dd.settings.weekStart === 0, 'settings.weekStart defaults to 0')
    fs.writeFileSync(path.join(out, 'doc.json'), JSON.stringify(dd, null, 1))
  },
  async sync() {
    await open()
    await cell(today).focus(); await page.keyboard.press('ArrowLeft')
    await page.locator('button[data-anim="badge"]').click()
    await page.getByRole('dialog', { name: 'Habits' }).waitFor()
    await page.getByRole('button', { name: /tap to sync/ }).click()
    await page.getByLabel('Server URL').fill(base.slice(0, -1)); await page.getByLabel('Sync token').fill(token)
    await page.getByRole('button', { name: 'Connect' }).click()
    const ok = await page.getByRole('button', { name: /^Synced · / }).waitFor({ timeout: 20000 }).then(() => true, () => false)
    await shot('1-connected')
    const label = await page.getByRole('button', { name: /Sync|Synced|Offline|Saved/ }).first().innerText(); note('sync label: ' + label)
    expect(ok, 'sync label reaches "Synced · hh:mm"')
    const r = await fetch(base + 'api/sync', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ v: 3, since: 0, changes: [] }) }).then(r => r.json())
    fs.writeFileSync(path.join(out, 'server-records.json'), JSON.stringify(r, null, 1))
    expect(r.changes.some(c => c.key.startsWith('mark:') && c.key.includes(today) && c.value === 't'), `server holds mark for ${today}`)
  },
  async 'a11y-dialogs'() {
    await open()
    const focused = () => page.evaluate(() => { const e = document.activeElement; return { label: e?.getAttribute('aria-label') || e?.textContent?.trim().slice(0, 24), dialog: e?.closest('[role=dialog]')?.getAttribute('aria-label') || null } })
    const check = async (name, opener, openKeys) => {
      await opener.focus(); for (const k of openKeys) await page.keyboard.press(k)
      const dlg = page.getByRole('dialog', { name }); await dlg.waitFor(); await page.waitForTimeout(400)
      expect(await dlg.getAttribute('aria-modal') === 'true', `${name}: aria-modal="true"`)
      expect((await focused()).dialog === name, `${name}: focus moves into the dialog (${JSON.stringify(await focused())})`)
      let out = null
      for (let i = 0; i < 30 && !out; i++) { await page.keyboard.press('Tab'); const f = await focused(); if (f.dialog !== name) out = f }
      expect(!out, `${name}: Tab stays inside` + (out ? ` (escaped to ${JSON.stringify(out)})` : ''))
      for (let i = 0; i < 30 && !out; i++) { await page.keyboard.press('Shift+Tab'); const f = await focused(); if (f.dialog !== name) out = f }
      expect(!out, `${name}: Shift+Tab stays inside`)
      await shot('dialog-' + name.replace(/\W+/g, '-'))
      await page.keyboard.press('Escape'); await dlg.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(100)
      expect(await dlg.count() === 0, `${name}: Escape closes it`)
      const back = await opener.evaluate(e => e === document.activeElement)
      expect(back, `${name}: focus returns to the opener (${JSON.stringify(await focused())})`)
    }
    await check('Day details', cell(today), ['Enter'])
    await check('Habits', page.locator('button[data-anim="badge"]'), ['Enter'])
    await check('Habit details', page.getByRole('button', { name: /^Details for / }), ['Enter'])
    await page.locator('button[data-anim="badge"]').press('Enter'); await page.getByRole('dialog', { name: 'Habits' }).waitFor(); await page.waitForTimeout(300)
    await check('New habit', page.getByRole('button', { name: '+ New habit' }), ['Enter'])
    expect(await page.getByRole('dialog', { name: 'Habits' }).count() === 1, 'Habits stays open under New habit after Escape')
  },
  async 'keep-state'() {
    await open()
    await page.getByRole('button', { name: /^Details for / }).click()
    const det = page.getByRole('dialog', { name: 'Habit details' }); await det.waitFor()
    await det.getByRole('button', { name: /^Start \d+ min$/ }).click()
    await page.getByRole('dialog', { name: 'Timer' }).waitFor(); await page.keyboard.press('Escape')
    const pill = page.getByRole('button', { name: /^Timer/ }); await pill.waitFor({ timeout: 3000 })
    await page.locator('button[data-anim="badge"]').click(); await page.getByRole('dialog', { name: 'Habits' }).waitFor()
    await page.getByRole('dialog', { name: 'Habits' }).getByRole('button', { name: 'Close' }).click(); await page.waitForTimeout(500)
    await shot('1-after-habits-close')
    expect(await pill.count() === 1, 'timer pill survives closing the Habits sheet')
    const y = ago(1)
    await cell(y).focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300)
    await cell(y).click(); const sheet = page.getByRole('dialog', { name: 'Day details' }); await sheet.waitFor()
    await sheet.getByPlaceholder('Reason').fill('late shift'); await page.keyboard.press('Escape')
    await sheet.waitFor({ state: 'detached' })
    await cell(y).click(); await sheet.waitFor()
    const v = await sheet.getByPlaceholder('Reason').inputValue()
    await shot('2-reason-after-escape')
    expect(v === 'late shift', `reason typed then Escape is kept (got "${v}")`)
    const dd = await doc(); expect(dd.habits[0].reasons?.[y] === 'late shift', 'reason stored in doc')
  },
  async dark() {
    await open()
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await page.getByRole('button', { name: 'Switch to light mode' }).waitFor(); await shot('1-dark')
    const dd = await doc(); expect(dd.theme === 'dark', 'theme stored as dark')
  },
}

if (!journeys[journey]) { console.error('journeys: ' + Object.keys(journeys).join(', ')); process.exit(2) }
try { await journeys[journey]() } catch (e) { note('FAIL ' + e.message.split('\n')[0]); await shot('error').catch(() => {}); process.exitCode = 1 }
expect(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''))
fs.writeFileSync(path.join(out, 'log.txt'), log.join('\n') + '\n')
console.log('evidence ' + out)
await browser.close()
