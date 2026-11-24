#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
DOC=${1:?usage: widget.sh <doc.json> [out-dir] [light|dark] [habitIndex]}
OUT=$(mkdir -p "${2:-$(dirname "$DOC")}" && cd "${2:-$(dirname "$DOC")}" && pwd); MODE=${3:-light}; IDX=${4:-0}
CACHE=${VERIFY_STATE:-${TMPDIR:-/tmp}/streakcal-verify}-widget; mkdir -p "$CACHE"
TODAY=${TODAY:-$(date +%F)}
[ -f "$CACHE/json.jar" ] || curl -sSfL -o "$CACHE/json.jar" https://repo.maven.apache.org/maven2/org/json/json/20240303/json-20240303.jar
SRC=$ROOT/android/app/src/main/java/app/streakcalendar
javac -nowarn -cp "$CACHE/json.jar" -d "$CACHE/classes" "$SRC/WidgetData.java" "$SRC/WidgetLayout.java" "$SRC/TimerState.java" "$ROOT/tools/widget-preview/PreviewTool.java" "$HERE/ActionText.java"
node --experimental-strip-types --no-warnings "$HERE/payload.ts" "$DOC" "$OUT/widget-payload.json" "$TODAY"
for spec in "4x4 370 456"; do
  set -- $spec
  java -cp "$CACHE/classes:$CACHE/json.jar" PreviewTool "$CACHE" "grid_$1" "$2" "$3" 2.25 "$MODE" 70 "$IDX" "$OUT/widget-payload.json"
  node "$ROOT/tools/widget-preview/render.cjs" "$CACHE/grid_$1.json" "$OUT/widget-grid-$1-$MODE.png" app
  cp "$CACHE/grid_$1.json" "$OUT/widget-grid-$1-$MODE.ops.json"
  echo "grid  $OUT/widget-grid-$1-$MODE.png"
done
java -cp "$CACHE/classes:$CACHE/json.jar" ActionText "$OUT/widget-payload.json" "$TODAY" | tee "$OUT/widget-action.txt"
echo "action $OUT/widget-action.txt"
