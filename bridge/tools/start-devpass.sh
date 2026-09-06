#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

BRIDGE_DIR="${DEVPASS_BRIDGE_DIR:-$HOME/PocketRisu/bridge}"
BRIDGE_FILE="$BRIDGE_DIR/llmgateway-termux-bridge.mjs"
RUN_DIR="$BRIDGE_DIR/run"
PID_FILE="$RUN_DIR/llmgateway-devpass-bridge.pid"
LOG_FILE="$RUN_DIR/llmgateway-devpass-bridge.log"
TOKEN_FILE="$HOME/.config/llmgateway-devpass-bridge/token"
PORT="${DEVPASS_BRIDGE_PORT:-39117}"
BASE="http://127.0.0.1:$PORT"

mkdir -p "$RUN_DIR"

health_ok() {
  [ -s "$TOKEN_FILE" ] || return 1
  local token
  token="$(cat "$TOKEN_FILE")"
  curl -fsS --max-time 2 -H "X-DevPass-Bridge-Key: $token" "$BASE/health" >/dev/null 2>&1
}

bridge_pids() {
  ps -ef 2>/dev/null | grep '[n]ode .*llmgateway-termux-bridge\.mjs' | awk '{print $2}' || true
}

stop_unhealthy_bridge() {
  local pid
  while read -r pid; do
    [ -n "${pid:-}" ] || continue
    kill "$pid" 2>/dev/null || true
  done < <(bridge_pids)
  if [ -s "$PID_FILE" ]; then
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    [ -n "${pid:-}" ] && kill "$pid" 2>/dev/null || true
  fi
  sleep 1
  rm -f "$PID_FILE" 2>/dev/null || true
}

if health_ok; then
  echo "DevPass Bridge: already healthy"
  curl -fsS --max-time 2 -H "X-DevPass-Bridge-Key: $(cat "$TOKEN_FILE")" "$BASE/health" 2>/dev/null || true
  exit 0
fi

[ -f "$BRIDGE_FILE" ] || { echo "Bridge file not found: $BRIDGE_FILE" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node is required." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required." >&2; exit 1; }
node --check "$BRIDGE_FILE" >/dev/null

# A process can exist while the health endpoint is dead. Clean those zombie or
# half-started bridge instances before starting one known-good process.
stop_unhealthy_bridge

nohup node "$BRIDGE_FILE" >>"$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
chmod 600 "$PID_FILE" 2>/dev/null || true

for _ in $(seq 1 15); do
  if health_ok; then
    echo "DevPass Bridge: started"
    curl -fsS --max-time 2 -H "X-DevPass-Bridge-Key: $(cat "$TOKEN_FILE")" "$BASE/health" 2>/dev/null || true
    exit 0
  fi
  sleep 1
done

echo "Bridge did not become healthy. Log: $LOG_FILE" >&2
tail -n 20 "$LOG_FILE" 2>/dev/null || true
exit 1
