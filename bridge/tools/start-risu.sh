#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

RISU_DIR="${POCKETRISU_DIR:-$HOME/PocketRisu}"
RISU_SERVER="$RISU_DIR/server.sh"

if ! command -v start-devpass >/dev/null 2>&1; then
  echo "start-devpass command not found. Run install-update-tools.sh first." >&2
  exit 1
fi

echo "▶ DevPass Bridge 확인 중..."
start-devpass >/dev/null
echo "✓ DevPass Bridge healthy"

echo "▶ PocketRisu 상태 확인 중..."
if pgrep -f 'node .*server/node/server\.cjs' >/dev/null 2>&1; then
  echo "✓ PocketRisu already running"
  echo "✓ 중복 실행하지 않습니다."
  exit 0
fi

[ -f "$RISU_SERVER" ] || { echo "PocketRisu server.sh not found: $RISU_SERVER" >&2; exit 1; }
echo "▶ PocketRisu 시작..."
cd "$RISU_DIR"
exec bash "$RISU_SERVER" "$@"
