#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
BRIDGE_DIR="${DEVPASS_BRIDGE_DIR:-$HOME/PocketRisu/bridge}"
TOOLS_DIR="$BRIDGE_DIR/tools"
mkdir -p "$TOOLS_DIR"
for tool in update-devpass.sh rollback-devpass.sh start-devpass.sh start-risu.sh install-update-tools.sh; do
  [ -f "$SRC/$tool" ] || continue
  tmp="$TOOLS_DIR/.${tool}.new"
  cp -f "$SRC/$tool" "$tmp"
  chmod 700 "$tmp"
  mv -f "$tmp" "$TOOLS_DIR/$tool"
done
if [ -n "${PREFIX:-}" ] && [ -d "$PREFIX/bin" ]; then
  for cmd in update-devpass rollback-devpass start-devpass start-risu; do
    [ -f "$TOOLS_DIR/$cmd.sh" ] && ln -sf "$TOOLS_DIR/$cmd.sh" "$PREFIX/bin/$cmd"
  done
  echo "✓ Commands installed: update-devpass / rollback-devpass / start-devpass / start-risu"
else
  echo "✓ Tools installed: $TOOLS_DIR"
  echo "Run: bash $TOOLS_DIR/update-devpass.sh"
fi
