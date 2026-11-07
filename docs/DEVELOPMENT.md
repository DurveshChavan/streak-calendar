# Development notes (owner only)

See [LICENSE](../LICENSE): this code is not open source.

## Layout

- `src/` – the app (React + Vite). Offline-first: data lives in `localStorage` (`streakcal.v2`) and syncs record by record when a server is configured.
- `server/` – optional sync server (Node 22 + SQLite). Serves the web build and the sync API so the web version and the phone share one database.
- `android/` – Capacitor shell plus native code: the widget (`WidgetLayout` lays it out as a drawing list, `WidgetRenderer` draws it), widget settings, keyboard insets and system bars (`MainActivity`).
- `tools/widget-preview/` – renders the widget-picker previews from the widget's real layout code. `tools/logo/` – generates every app icon from one SVG.

Data safety on updates: keep the app id `app.streakcalendar`, the web origin (Capacitor default `https://localhost`) and the `localStorage` keys unchanged, and sign every release with the same key. Changing any of these makes an update lose or hide user data.

## Commands

```bash
npm ci
npm run dev        # web app on :5173 (proxies /api to :8787)
npm test           # sync server, streak and backup logic
```

```bash
SYNC_TOKEN=$(openssl rand -hex 24) npm run server
```

```bash
tools/widget-preview/make-previews.sh
```

## Releases

CI (`.github/workflows/android.yml`) builds a debug APK and runs all tests on every push. Pushing a tag `vX.Y.Z` builds the signed release and publishes it with the notes in `release-notes/vX.Y.Z.md`; the tag must match `versionName` in `android/app/build.gradle`, and `versionCode` must go up.

Signing: one permanent key, protected by the `RELEASE_KEY_PASSWORD` repository secret. The first signed release creates it and saves it encrypted as `android/signing/release.p12.enc` (`scripts/ci-signing.sh`). Keep the password in a password manager: without it no further update can be signed, and a different key would force users to uninstall (and lose their data) to update.

```bash
git tag v2.0.1 && git push origin v2.0.1
```
