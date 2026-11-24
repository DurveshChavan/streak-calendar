#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
STATE=${VERIFY_STATE:-${TMPDIR:-/tmp}/streakcal-verify}
if [ -f "$STATE/pid" ] && kill -0 "$(cat "$STATE/pid")" 2>/dev/null; then
  echo "already running: pid $(cat "$STATE/pid") port $(cat "$STATE/port")"; exit 0
fi
rm -rf "$STATE"; mkdir -p "$STATE/data"
cd "$ROOT"
[ -d node_modules ] || npm ci --no-audit --no-fund
[ "${SKIP_BUILD:-0}" = 1 ] && [ -f dist/index.html ] || npm run build >"$STATE/build.log" 2>&1 || { tail -30 "$STATE/build.log"; exit 1; }
PORT=$(node -e "const s=require('net').createServer().listen(0,()=>{console.log(s.address().port);s.close()})")
TOKEN=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
echo "$PORT" >"$STATE/port"; echo "$TOKEN" >"$STATE/token"
DATA_DIR="$STATE/data" SYNC_TOKEN="$TOKEN" PORT="$PORT" nohup node server/index.mjs >"$STATE/server.log" 2>&1 &
echo $! >"$STATE/pid"
for _ in $(seq 1 50); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" 2>/dev/null | grep -q '"protocol":3' && curl -fsS "http://127.0.0.1:$PORT/" | grep -q '<div id="root"'; then
    echo "ready: http://127.0.0.1:$PORT  pid $(cat "$STATE/pid")  state $STATE"; exit 0
  fi
  sleep 0.2
done
echo "not ready after 10 s"; tail -20 "$STATE/server.log"; exit 1
