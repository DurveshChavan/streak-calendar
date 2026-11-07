#!/usr/bin/env bash
# Build the debug APK and install it on the USB-connected phone (USB debugging on).
# Needs on YOUR machine: Node 20+, JDK 21, Android SDK (Android Studio installs it; set ANDROID_HOME) and adb on PATH.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v adb >/dev/null || { echo "adb not found. Install Android platform-tools (or Android Studio) and add it to PATH."; exit 1; }
[ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ] || { echo "Set ANDROID_HOME to your Android SDK folder (e.g. ~/Android/Sdk)."; exit 1; }
echo "sdk.dir=${ANDROID_HOME:-$ANDROID_SDK_ROOT}" > android/local.properties

adb start-server >/dev/null
DEVICES=$(adb devices | awk 'NR>1 && $2=="device"{print $1}')
if [ -z "$DEVICES" ]; then
  echo "No authorised device. Plug in the phone, unlock it and accept the 'Allow USB debugging' prompt."; adb devices; exit 1
fi

[ -d node_modules ] || npm ci
npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug)

APK=android/app/build/outputs/apk/debug/app-debug.apk
for d in $DEVICES; do echo "Installing on $d"; adb -s "$d" install -r "$APK"; done
echo "Done. Long-press the home screen > Widgets > Streak Calendar to add the widget."
