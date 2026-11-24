#!/usr/bin/env bash
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
STATE=${VERIFY_STATE:-${TMPDIR:-/tmp}/streakcal-verify}
ok=1; say() { printf "%-8s %s\n" "$1" "$2"; if [ "$1" = FAIL ]; then ok=0; fi; return 0; }
[ -f "$STATE/pid" ] || { say FAIL "no instance (run launch.sh)"; exit 1; }
PID=$(cat "$STATE/pid"); PORT=$(cat "$STATE/port")
kill -0 "$PID" 2>/dev/null && say OK "server pid $PID alive" || say FAIL "server pid $PID dead (see $STATE/server.log)"
grep -q "listening on :$PORT" "$STATE/server.log" && say OK "pid $PID owns port $PORT" || say FAIL "server log does not show port $PORT"
H=$(curl -fsS -m 3 "http://127.0.0.1:$PORT/api/health" 2>/dev/null) && echo "$H" | grep -q '"protocol":3' && say OK "health $H" || say FAIL "health: ${H:-no answer}"
C=$(curl -s -o /dev/null -w '%{http_code}' -m 3 -X POST -H 'content-type: application/json' -H "authorization: Bearer $(cat "$STATE/token")" -d '{"since":0,"changes":[]}' "http://127.0.0.1:$PORT/api/sync")
[ "$C" = 426 ] && say OK "old-protocol sync gets 426" || say FAIL "old-protocol sync got $C, want 426"
cmp -s "$ROOT/dist/index.html" <(curl -fsS -m 3 "http://127.0.0.1:$PORT/") && say OK "served index.html = dist build" || say FAIL "served page is not this checkout's dist"
S=$(find "$ROOT/src" -newer "$ROOT/dist/index.html" -type f | head -1)
if [ -z "$S" ]; then say OK "dist newer than src"; else say WARN "src changed after build ($S): relaunch without SKIP_BUILD"; fi
[ $ok = 1 ]
