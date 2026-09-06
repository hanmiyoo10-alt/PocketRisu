#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

BRIDGE_DIR="${DEVPASS_BRIDGE_DIR:-$HOME/PocketRisu/bridge}"
BRIDGE_FILE="$BRIDGE_DIR/llmgateway-termux-bridge.mjs"
BACKUP_ROOT="$BRIDGE_DIR/backup"
READY_DIR="$BRIDGE_DIR/update-ready"
TOOLS_DIR="$BRIDGE_DIR/tools"
RUN_DIR="$BRIDGE_DIR/run"
PID_FILE="$RUN_DIR/llmgateway-devpass-bridge.pid"
LOG_FILE="$RUN_DIR/llmgateway-devpass-bridge.log"
TOKEN_FILE="$HOME/.config/llmgateway-devpass-bridge/token"
DOWNLOADS="${DEVPASS_DOWNLOADS_DIR:-$HOME/storage/downloads}"
PORT="${DEVPASS_BRIDGE_PORT:-39117}"
BASE="http://127.0.0.1:$PORT"
ZIP="${1:-}"
TMP=""
BACKUP=""

cleanup() { [ -n "${TMP:-}" ] && rm -rf "$TMP" 2>/dev/null || true; }
trap cleanup EXIT

version_ge() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

health_ok() {
  [ -s "$TOKEN_FILE" ] || return 1
  local token
  token="$(cat "$TOKEN_FILE")"
  curl -fsS --max-time 2 -H "X-DevPass-Bridge-Key: $token" "$BASE/health" >/dev/null 2>&1
}

auto_update_feed_ok() {
  curl -fsS --max-time 3 -H 'Range: bytes=0-8191' "$BASE/plugin/latest" 2>/dev/null \
    | grep -q '^//@version '
}

bridge_pids() {
  ps -ef 2>/dev/null | grep '[n]ode .*llmgateway-termux-bridge\.mjs' | awk '{print $2}' || true
}

stop_bridge() {
  local seen="" pid=""
  if [ -s "$PID_FILE" ]; then
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      seen="$pid"
    fi
  fi
  while read -r pid; do
    [ -n "$pid" ] || continue
    [ "$pid" = "${seen:-}" ] && continue
    kill "$pid" 2>/dev/null || true
  done < <(bridge_pids)
  for _ in $(seq 1 8); do
    health_ok || { rm -f "$PID_FILE" 2>/dev/null || true; return 0; }
    sleep 1
  done
  return 0
}

start_bridge() {
  mkdir -p "$RUN_DIR"
  if health_ok; then return 0; fi
  nohup node "$BRIDGE_FILE" >>"$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  chmod 600 "$PID_FILE" 2>/dev/null || true
  for _ in $(seq 1 15); do
    health_ok && return 0
    sleep 1
  done
  return 1
}

if [ -z "$ZIP" ]; then
  # Termux ~/storage/downloads is normally a command-line symlink. -H follows
  # that link without following arbitrary symlinks discovered below it.
  ZIP="$(find -H "$DOWNLOADS" -maxdepth 1 -type f -name 'devpass_v*.zip' -print 2>/dev/null | sort -V | tail -n 1)"
fi
[ -n "$ZIP" ] && [ -f "$ZIP" ] || { echo "DevPass update ZIP not found." >&2; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "unzip is required (pkg install unzip)." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "node is required." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required." >&2; exit 1; }

TMP="$(mktemp -d)"
unzip -q "$ZIP" -d "$TMP"
CANDIDATE_BRIDGE="$(find "$TMP" -type f -path '*/bridge/llmgateway-termux-bridge.mjs' -print | head -n 1)"
CANDIDATE_PLUGIN="$(find "$TMP" -type f -name 'devpass_v*_dashboard.js' -print | head -n 1)"
CANDIDATE_TOOLS="$(find "$TMP" -type d -path '*/tools' -print | head -n 1)"
CANDIDATE_MANIFEST="$(find "$TMP" -type f -name 'manifest.json' -print | head -n 1)"
[ -n "$CANDIDATE_BRIDGE" ] || { echo "Bridge file not found inside ZIP." >&2; exit 1; }
node --check "$CANDIDATE_BRIDGE" >/dev/null
if [ -n "$CANDIDATE_PLUGIN" ]; then node --check "$CANDIDATE_PLUGIN" >/dev/null; fi

new_version="$(grep -m1 -E "const VERSION = '[0-9.]+" "$CANDIDATE_BRIDGE" | sed -E "s/.*'([0-9.]+).*/\1/" || true)"
old_version="$(grep -m1 -E "const VERSION = '[0-9.]+" "$BRIDGE_FILE" 2>/dev/null | sed -E "s/.*'([0-9.]+).*/\1/" || true)"
plugin_version="$(grep -m1 -E "const BUILD_VERSION = '[0-9.]+" "$CANDIDATE_PLUGIN" 2>/dev/null | sed -E "s/.*'([0-9.]+).*/\1/" || true)"
required_bridge=""

# v3 package manifest: validate exact bytes before touching the installed bridge.
if [ -n "$CANDIDATE_MANIFEST" ]; then
  manifest_values="$(node - "$CANDIDATE_MANIFEST" "$CANDIDATE_BRIDGE" "${CANDIDATE_PLUGIN:-}" <<'NODE'
const fs = require('fs');
const crypto = require('crypto');
try {
  const [manifestPath, bridgePath, pluginPath] = process.argv.slice(2);
  const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const digest = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  if (!m.bridge || !m.plugin) throw new Error('manifest missing bridge/plugin');
  if (m.bridge.sha256 && digest(bridgePath) !== m.bridge.sha256) throw new Error('bridge checksum mismatch');
  if (pluginPath && m.plugin.sha256 && digest(pluginPath) !== m.plugin.sha256) throw new Error('plugin checksum mismatch');
  console.log([m.packageVersion || '', m.bridge.version || '', m.plugin.version || '', m.plugin.requiresBridge || ''].join('|'));
} catch (error) {
  console.error(`manifest validation: ${error.message || error}`);
  process.exit(1);
}
NODE
)" || { echo "Package manifest validation failed." >&2; exit 1; }
  IFS='|' read -r manifest_package manifest_bridge manifest_plugin required_bridge <<< "$manifest_values"
  [ -z "$manifest_bridge" ] || [ "$manifest_bridge" = "$new_version" ] || { echo "Manifest/Bridge version mismatch." >&2; exit 1; }
  [ -z "$manifest_plugin" ] || [ "$manifest_plugin" = "$plugin_version" ] || { echo "Manifest/Plugin version mismatch." >&2; exit 1; }
fi

if [ -n "$required_bridge" ] && ! version_ge "$new_version" "$required_bridge"; then
  echo "Plugin v${plugin_version:-unknown} requires Bridge >= $required_bridge, candidate is v${new_version:-unknown}." >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT" "$READY_DIR" "$TOOLS_DIR" "$RUN_DIR"

# Stage plugin bytes atomically. v2.7.3+ exposes this fixed file through the
# localhost bridge so Risu's official //@update-url checker can consume it.
if [ -n "$CANDIDATE_PLUGIN" ]; then
  plugin_name="$(basename "$CANDIDATE_PLUGIN")"
  if [ -f "$READY_DIR/latest_dashboard.js" ]; then
    cp -f "$READY_DIR/latest_dashboard.js" "$READY_DIR/previous_dashboard.js"
  fi
  plugin_tmp="$READY_DIR/.${plugin_name%.js}.new.js"
  cp -f "$CANDIDATE_PLUGIN" "$plugin_tmp"
  node --check "$plugin_tmp" >/dev/null
  mv -f "$plugin_tmp" "$READY_DIR/$plugin_name"
  latest_tmp="$READY_DIR/.latest_dashboard.new.js"
  cp -f "$CANDIDATE_PLUGIN" "$latest_tmp"
  node --check "$latest_tmp" >/dev/null
  mv -f "$latest_tmp" "$READY_DIR/latest_dashboard.js"
  if [ -n "$CANDIDATE_MANIFEST" ]; then
    cp -f "$CANDIDATE_MANIFEST" "$READY_DIR/manifest.json.new"
    mv -f "$READY_DIR/manifest.json.new" "$READY_DIR/manifest.json"
  fi
fi

BRIDGE_CHANGED=1
if [ -f "$BRIDGE_FILE" ] && cmp -s "$CANDIDATE_BRIDGE" "$BRIDGE_FILE"; then
  BRIDGE_CHANGED=0
fi

if [ "$BRIDGE_CHANGED" -eq 1 ]; then
  stamp="$(date +%Y%m%d-%H%M%S)"
  BACKUP="$BACKUP_ROOT/devpass-$stamp${old_version:+-v$old_version}"
  mkdir -p "$BACKUP"
  if [ -f "$BRIDGE_FILE" ]; then
    cp -f "$BRIDGE_FILE" "$BACKUP/llmgateway-termux-bridge.mjs"
    chmod 600 "$BACKUP/llmgateway-termux-bridge.mjs" 2>/dev/null || true
  fi
  printf 'zip=%s\nold_bridge=%s\nnew_bridge=%s\nplugin=%s\ncreated=%s\n' "$ZIP" "${old_version:-unknown}" "${new_version:-unknown}" "${plugin_version:-unknown}" "$stamp" > "$BACKUP/manifest.txt"

  stop_bridge
  cp -f "$CANDIDATE_BRIDGE" "$BRIDGE_FILE.new"
  chmod 700 "$BRIDGE_FILE.new"
  mv -f "$BRIDGE_FILE.new" "$BRIDGE_FILE"

  if ! start_bridge; then
    echo "New bridge failed health check. Rolling back..." >&2
    stop_bridge
    if [ -f "$BACKUP/llmgateway-termux-bridge.mjs" ]; then
      cp -f "$BACKUP/llmgateway-termux-bridge.mjs" "$BRIDGE_FILE"
      chmod 700 "$BRIDGE_FILE"
      start_bridge || { echo "Rollback bridge also failed. Check $LOG_FILE" >&2; exit 1; }
      echo "Rollback complete: bridge v${old_version:-unknown}" >&2
    fi
    exit 1
  fi
else
  if ! health_ok; then
    start_bridge || { echo "Bridge file is current but failed to start. Check $LOG_FILE" >&2; exit 1; }
  fi
fi

# The bridge is healthy; now verify the built-in Risu update feed too.
if [ -n "$CANDIDATE_PLUGIN" ] && ! auto_update_feed_ok; then
  echo "Plugin auto-update feed failed verification: $BASE/plugin/latest" >&2
  if [ -f "$READY_DIR/previous_dashboard.js" ]; then
    cp -f "$READY_DIR/previous_dashboard.js" "$READY_DIR/latest_dashboard.js"
  fi
  if [ "$BRIDGE_CHANGED" -eq 1 ] && [ -n "$BACKUP" ] && [ -f "$BACKUP/llmgateway-termux-bridge.mjs" ]; then
    echo "Rolling bridge back because the update feed is not healthy..." >&2
    stop_bridge
    cp -f "$BACKUP/llmgateway-termux-bridge.mjs" "$BRIDGE_FILE"
    chmod 700 "$BRIDGE_FILE"
    start_bridge || { echo "Rollback bridge also failed. Check $LOG_FILE" >&2; exit 1; }
  fi
  exit 1
fi

# Self-update tools only after health has been proven.
if [ -n "$CANDIDATE_TOOLS" ]; then
  for tool in update-devpass.sh rollback-devpass.sh start-devpass.sh start-risu.sh install-update-tools.sh; do
    if [ -f "$CANDIDATE_TOOLS/$tool" ]; then
      tool_tmp="$TOOLS_DIR/.${tool}.new"
      cp -f "$CANDIDATE_TOOLS/$tool" "$tool_tmp"
      chmod 700 "$tool_tmp"
      mv -f "$tool_tmp" "$TOOLS_DIR/$tool"
    fi
  done
fi
if [ -n "${PREFIX:-}" ] && [ -d "$PREFIX/bin" ]; then
  for cmd in update-devpass rollback-devpass start-devpass start-risu; do
    [ -f "$TOOLS_DIR/$cmd.sh" ] && ln -sf "$TOOLS_DIR/$cmd.sh" "$PREFIX/bin/$cmd" || true
  done
fi

if [ "$BRIDGE_CHANGED" -eq 1 ]; then
  echo "✓ DevPass Bridge updated: v${old_version:-unknown} → v${new_version:-unknown}"
  [ -n "$BACKUP" ] && echo "✓ Backup: $BACKUP"
else
  echo "✓ DevPass Bridge already current: v${new_version:-unknown} (restart skipped)"
fi
[ -n "$CANDIDATE_MANIFEST" ] && echo "✓ Package manifest + SHA-256 verified"
if [ -n "$CANDIDATE_PLUGIN" ]; then
  echo "✓ Plugin staged: $READY_DIR/$(basename "$CANDIDATE_PLUGIN")"
  echo "✓ Risu auto-update feed verified: $BASE/plugin/latest"
fi
echo "✓ Commands: update-devpass / rollback-devpass / start-devpass / start-risu"
echo "Bridge is healthy in background. Log: $LOG_FILE"
