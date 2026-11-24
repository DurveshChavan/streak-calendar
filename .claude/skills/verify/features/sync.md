# Sync

## Sub-features
- Connect from the Habits sheet with server URL + token; label shows state ("Synced · hh:mm", "Sync: wrong token", "Sync: the server needs an update", "Offline · will sync when back").
- Protocol 3: client sends `v:3`; server answers 426 without it.

## How to get to it (user POV)
Tap the badge → Habits sheet → "Saved on this device · tap to sync" → fill Server URL and Sync token → Connect.

## Driving it with Playwright
- `drive.mjs sync` uses the launched server (`$STATE/port`, `$STATE/token`).
- Proof: button text `^Synced · `; `POST /api/sync {v:3,since:0,changes:[]}` with the token returns a `mark:` record for today with value `t` (saved to `server-records.json`).

## Gotchas
- `configure()` starts a sync at once; wait for the label, not a fixed sleep.
- Wrong-token and old-server states are not in a journey yet; for old server, run a 2.x server or stub `/api/health` without `protocol`.
