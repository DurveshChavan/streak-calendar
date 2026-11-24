# 2.0 → 3.1 data upgrade

## Sub-features
- `streakcal.v2` doc from 2.0 (`{habits:[{id,name,marks}],cur,notes,theme}`) loads with no change as Build daily.
- `normalize` adds `settings` (weekStart 0, missRules on) and `avoid: []`.
- Older `streakcal.v1` (single habit) also migrates (not yet in a journey).

## How to get to it (user POV)
Install 3.1 over 2.0 (same app id, same WebView origin) and open it: all habits, marks and notes are there.

## Driving it with Playwright
- `drive.mjs v2-upgrade` seeds a 2.0 doc into `localStorage` before the first page load (`addInitScript`, once per session), then opens the app.
- Proof: badge `Workout: 2 total`, yesterday's cell `, missed`, stored doc keeps `notes`, gains `settings.weekStart === 0`, `kind` absent or `daily`.

## Gotchas
- Seed must land before boot; writing `localStorage` after `goto` tests nothing.
- On Android the real upgrade also depends on keeping app id `app.streakcalendar` and origin `https://localhost`; only a device install over 2.0 proves that. Beta has its own app id and starts empty by design.
