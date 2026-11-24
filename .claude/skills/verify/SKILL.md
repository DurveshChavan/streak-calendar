---
name: verify
description: Run Streak Calendar (React web app + Node sync server) and its Android grid and action widgets, drive them the way a user does, and capture proof (screenshots, stored doc, server records, rendered widget). Use to prove a change works in the real app or widget, to check the 2.0 → 3.1 data upgrade, or before a merge.
---

# Verify Streak Calendar

Two surfaces:

1. **App** — the web build served by `server/index.mjs` (same build that Capacitor wraps on Android). Driven with Playwright at phone size (412×915).
2. **Widgets** — the Android grid widget and action widget. No emulator here (no `/dev/kvm`), so the widget is proven on the JVM: the app's real `widgetPayload()` output goes through the real `WidgetData` + `WidgetLayout` Java code, and `tools/widget-preview/render.cjs` paints the draw list. The action widget's text comes from the real `WidgetData.actionText()`. What this does NOT cover is listed under "Device".

All helpers live in `.claude/skills/verify/scripts/`. Run them from the repo root.

## Launch

```bash
.claude/skills/verify/scripts/launch.sh
```

- Runs `npm ci` if `node_modules` is missing, then `npm run build` (log: `$STATE/build.log`). Pass `SKIP_BUILD=1` to reuse a `dist/` you just built.
- Starts the sync server on a free port with a random token and an empty SQLite data dir in `$STATE` (default `${TMPDIR:-/tmp}/streakcal-verify`, override with `VERIFY_STATE`).
- Ready = `/api/health` answers `{"ok":true,"protocol":3}` AND `/` serves the app's `index.html`. Prints `ready: http://127.0.0.1:<port>`.
- Each Playwright context starts with empty `localStorage`, so every journey starts from a fresh device. The server's DB is fresh per launch.
- Isolation: set a different `VERIFY_STATE` to run a second instance side by side. Never point the driver at a server you did not launch.

## Doctor

```bash
.claude/skills/verify/scripts/doctor.sh
```

Read-only. Checks: the pid is alive, it owns the port, health reports protocol 3, a sync request without `v` gets 426, the served page is this checkout's `dist/index.html`, and `src/` has no edits newer than the build (WARN means relaunch without `SKIP_BUILD`). Exit 0 = worth driving.

## Drive

App journeys (each writes evidence and exits non-zero on any FAIL):

```bash
node .claude/skills/verify/scripts/drive.mjs <journey> [evidence-dir]
```

| Journey | Proves |
|---|---|
| `mark-today` | Mark today done from the calendar, badge goes 0 → 1, mark survives reload, stored doc has `marks[today]='t'`. |
| `v2-upgrade` | A 2.0 `streakcal.v2` doc seeded before first load opens as Build daily: total, missed day, day note kept, `settings.weekStart=0`. |
| `sync` | Connect to the launched server from the Habits sheet, label reaches "Synced · hh:mm", server holds the `mark:` record. |
| `dark` | Theme toggle switches to dark and is stored. Run any journey with `DARK=1` for a dark color scheme. |
| `a11y-dialogs` | Every sheet takes focus, traps Tab, closes on Escape and returns focus (see `features/dialogs.md`). |
| `keep-state` | Closing the Habits sheet keeps a running timer's pill; a reason typed then closed with Escape is saved. |

Journeys run with reduced motion by default. Run each one again with `MOTION=1`: some close paths (Habits sheet, day sheet) only take their animated branch with motion on.

Stable handles (from `src/App.tsx`), use these when adding journeys:

- Day cell: `button[data-day="YYYY-MM-DD"]`; its `aria-label` ends `, done` / `, missed`. Keyboard: focus it, `ArrowLeft` = done, `ArrowRight` = missed (same as swipe). Click opens the `dialog` "Day details" (buttons "✓ Done" etc.).
- Badge: `button[data-anim="badge"]`, `aria-label` = `"<habit>: <total> total, <sub>. …"`. Click opens `dialog` "Habits".
- Month nav: buttons "Previous month", "Next month", "Go to today", "Switch to dark mode" / "Switch to light mode".
- Month card: `role=button` "Details for <habit>" → detail screen; 8-week bars have `aria-label` "Last 8 weeks: …".
- Habits sheet: "Edit <name>", "Delete <name>", "Move <name> up/down", "Switch to <name>"; "+ New habit" opens `dialog` "New habit" (radiogroup "Kind"). Sync: button whose text starts "Saved on this device · tap to sync", then inputs "Server URL", "Sync token", button "Connect". Backup: "Copy backup", "Restore…", textarea "Backup text".
- Stored data: `localStorage['streakcal.v2']` (doc), `streakcal.sync` (sync meta), `streakcal.timer` (web timer).
- Seed data: pass a doc to `open(seed)` in `drive.mjs`; it is written to `localStorage` once, before the app boots.

Widgets (after a journey wrote `doc.json`):

```bash
.claude/skills/verify/scripts/widget.sh <doc.json> [out-dir] [light|dark] [habitIndex]
```

Writes `widget-payload.json` (exact JSON the app sends to the native `WidgetBridge`), `widget-grid-4x4-<mode>.png` + `.ops.json` (draw list), and `widget-action.txt` (one line per habit: `id | name | total | line`). `TODAY=YYYY-MM-DD` pins the date. Needs network once for `org.json` from Maven (cached in `$STATE-widget`).

## Evidence

- Goes to `verify-evidence/<run>/` at repo root (gitignored). Each journey writes numbered screenshots, `log.txt` with PASS/FAIL lines, and `doc.json`; `sync` adds `server-records.json`.
- Proof standards: drive the real user path (cells, badge, sheets; never call store methods or write marks into `localStorage` except as pre-boot seed data). Capture before and after, not only the end screen. Check the side effect too: the stored doc, the server records, the widget payload. Page errors fail the run.
- A widget proof compares the rendered grid with the app screenshot from the same `doc.json`: same marks, same total, same streak.

## Cleanup

```bash
.claude/skills/verify/scripts/cleanup.sh
```

Kills only the pid in `$STATE/pid`, removes `$STATE` and `$STATE-widget`. Keeps `verify-evidence/`. Run it after every failed attempt too.

## Device (not covered here)

The JVM render proves the widget's data and layout, not Android itself. Still needs a real phone (Galaxy A54, phase 5): `RemoteViews` inflation, the action widget layout XML, tap intents, the timer notification and alarm, `TimerConflictActivity`, launcher cell sizes. Recipe with a phone on adb:

```bash
npm run android:beta && adb install -r android/app/build/outputs/apk/beta/debug/app-beta-debug.apk
adb shell am start -n app.streakcalendar.beta/app.streakcalendar.MainActivity
adb exec-out screencap -p > verify-evidence/device-home.png
```

Add the widgets by hand from the launcher, then screencap. Beta (`app.streakcalendar.beta`) installs beside prod and starts empty; never drive the prod app holding real data.

## Features

See `features/README.md`. Cover every entry point a feature lists, not only the convenient one.
