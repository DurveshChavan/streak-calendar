# Mark a day

## Sub-features
- Done / missed from the calendar cell (swipe, or arrow keys on a focused cell).
- Day sheet: tap a cell → "Day details" dialog with "✓ Done", missed, clear, day note, reason (only for a missed Build habit).
- Badge updates total and streak; month card "Today x / N".

## How to get to it (user POV)
Open the app → the current month grid → swipe today's cell right for done, left for missed; or tap it to open the day sheet.

## Driving it with Playwright
- `button[data-day="<today>"]`.focus() then `ArrowLeft` (done) / `ArrowRight` (missed). Wait until its `aria-label` ends `, done`.
- Day sheet: click the cell → `getByRole('dialog', { name: 'Day details' })` → `getByRole('button', { name: '✓ Done' })`.
- Proof: badge `aria-label` total changes; after `page.reload()` the cell label still ends `, done`; `localStorage['streakcal.v2'].habits[0].marks[today] === 't'`.

## Gotchas
- A pointer swipe needs a horizontal drag > 24 px on the cell; keyboard arrows hit the same `swipe()` path and are deterministic.
- A second arrow press on a marked day clears it (toggle), not flip.
- Only Build habits swipe; a Reduce/Number habit ignores arrows.
