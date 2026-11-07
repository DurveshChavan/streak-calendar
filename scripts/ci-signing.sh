#!/usr/bin/env bash
# Release signing with ONE permanent key, so every update installs over the previous version and keeps the
# user's data (Android refuses an update signed with a different key). The key is created on the first signed
# release, protected by the RELEASE_KEY_PASSWORD repository secret, and kept in this repository encrypted with
# that password, so only someone who knows it can sign Streak Calendar releases.
set -euo pipefail
: "${RELEASE_KEY_PASSWORD:?Add the RELEASE_KEY_PASSWORD repository secret (GitHub: Settings > Secrets and variables > Actions), then re-run this job}"
ENC=android/signing/release.p12.enc
KEY="$RUNNER_TEMP/release.p12"
if [ -f "$ENC" ]; then
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in "$ENC" -out "$KEY" -pass env:RELEASE_KEY_PASSWORD \
    || { echo "::error::RELEASE_KEY_PASSWORD does not open the saved signing key. Use the same password as before."; exit 1; }
else
  echo "First signed release: creating the permanent signing key (one time only)"
  keytool -genkeypair -noprompt -storetype PKCS12 -keystore "$KEY" -alias streakcalendar -keyalg RSA -keysize 4096 -validity 36500 \
    -dname "CN=Durvesh Chavan, O=Streak Calendar" -storepass "$RELEASE_KEY_PASSWORD" -keypass "$RELEASE_KEY_PASSWORD"
  mkdir -p android/signing
  openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -in "$KEY" -out "$ENC" -pass env:RELEASE_KEY_PASSWORD
  # save it (encrypted) on main, so every later release is signed with this same key
  WT="$RUNNER_TEMP/main"
  git fetch --no-tags origin main
  git worktree add --detach "$WT" origin/main
  mkdir -p "$WT/android/signing" && cp "$ENC" "$WT/android/signing/"
  git -C "$WT" -c user.name=durveshchavan254 -c user.email=durveshchavan254@gmail.com add android/signing/release.p12.enc
  git -C "$WT" -c user.name=durveshchavan254 -c user.email=durveshchavan254@gmail.com commit -m "Add the encrypted release signing key"
  git -C "$WT" push origin HEAD:main
fi
keytool -list -keystore "$KEY" -storetype PKCS12 -storepass "$RELEASE_KEY_PASSWORD" >/dev/null
echo "RELEASE_STORE_FILE=$KEY" >> "$GITHUB_ENV"
