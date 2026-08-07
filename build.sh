#!/usr/bin/env bash
# build.sh (TEST MODE) - build ke workspace TERPISAH, folder dev asli GAK disentuh sama sekali.
# Usage: ./build.sh [--skip-playwright]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_PW=false
for a in "$@"; do [ "$a" = "--skip-playwright" ] && SKIP_PW=true; done

log(){ echo -e "\033[36m[BUILD]\033[0m $1"; }
ok(){ echo -e "\033[32m[OK]\033[0m $1"; }
warn(){ echo -e "\033[33m[WARN]\033[0m $1"; }
err(){ echo -e "\033[31m[ERROR]\033[0m $1"; }

WORK="$(mktemp -d -t vc-build-XXXXXX)"
cleanup(){ rm -rf "$WORK"; }
trap cleanup EXIT

log "Workspace sementara: $WORK (repo asli lu SAMA SEKALI GAK DISENTUH)"

if command -v rsync >/dev/null; then
  rsync -a --exclude='.git' --exclude='node_modules' --exclude='release-package' --exclude='dist' "$ROOT/" "$WORK/"
else
  warn "rsync gak ada, pake cp (lebih lambat tapi tetep aman)"
  mkdir -p "$WORK"
  for item in "$ROOT"/*; do
    name="$(basename "$item")"
    [ "$name" = "release-package" ] && continue
    cp -r "$item" "$WORK/"
  done
  find "$WORK" -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true
  find "$WORK" -name dist -type d -prune -exec rm -rf {} + 2>/dev/null || true
fi
ok "Source ter-copy ke workspace, aman diutak-atik"

VERSION="test-$(date +%Y%m%d-%H%M%S)"
log "Version: $VERSION"

SERVICES=(agent server web cashier)
for svc in "${SERVICES[@]}"; do
  [ -d "$WORK/$svc" ] || { warn "$svc gak ada, skip"; continue; }
  log "[$svc] npm ci..."
  (cd "$WORK/$svc" && npm ci)
  log "[$svc] npm run build..."
  (cd "$WORK/$svc" && npm run build)
  ok "[$svc] beres"
done

for svc in agent server; do
  [ -d "$WORK/$svc" ] || continue
  log "[$svc] prune ke production-only..."
  (cd "$WORK/$svc" && npm ci --omit=dev)
done
# web & cashier tetep full node_modules - butuh `vite` buat `npm run preview:host`

STAGING="$WORK/.staging"
mkdir -p "$STAGING"

if [ "$SKIP_PW" = false ]; then
  PW_CACHE="$HOME/.cache/ms-playwright"
  if [ -d "$PW_CACHE" ]; then
    mkdir -p "$STAGING/vendor"
    cp -r "$PW_CACHE" "$STAGING/vendor/ms-playwright"
    ok "Playwright cache bundled (baca-doang dari $PW_CACHE, gak diubah)"
  else
    warn "Playwright cache gak ada - agent bakal download chromium sendiri pas pertama jalan"
  fi
fi

for svc in "${SERVICES[@]}"; do
  [ -d "$WORK/$svc" ] || continue
  dest="$STAGING/$svc"; mkdir -p "$dest"
  for item in dist node_modules package.json package-lock.json; do
    [ -e "$WORK/$svc/$item" ] && cp -r "$WORK/$svc/$item" "$dest/"
  done
  [ -f "$ROOT/$svc/.env.example" ] && cp "$ROOT/$svc/.env.example" "$dest/" || warn "[$svc] .env.example gak ada di repo asli"
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

mkdir -p "$ROOT/release-package"
ZIP="$ROOT/release-package/video-controller-release-$VERSION.zip"
log "Zipping (preserve symlinks - node_modules/.bin/* symlink harus tetep symlink)..."
(cd "$STAGING" && zip -rqy "$ZIP" .)

ok "Release siap: $ZIP"
echo ""
echo "Folder dev asli ($ROOT) gak keubah sama sekali - node_modules/dist di sana tetep utuh buat kerja harian."
echo "Next: ./install.sh --zip $ZIP"
