#!/usr/bin/env bash
set -uo pipefail
STATE=${VERIFY_STATE:-${TMPDIR:-/tmp}/streakcal-verify}
[ -f "$STATE/pid" ] && { PID=$(cat "$STATE/pid"); kill "$PID" 2>/dev/null && echo "stopped pid $PID"; for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$PID" 2>/dev/null || break; sleep 0.2; done; kill -9 "$PID" 2>/dev/null; }
rm -rf "$STATE" "$STATE-widget" && echo "removed $STATE and $STATE-widget"
echo "evidence kept in $(cd "$(dirname "$0")/../../../.." && pwd)/verify-evidence/"
