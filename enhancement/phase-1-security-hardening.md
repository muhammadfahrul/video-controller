# Phase 1 — Security Hardening (Summary)

**Branch**: `integration/merge-wba-atmosphere`
**Status**: Kerjaan selesai di working tree, **belum di-commit** (nunggu review pemilik branch).
**Tanggal**: 2026-08-07

---

## 1. Credential (VC-4)

- 5 `.gitignore` (root + `agent`/`server`/`web`/`cashier`) — baris `.env` di-uncomment.
- `git rm --cached` untuk `agent/.env`, `server/.env`, `web/.env`, `cashier/.env` — tetep ada di disk lokal, cuma lepas dari git tracking.
- `.env.example` di-rename dari `<service>.env.example` → `.env.example` (nama yang literally dicek `build.sh`/`build-release.sh` — sebelumnya salah nama jadi gak pernah kepake), + isi `VC_SHARED_SECRET`/`VITE_SHARED_SECRET` placeholder di semua 4.
- **API key `YOUTUBE_API_KEY` BELUM direvoke** — itu di luar kemampuan AI (butuh akses Google Cloud Console manusia). **WAJIB dilakuin sebelum merge ke `main`.**
- Scrub git history **belum** dilakuin — itu breaking change buat semua orang yang udah clone, keputusan terpisah yang perlu didiskusiin ke Fahmi/Fauzan/Fahrul dulu.

## 2. Socket auth (VC-5) — desain final: gerbang di semua koneksi, bukan cuma `agent:register`

Ketemu `PLAYER_COMMAND` di `SocketServer.ts` nerima command dari socket manapun tanpa cek registrasi — kalo cuma nutup `agent:register`, celah itu masih kebuka lebar. Jadi dipakein `io.use()` middleware (handshake-level, sebelum event apapun fire) yang nge-gate SEMUA koneksi termasuk `web`. Server **fail-closed**: kalo `VC_SHARED_SECRET` gak ke-set di server, SEMUA koneksi ditolak (bukan fail-open).

File yang berubah:
- `server/src/socket/SocketServer.ts` — middleware auth + CORS diganti dari `origin:"*"` ke regex IP lokal (RFC1918 + ZeroTier CGNAT range).
- `agent/src/network/SocketClient.ts`, `agent/src/core/Agent.ts`, `agent/src/config/config.ts`, `agent/src/config/ConfigValidator.ts`, `agent/src/services/ConfigService.ts` — kirim token, fail-fast kalo `VC_SHARED_SECRET` kosong.
- `cashier/src/services/MultiSocketService.ts` **dan** `cashier/src/services/SocketService.ts` (ada 2 socket connection terpisah di cashier, dua-duanya diupdate) + `cashier/src/config/security.ts` (baru).
- `web/src/services/socket/SocketService.ts` + `web/src/config/env.ts` — **di luar scope literal task**, tapi wajib karena desain handshake-level.
- `server/src/test-client.ts` — dev tool manual, diupdate biar gak "kelihatan rusak".

## 3. Build pipeline

- `build.sh` & `build-release.sh` — generate 1 secret random (`openssl rand -hex 32`) per build, inject ke `.env.example` semua service yang di-bundle, simpen juga di `RELEASE_SECRET.txt`. **Udah ditest end-to-end di Ubuntu, jalan.**
- `build-release.ps1` (baru) — port PowerShell dari `build-release.sh`. **UNTESTED**, gak bisa dijalanin PowerShell dari environment Linux tempat ini dikerjain. Dikirim ke user buat ditest manual di PC Windows.
- `.gitignore` nambah `release-package/` — soalnya sekarang isinya secret asli.

## 4. Testing (Ubuntu)

Semua manual, di luar `install-test.sh` (lebih cepet buat iterasi):
- ✅ Token bener → agent connect & register sukses
- ✅ Token salah → `[SOCKET] Connection rejected by server: Unauthorized...`, server log juga catet
- ✅ Token kosong di agent → gagal start sama sekali (`ConfigValidator` throw), gak sempet connect
- ✅ Server tanpa `VC_SHARED_SECRET` → fail-closed, nolak semua orang termasuk yang token-nya "valid-looking"
- ✅ 4 service (`agent`, `server`, `web`, `cashier`) compile bersih

## Checklist manual verification — Windows (PC Fahmi / PC Windows sendiri)

**A. Build pipeline:**
1. `.\build-release.ps1` dari root repo — selesai tanpa error?
2. ⚠️ **Yang paling dikhawatirin**: `Compress-Archive` dikenal lambat/kadang gagal buat folder segede `node_modules` (ribuan file, kadang kena limit path 260 karakter). Kalo macet/gagal di situ, `install.ps1` udah punya fungsi `Install-7Zip` yang bisa di-swap in.
3. Extract zip hasil build, cek `agent\.env.example`, `server\.env.example`, `web\.env.example`, `cashier\.env.example` — semua `VC_SHARED_SECRET`/`VITE_SHARED_SECRET` harus SAMA PERSIS, dan sama persis sama isi `RELEASE_SECRET.txt`.

**B. Socket auth functional test:**
4. Copy `.env.example` → `.env` di folder `server` & `agent` hasil extract.
5. Start server (`node dist\index.js` di folder server) — log JANGAN muncul warning "VC_SHARED_SECRET is not set".
6. Start agent (`node dist\index.js` di folder agent) — harus muncul `[SOCKET] Connected to server` + di sisi server ada `Agent register {...}`.
7. **Negative test**: ubah `VC_SHARED_SECRET` di `agent\.env` jadi random string, restart agent — harus muncul `[SOCKET] Connection rejected by server: Unauthorized...`, TIDAK ada registrasi.
8. **Negative test 2**: kosongin `VC_SHARED_SECRET` di `agent\.env` — agent harus gagal start sama sekali (error jelas), bukan nyoba connect dulu.
9. Jalanin cashier & web (tablet/browser) beneran, pastiin masih bisa play/pause/seek dari UI — ini nge-exercise seluruh jalur auth+command end-to-end, bukan cuma level socket.

## Keputusan yang perlu dikonfirmasi tim

1. **Per-room scoping** — token sekarang venue-wide (cuma 1 secret), bukan per-room. `PLAYER_COMMAND` masih bisa nyasar ke `agentId` room lain kalo venue network-nya flat. Fix beneran butuh validasi `agentId` itu emang punya room yang connect — di luar scope Phase 1 ini, worth jadi ticket terpisah.
2. **CORS regex** — di-default-in ke pattern RFC1918 + range ZeroTier standar (`100.64.0.0/10`) karena belum ada konfirmasi range spesifik dari Fadlan. Kalo venue pake setup beda, perlu disesuaikan.
3. Nemu **`install.sh` (production) kelihatannya gak konsisten** sama `install-test.sh`/`build-release.sh` — `install.sh` gak nge-extract zip sama sekali (beda dari yang disebut di pesan penutup `build-release.sh`). Ini di luar scope Phase 1, gak disentuh, tapi worth dicek Fadlan.
4. Side-effect: `cashier/package-lock.json` yang tadinya kehapus di working tree, ke-regenerate pas `npm install` buat testing. Dibiarin (dibutuhin biar `npm ci` di pipeline jalan), tapi keputusan keep/discard itu tetep punya pemilik branch.

## Update — hasil testing end-to-end (setelah handoff awal)

**Status: ✅ Full happy-flow tervalidasi** — build.sh → install-test.sh (room: agent+server+web) → cashier manual, semuanya connect pake token yang sama dari 1 build, kasir bisa liat room online, aktifin room (nama/tarif/timer), dan web langsung unlock dari "Ruangan Sedang Offline" ke full remote control. Auth + activation + command flow kebukti jalan utuh.

2 bug tambahan ketemu & difix selama testing ini (di luar scope asli Phase 1, tapi ngeblok testing):

1. **`web/package-lock.json` & `cashier/package-lock.json` ke-commit di git dengan registry `registry.npmmirror.com`** (persis Issue #8 di `docs/02-TDD.md`, belum pernah difix sebelumnya). Ini bikin `npm ci` gagal (`EUSAGE: no lockfile`) secara intermiten — kemungkinan ada proteksi di environment yang quarantine file nunjuk ke registry non-standar. **Fix**: regenerate kedua lockfile pake `npm install` bersih (`registry.npmjs.org`). Perlu dikomit terpisah biar Fadlan/Fauzan gak ketemu masalah yang sama.
2. **`install.sh` (interactive) — input "Rooms JSON" gampang salah format.** User (dan siapapun) natural-nya ngetik `{"name":"Room 1",...}` (objek doang) padahal `VITE_ROOMS` butuh array `[{"name":"Room 1",...}]`. Kalo salah format, `JSON.parse` gagal validasi `Array.isArray()` di `useRoomStore.ts` → silently jadi "0 room" tanpa error jelas ke user. **Fix**: `install.sh` sekarang auto-wrap input yang gak diawali `[` jadi array, plus kasih info log pas itu kejadian.

**Catatan penting soal build/testing Vite apps**: `VITE_*` env vars di-bake ke bundle JS pas **build time** (`vite build`), bukan runtime. Edit `.env` di folder hasil extract terus langsung `vite preview` **gak akan ngefek** — harus rebuild dulu (`npm run build`) sebelum `preview` bisa liat value baru. Ini bikin testing `cashier`/`web` gak bisa "quick-edit" kayak `agent`/`server` (yang baca `.env` pas runtime via `dotenv`).

**Belum ditest**: `build-release.ps1` di PC Windows (masih nunggu hasil dari user).
