#!/usr/bin/env bash
# Renders the widget-picker preview images from the widget's real layout code (WidgetLayout.java).
# Needs: JDK, Node + `npm ci` (Playwright, Roboto), Python 3 with Pillow (for WebP).
# Usage: tools/widget-preview/make-previews.sh [out-dir]   (default: the app's drawable-nodpi)
set -euo pipefail
cd "$(dirname "$0")"
OUT=${1:-../../android/app/src/main/res/drawable-nodpi}
CACHE=.cache; mkdir -p "$CACHE" "$OUT"
[ -f "$CACHE/json.jar" ] || curl -sSfL -o "$CACHE/json.jar" https://repo.maven.apache.org/maven2/org/json/json/20240303/json-20240303.jar
SRC=../../android/app/src/main/java/app/streakcalendar
javac -nowarn -cp "$CACHE/json.jar" -d "$CACHE/classes" "$SRC/WidgetData.java" "$SRC/WidgetLayout.java" PreviewTool.java
# Typical Galaxy A54 cell sizes (dp) for a 4x4 and a 4x6 widget; rendered at 2.25x
for spec in "4x4 370 456" "4x6 370 684"; do
  set -- $spec
  java -cp "$CACHE/classes:$CACHE/json.jar" PreviewTool "$CACHE" "widget_preview_$1" "$2" "$3" 2.25 light 70 0 sample-data.json
  node render.cjs "$CACHE/widget_preview_$1.json" "$CACHE/widget_preview_$1.png" app
  python3 -c "import sys; from PIL import Image; Image.open(sys.argv[1]).save(sys.argv[2], 'WEBP', quality=88, method=6)" \
    "$CACHE/widget_preview_$1.png" "$OUT/widget_preview_$1.webp"
done
ls -la "$OUT"/widget_preview_*
