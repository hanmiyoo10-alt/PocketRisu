#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

BRIDGE_DIR="${DEVPASS_BRIDGE_DIR:-$HOME/PocketRisu/bridge}"
BRIDGE_FILE="$BRIDGE_DIR/llmgateway-termux-bridge.mjs"
BACKUP_ROOT="$BRIDGE_DIR/backup"
RUN_DIR="$BRIDGE_DIR/run"
PID_FILE="$RUN_DIR/llmgateway-devpass-bridge.pid"
LOG_FILE="$RUN_DIR/llmgateway-devpass-bridge.log"
TOKEN_FILE="$HOME/.config/llmgateway-devpass-bridge/token"
PORT="${DEVPASS_BRIDGE_PORT:-39117}"
BASE="http://127.0.0.1:$PORT"
TARGET="${1:-}"

health_ok() {
  [ -s "$TOKEN_FILE" ] || return 1
  curl -fsS --max-time 2 -H "X-DevPass-Bridge-Key: $(cat "$TOKEN_FILE")" "$BASE/health" >/dev/null 2>&1
}
stop_bridge() {
  if [ -s "$PID_FILE" ]; then
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    [ -n "${pid:-}" ] && kill "$pid" 2>/dev/null || true
  fi
  while read -r pid; do [ -n "$pid" ] && kill "$pid" 2>/dev/null || true; done < <(ps -ef 2>/dev/null | grep '[n]ode .*llmgateway-termux-bridge\.mjs' | awk '{print $2}' || true)
  sleep 1
}
start_bridge() {
  mkdir -p "$RUN_DIR"
  nohup node "$BRIDGE_FILE" >>"$LOG_FILE" 2>&1 & echo $! > "$PID_FILE"
  for _ in $(seq 1 15); do health_ok && return 0; sleep 1; done
  return 1
}

if [ -z "$TARGET" ]; then
  TARGET="$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name 'devpass-*' -print 2>/dev/null | sort | tail -n 1)"
fi
[ -n "$TARGET" ] && [ -f "$TARGET/llmgateway-termux-bridge.mjs" ] || { echo "Rollback backup not found." >&2; exit 1; }
node --check "$TARGET/llmgateway-termux-bridge.mjs" >/dev/null

stop_bridge
cp -f "$TARGET/llmgateway-termux-bridge.mjs" "$BRIDGE_FILE"
chmod 700 "$BRIDGE_FILE"
if start_bridge; then
  version="$(grep -m1 -E "const VERSION = '[0-9.]+" "$BRIDGE_FILE" | sed -E "s/.*'([0-9.]+).*/\1/" || true)"
  echo "✓ Rollback complete: Bridge v${version:-unknown}"
  echo "Backup used: $TARGET"
else
  echo "Rollback file restored but bridge health check failed. Log: $LOG_FILE" >&2
  exit 1
fi
