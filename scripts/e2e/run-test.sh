#!/usr/bin/env bash
#
# Wrapper untuk jalankan E2E test dengan system Node (bukan Electron).
#
# Issue: terminal sandbox vs. CI kadang pakai Electron-bundled Node yang
# tidak support syntax modern (e.g. `??`). Script ini ensure system Node dipakai.
#
# Usage:
#   ./scripts/e2e/run-test.sh
#   NODE_BIN=/path/to/node ./scripts/e2e/run-test.sh  # override

set -e

# Detect project root
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Prefer system Node (skip Electron-bundled one).
# Check version - require Node 18+ for modern syntax support.
SYSTEM_NODE=""

# Strategy 0: User-provided NODE_BIN override.
if [ -n "$NODE_BIN" ] && [ -x "$NODE_BIN" ]; then
  VERSION=$("$NODE_BIN" --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
  if [ -n "$VERSION" ] && [ "$VERSION" -ge 18 ] 2>/dev/null; then
    SYSTEM_NODE="$NODE_BIN"
  fi
fi

# Strategy 1: Try common explicit locations (handles sandboxed HOME).
if [ -z "$SYSTEM_NODE" ]; then
  for candidate in \
    /home/parkee/.nvm/versions/node/v22.18.0/bin/node \
    /home/parkee/.nvm/versions/node/v20.18.1/bin/node \
    /home/parkee/.nvm/versions/node/v18.20.5/bin/node \
    /usr/local/bin/node \
    /opt/node/bin/node
  do
    if [ -x "$candidate" ] 2>/dev/null; then
      VERSION=$("$candidate" --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
      if [ -n "$VERSION" ] && [ "$VERSION" -ge 18 ] 2>/dev/null; then
        SYSTEM_NODE="$candidate"
        break
      fi
    fi
  done
fi

# Strategy 2: `command -v node` last (skip Electron-bundled).
if [ -z "$SYSTEM_NODE" ] && command -v node &> /dev/null; then
  CANDIDATE=$(command -v node)
  case "$CANDIDATE" in
    */snap/code/*) ;;
    *)
      VERSION=$("$CANDIDATE" --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
      if [ -n "$VERSION" ] && [ "$VERSION" -ge 18 ] 2>/dev/null; then
        SYSTEM_NODE="$CANDIDATE"
      fi
      ;;
  esac
fi

if [ -z "$SYSTEM_NODE" ]; then
  echo "ERROR: System Node 18+ not found."
  echo ""
  echo "Tried:"
  echo "  - NODE_BIN environment variable"
  echo "  - /home/parkee/.nvm/versions/node/v*/bin/node"
  echo "  - /usr/local/bin/node, /opt/node/bin/node"
  echo "  - PATH"
  echo ""
  echo "Please install Node 18+ or set NODE_BIN=/path/to/node"
  exit 1
fi

echo "[E2E] Using system Node: $SYSTEM_NODE ($($SYSTEM_NODE --version))"

# Build server if needed
if [ ! -f "$PROJECT_ROOT/server/dist/index.js" ]; then
  echo "[E2E] Building server..."
  (cd "$PROJECT_ROOT/server" && npm run build)
fi

# Bundle E2E scripts
echo "[E2E] Bundling E2E scripts..."
mkdir -p "$PROJECT_ROOT/scripts/e2e/dist"
"$SYSTEM_NODE" "$PROJECT_ROOT/node_modules/.bin/esbuild" \
  scripts/e2e/run.ts \
  --bundle \
  --platform=node \
  --target=es2018 \
  --outfile=scripts/e2e/dist/run.cjs \
  --format=cjs

# Run E2E
echo "[E2E] Running tests..."
exec "$SYSTEM_NODE" scripts/e2e/dist/run.cjs
