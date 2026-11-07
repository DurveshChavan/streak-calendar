# Streak Calendar

A glass habit-streak calendar for the web and Android, with one shared database and a transparent home-screen widget.

- **Web / Android app**: React + Vite, wrapped for Android with Capacitor. Offline-first: everything is stored on the device and syncs when it can.
- **Sync server** (`server/`): one small Node process + SQLite. It serves the web build *and* the sync API, so the website and the phone read and write the same data. Conflicts resolve per record, newest edit wins.
- **Widget** (`android/.../StreakWidgetProvider.java`): fully transparent, tinted-glass panels showing the month calendar with the **first habit's streak** on top. Redraws whenever you mark a day and at midnight.

## 1. Run the server (web + shared database)

```bash
npm ci && npm run build
SYNC_TOKEN=$(openssl rand -hex 24) npm run server      # keep this token; it is your password
```

Deploy it anywhere that runs Node 22 or Docker (`Dockerfile` included; mount a volume at `/data`). **Serve it over HTTPS** (Fly.io, Render, a VPS behind Caddy, or a Cloudflare Tunnel); the Android app only talks to HTTPS.

Open the site, tap the streak badge, tap *Saved on this device · tap to sync*, enter the server URL and token. Do the same on the phone. From then on both stay in sync (on open, every 30 s while visible, and shortly after each change).

## 2. Build and install the Android app (USB)

On your computer (Node 20+, JDK 21, Android Studio / SDK, `adb`), with the phone plugged in via USB-C and USB debugging on:

```bash
npm ci
npm run android:install
```

This builds the debug APK and runs `adb install -r` on every connected device. Without a computer toolchain, push to GitHub: the **Android APK** workflow builds `app-debug.apk` as a downloadable artifact.

## 3. Add the widget

Long-press the home screen, **Widgets**, **Streak Calendar**, drag it out (4x4; resizable). The widget has no solid background: only the glass panels and the calendar are drawn. Android widgets cannot blur the wallpaper, so the "glass" is a light tint, a soft highlight and a hairline border. Theme (light/dark tint) follows the theme toggle in the app. Tapping the widget opens the app.

## Develop

```bash
npm run dev            # Vite on :5173, proxies /api to :8787
npm test               # sync server + streak logic
```

## Git

History is human-only: `npm install` enables `.githooks/commit-msg`, which rejects AI co-author trailers.
