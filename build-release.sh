#!/usr/bin/env bash
# Build Release - jalan SEKALI di build machine. Usage: ./build-release.sh [--skip-build] [--skip-playwright]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGING="$ROOT/release-package/staging"
SKIP_BUILD=false; SKIP_PW=false
for a in "$@"; do
  [ "$a" = "--skip-build" ] && SKIP_BUILD=true
  [ "$a" = "--skip-playwright" ] && SKIP_PW=true
done

log(){ echo -e "\033[36m[BUILD]\033[0m $1"; }
ok(){ echo -e "\033[32m[OK]\033[0m $1"; }
warn(){ echo -e "\033[33m[WARN]\033[0m $1"; }

VERSION="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo manual)-$(date +%Y%m%d-%H%M)"
log "Version: $VERSION"

rm -rf "$STAGING"; mkdir -p "$STAGING"
SERVICES=(agent server web cashier)

for svc in "${SERVICES[@]}"; do
  [ -d "$ROOT/$svc" ] || { warn "$svc gak ada, skip"; continue; }
  log "[$svc] npm ci..."
  (cd "$ROOT/$svc" && npm ci)
  if [ "$SKIP_BUILD" = false ]; then
    log "[$svc] npm run build..."
    (cd "$ROOT/$svc" && npm run build)
  fi
  ok "[$svc] beres"
done

# prune agent & server ke production-only (jalan via `node dist/index.js`)
for svc in agent server; do
  [ -d "$ROOT/$svc" ] || continue
  log "[$svc] prune ke production-only..."
  (cd "$ROOT/$svc" && npm ci --omit=dev)
done
# web & cashier tetep full node_modules - butuh `vite` buat `npm run preview:host`

if [ "$SKIP_PW" = false ]; then
  PW_CACHE="$HOME/.cache/ms-playwright"
  if [ -d "$PW_CACHE" ]; then
    mkdir -p "$STAGING/vendor"
    cp -r "$PW_CACHE" "$STAGING/vendor/ms-playwright"
    ok "Playwright cache bundled"
  else
    warn "Playwright cache gak ada di $PW_CACHE - jalanin: cd agent && npx playwright install chromium, lalu build ulang"
  fi
fi

for svc in "${SERVICES[@]}"; do
  [ -d "$ROOT/$svc" ] || continue
  dest="$STAGING/$svc"; mkdir -p "$dest"
  for item in dist node_modules package.json package-lock.json; do
    [ -e "$ROOT/$svc/$item" ] && cp -r "$ROOT/$svc/$item" "$dest/"
  done
  # .env.example doang, JANGAN .env asli - jangan sampe secret/config per-room ke-bundle
  [ -f "$ROOT/$svc/.env.example" ] && cp "$ROOT/$svc/.env.example" "$dest/" || warn "[$svc] .env.example gak ada"
done

echo -n "$VERSION" > "$STAGING/RELEASE_VERSION.txt"

# Generate 1 shared secret buat socket auth (VC-5) - dipake bareng semua service &
# semua room dari release build ini, jadi gak perlu manual sync token per PC.
SHARED_SECRET="$(openssl rand -hex 32)"
echo -n "$SHARED_SECRET" > "$STAGING/RELEASE_SECRET.txt"
for svc in "${SERVICES[@]}"; do
  envfile="$STAGING/$svc/.env.example"
  [ -f "$envfile" ] || continue
  sed -i \
    -e "s|^VC_SHARED_SECRET=.*|VC_SHARED_SECRET=$SHARED_SECRET|" \
    -e "s|^VITE_SHARED_SECRET=.*|VITE_SHARED_SECRET=$SHARED_SECRET|" \
    "$envfile"
done
ok "Shared secret digenerate & di-inject ke .env.example semua service (juga tersimpan di RELEASE_SECRET.txt)"

ZIP="$ROOT/release-package/video-controller-release-$VERSION.zip"
rm -f "$ZIP"
log "Zipping..."
(cd "$STAGING" && zip -rqy "$ZIP" .)
ok "Release siap: $ZIP"
echo "Next: copy zip + install.sh ke tiap PC room, jalanin ./install.sh di situ."
