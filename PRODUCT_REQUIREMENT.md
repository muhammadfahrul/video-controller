# Video Controller — Product Requirement Document (PRD)

> Dokumen ini jadi acuan utama sebelum fix bug atau tambah fitur. Tolong review & koreksi bila ada yang miss.

---

## 1. Topologi Sistem

### 1.1 Batasan utama (Confirmed)
- **1 Ruangan = 1 PC** yang berdiri sendiri (isolated).
- Tiap PC Ruangan terinstall **Agent + Server + Web** (Room App bundle) lewat `install.sh mode 1`.
- Tiap PC Ruangan punya `ROOM_ID` unik dan SQLite database lokal sendiri.
- **PC Kasir** adalah PC terpisah yang hanya terinstall **Cashier** lewat `install.sh mode 2`.
- PC Kasir konek ke N server ruangan lewat `MultiSocketService` (1 socket per entry `VITE_ROOMS`).

### 1.2 Diagram

```
┌──────────────────────────────┐   ┌──────────────────────────────┐   ┌──────────────────────────────┐
│   PC Ruangan 1               │   │   PC Ruangan 2               │   │   PC Ruangan 3               │
│   ROOM_ID=room-001           │   │   ROOM_ID=room-002           │   │   ROOM_ID=room-003           │
│                              │   │                              │   │                              │
│   ┌───────────────────────┐  │   │   ┌───────────────────────┐  │   │   ┌───────────────────────┐  │
│   │ Agent                 │  │   │   │ Agent                 │  │   │   │ Agent                 │  │
│   │ + Browser YouTube     │  │   │   │ + Browser YouTube     │  │   │   │ + Browser YouTube     │  │
│   └──────────┬────────────┘  │   │   └──────────┬────────────┘  │   │   └──────────┬────────────┘  │
│              │ socket.io      │   │              │ socket.io     │   │              │ socket.io     │
│   ┌──────────▼────────────┐  │   │   ┌──────────▼────────────┐  │   │   ┌──────────▼────────────┐  │
│   │ Server :53331         │  │   │   │ Server :53331         │  │   │   │ Server :53331         │  │
│   │ + SQLite lokal        │  │   │   │ + SQLite lokal        │  │   │   │ + SQLite lokal        │  │
│   └───────────────────────┘  │   │   └───────────────────────┘  │   │   └───────────────────────┘  │
│   ┌───────────────────────┐  │   │   ┌───────────────────────┐  │   │   ┌───────────────────────┐  │
│   │ Web PWA :53333        │  │   │   │ Web PWA :53333        │  │   │   │ Web PWA :53333        │  │
│   │ (opsional, kontrol)   │  │   │   │ (opsional, kontrol)   │  │   │   │ (opsional, kontrol)   │  │
│   └───────────────────────┘  │   │   └───────────────────────┘  │   │   └───────────────────────┘  │
└──────────────┬───────────────┘   └──────────────┬───────────────┘   └──────────────┬───────────────┘
               │ :53331                           │ :53331                           │ :53331
               │                                  │                                  │
               └──────────────────────────────────┼──────────────────────────────────┘
                                                  │
                                                  ▼
                              ┌──────────────────────────────────────────┐
                              │  PC Kasir                                │
                              │  ┌─────────────────────────────────────┐  │
                              │  │ Cashier :53334                      │  │
                              │  │ VITE_ROOMS = list of all rooms      │  │
                              │  │ - tiap entry.ip = IP PC ruangan tsb│  │
                              │  └─────────────────────────────────────┘  │
                              └──────────────────────────────────────────┘
```

### 1.3 Karakteristik topologi
- **TIDAK ADA server pusat / terpusat.** Tidak ada komunikasi antar-server.
- **Database per-PC** — transaksi & state player tersimpan lokal di tiap server ruangan.
- **Cashier multi-connection** — 1 socket per ruangan, biaya koneksi = N ruangan.
- **Web di tiap PC ruangan** hanya dipakai untuk kontrol lokal (mobile control di TV).
- **Agent tidak terlihat dari server lain** — cashiER hanya kenal agent di server yg sama PC-nya.

---

## 2. Stack & Port Standar

| Komponen | Port Default | Catatan |
|----------|-------------|---------|
| Server (Socket.IO + Express) | `53331` | tiap PC ruangan, hardcoded |
| Web Vite dev | `53332` | tiap PC ruangan saat dev |
| Web Vite preview | `53333` | production preview di tiap PC ruangan |
| Cashier Vite dev | `53334` | PC Kasir |
| Cashier Vite preview | `53335` | production preview di PC Kasir |

---

## 3. Konfigurasi `.env` (Konsolidasi)

### 3.1 `agent/.env` (per PC Ruangan)
```bash
# WAJIB (beda tiap PC)
ROOM_ID=room-001
ROOM_NAME=Room 1

# Opsional
BILLING_ENABLED=true        # toggle billing per PC
SERVER_IP=                  # kosongkan = auto-detect IP lokal PC (recommended)
SERVER_PORT=53331

# Browser (PC ruangan biasanya visible, pakai display)
BROWSER_HEADLESS=false
BROWSER_CHANNEL=chrome
BROWSER_ARGS=--start-maximized||--kiosk||--disable-dev-shm-usage||--no-sandbox
BROWSER_VIEWPORT=false
BROWSER_VIEWPORT_WIDTH=1920
BROWSER_VIEWPORT_HEIGHT=1080

# YouTube
YOUTUBE_HOME=https://www.youtube.com

# Health
HEALTH_INTERVAL=5000
LOG_LEVEL=info
```

### 3.2 `server/.env` (per PC Ruangan)
```bash
PORT=53331
BILLING_ENABLED=true
YOUTUBE_API_KEY=<key>
```

### 3.3 `web/.env` (per PC Ruangan, opsional)
```bash
VITE_SERVER_IP=127.0.0.1    # server ada di PC yg sama
VITE_SERVER_PORT=53331
VITE_BILLING_ENABLED=true
```

### 3.4 `cashier/.env` (PC Kasir)
```bash
VITE_BILLING_ENABLED=true

# Tiap entry = 1 ruangan di 1 PC server tersendiri.
# 'ip' = IP PC ruangan tsb (bukan IP server pusat).
# 'roomId' HARUS sama dengan ROOM_ID di agent/.env PC terkait.
VITE_ROOMS=[
  {"roomId":"room-001","name":"Room 1","ip":"192.168.1.104","port":53331,"pricePerHour":50000},
  {"roomId":"room-002","name":"Room 2","ip":"192.168.1.114","port":53331,"pricePerHour":60000},
  {"roomId":"room-003","name":"Room 3","ip":"192.168.1.12", "port":53331,"pricePerHour":45000}
]
```

---

## 4. Komunikasi Real-Time (Socket.IO Events)

### 4.1 Event dari Cashier → Server Ruangan
| Event | Payload | Tujuan |
|-------|---------|--------|
| `cashier:request-agents` | (none) | Minta list semua agent |
| `cashier:activate-room` | `{ roomId, roomName, durationMinutes?, customerName?, customerPhone?, customerEmail?, customerNote? }` | Nyalakan ruangan |
| `cashier:deactivate-room` | `{ roomId }` | Matikan ruangan |
| `cashier:extend-time` | `{ roomId, additionalMinutes }` | Tambah waktu |
| `transaction:save` | `{ transaction }` | Simpan/update transaksi |
| `transaction:get` | (none) | Minta list transaksi |
| `transaction:delete` | `{ transactionId }` | Hapus 1 transaksi |
| `transaction:clear` | (none) | Hapus semua transaksi |

### 4.2 Event dari Agent → Server Ruangan
| Event | Payload | Tujuan |
|-------|---------|--------|
| `agent:register` | `{ id, roomId, roomName }` | Daftar agent saat connect |
| `agent:heartbeat` | `{ id, roomId }` | Heartbeat 5 detik |
| `player:command` | `{ type, ...payload }` | Command play/pause/volume (dipakai kalau server trigger ke agent) |
| `player:state` | `{ agentId, player }` | State video saat ini |
| `playlist:state` | `{ agentId, items, currentIndex, ... }` | State playlist |
| `agent:clear-data` | (event internal) | Reset player+playlist |
| `agent:error` | `{ agentId, roomId, type, message, ... }` | Laporan error dari agent |

### 4.3 Event dari Server Ruangan → Cashier/Web (Broadcast)
| Event | Payload | Tujuan |
|-------|---------|--------|
| `agents:update` | `[AgentInfo]` | List semua agent + state terbaru |
| `player:update` | `{ agentId, player }` | Update player state |
| `playlist:update` | `{ items, currentIndex, ... }` | Update playlist |
| `room:activation` | `{ roomId, roomName, isActive, startTime, expiresAt, customerInfo }` | Aktivasi/deaktivasi/expiry |
| `room:expiry-warning` | `{ roomId, secondsRemaining, expiresAt }` | Warning 5/2/1/0.5 menit sebelum habis |
| `agent:activation` | `{ isActive, expiresAt, ... }` | Aktivasi langsung ke agent spesifik |
| `transaction:get` | `[Transaction]` | List transaksi (response ke `transaction:get` + broadcast save/delete/clear) |

---

## 5. Fitur Utama per Komponen

### 5.1 Server (per PC Ruangan)
- [x] Socket.IO server listen `:53331`
- [x] HTTP REST `/api/agents`, `/api/agents/:id/command`, `/health`
- [x] SQLite (sql.js) — file `data/database.sqlite` lokal
- [x] Register/heartbeat agent (15 detik timeout → OFFLINE)
- [x] Room activation (stateful, persist across reconnect via `activatedRooms`)
- [x] Auto-expiry timer (kalau `durationMinutes` diset)
- [x] Warning broadcasts (5/2/1/0.5 menit sebelum habis)
- [x] Transaction CRUD (save, get, delete, clear)
- [x] Player/Playlist state persistence di DB
- [x] Load saved state to agent saat reconnect

### 5.2 Agent (per PC Ruangan)
- [x] Connect ke server lokal via Socket.IO
- [x] Wait `agent:activation` event sebelum mulai (kalau billing enabled)
- [x] Kalau `BILLING_ENABLED=false`, langsung start (auto-activate)
- [x] Browser automation (Playwright + Chromium) → YouTube
- [x] Command handler: play, pause, stop, next, prev, setVolume, mute, unmute, fullscreen, openUrl, addToPlaylist, dll.
- [x] Auto-show `start_image.html` saat aktivasi / `expired_image.html` saat deaktivasi
- [x] Health check 5 detik: browser, player, page
- [x] Auto-recovery: kalau browser crash, relaunch
- [x] Sync player+playlist state ke server setiap ~1 detik
- [x] Save state ke DB server setiap emit

### 5.3 Cashier (PC Kasir)
- [x] MultiSocket — 1 socket per ruangan
- [x] Tampilan: status, tarif, customer info, timer countdown
- [x] Activate room (dengan form customer)
- [x] Deactivate room (auto-create transaction)
- [x] Extend time
- [x] Status ruangan: OFFLINE / AKTIF / UNPAID / PAID / BERSIHKAN / SUDAH DIBERSIHKAN / ONLINE
- [x] Move Room (pindah customer antar ruangan)
- [x] Transaction history (per ruangan + global)
- [x] Payment confirmation
- [x] Mark cleaned (BERSIHKAN → SUDAH DIBERSIHKAN manual)
- [x] Print receipt (opsional)
- [x] Full-page loading untuk tiap operasi
- [x] `pricePerHour` per ruangan dari `VITE_ROOMS`

### 5.4 Web (per PC Ruangan, opsional)
- [x] Connect ke server lokal
- [x] Kontrol player: play/pause/skip/volume
- [x] Tambah ke playlist dari search YouTube
- [x] Lihat current video info
- [x] (Mobile/tablet remote control)

---

## 6. State & Storage

### 6.1 Server SQLite (per PC Ruangan)
**Tabel: `agents`**
- `agentId` (PK), `player` (JSON), `playlist` (JSON), `updatedAt`
- Dipakai untuk restore state kalau agent reconnect.

**Tabel: `transactions`**
- `id` (PK), `roomId`, `roomName`, `customerInfo`, `startTime`, `endTime`, `duration`, `pricePerHour`, `totalPrice`, `paymentMethod`, `paidAt`, `cleanedAt`, `notes`
- Tiap PC punya data sendiri. Tidak ada sinkronisasi antar server.

**Tabel: `errors`**
- `id` (PK auto), `agentId`, `roomId`, `timestamp`, `type`, `message`, `stack`, `context`

### 6.2 Cashier Storage (in-memory + Zustand)
- `useRoomStore` — list ruangan dari `VITE_ROOMS`
- `useTransactionStore` — transaksi yang di-load dari masing-masing server
- Tidak ada persistence di cashier (refresh = reset, reload dari server)

---

## 7. Status Ruangan (Cashier View)

| Status | Kondisi | Aksi yang bisa dilakukan |
|--------|---------|--------------------------|
| **OFFLINE** | Server/agent tidak terhubung (socket disconnected) | Tunggu online, tidak ada aksi |
| **ONLINE** | Server+agent aktif tapi ruangan tidak aktif | Activate (klik tombol power) |
| **AKTIF** | Ruangan aktif, timer berjalan | Deactivate, Extend, Move |
| **UNPAID** | Ada transaksi `paidAt=0` | Activate diblokir, harus bayar dulu |
| **PAID** | Transaksi `paidAt>0`, masih dalam window BERSIHKAN | Mark as Cleaned (manual) atau tunggu auto |
| **BERSIHKAN** | 0–30 menit setelah paid, `cleanedAt` belum diisi | Activate diblokir, harus tunggu SUDAH DIBERSIHKAN |
| **SUDAH DIBERSIHKAN** | `cleanedAt>0`, atau 30–60 menit setelah paid (auto tanpa mark manual) | Activate bisa dilakukan lagi |
| **ONLINE (auto-revert)** | >60 menit setelah paid dan belum di-mark cleaned manual | Status kembali ke ONLINE otomatis, Activate bisa dilakukan lagi |

> Detail timing & threshold lihat `cashier/src/components/RoomCard.tsx → getPaidStatus()` (`CLEANING_THRESHOLD=30menit`, `CLEANED_THRESHOLD=60menit`).

---

## 8. Known Issues / Bug yang Menunggu Fix (Tertunda)

Berikut daftar issue/bug yang sudah diidentifikasi tapi **belum di-fix** (per permintaan user hold dulu):

### 8.1 [BUG HIGH] `useTransactionStore.setTransactions` replace-mode tidak merge multi-server
**Symptom:** Saat ada 2+ server, transaksi Ruangan 1 yang di-load duluan akan hilang/ditimpa ketika Ruangan 2 mengirim `transaction:get`.

**Lokasi:** `cashier/src/store/useTransactionStore.ts → setTransactions`

**Penyebab:** Implementasi sekarang `set({ transactions: serverTransactions })`, bukan merge dengan existing.

**Fix yang direncanakan:**
- Ganti ke `set(state => ({ transactions: mergeById(state.transactions, serverTransactions) }))`
- Key: `id` transaksi (primary), fallback `roomId + startTime`
- Update: prefer latest `cleanedAt` (server wins kalau ada)

### 8.2 [BUG MEDIUM] `loadTransactions(roomId)` pakai key yang salah
**Symptom:** Bisa request transaksi dengan key mismatch kalau `config.id !== agent.roomId`.

**Lokasi:** `cashier/src/services/MultiSocketService.ts → loadTransactions`

**Penyebab:** Lookup `this.connections.get(roomId)` padahal key = `config.id`, sedangkan `roomId` parameter bisa = `agent.roomId`.

**Fix yang direncanakan:**
- Fallback lookup by `config.id`, `config.roomId`, `config.name`
- Atau add method `getConnectionForRoom(roomId)` yang handle semua kemungkinan

### 8.3 [KNOWN] Shared-IP Cashier — ruangan dengan IP server sama conflict di AgentRegistry
**Symptom:** Kalau nanti ada skenario 2 ruangan beda server tapi IP sama:port beda, agent `agent-...` key akan saling overwrite.

**Status:** Belum terjadi di topologi 1 ruangan 1 PC. Hanya informational.

**Fix kalau dibutuhkan:** Ganti `AgentRegistry.register(id)` key dari `agent.id` jadi `agent.roomId`. (Sesuai jawaban: topologi Anda "1 ruangan = 1 PC" jadi **TIDAK** akan di-fix sekarang.)

### 8.4 [KNOWN] Per-isolated Database — tidak ada sinkronisasi antar server
**Sesuai design.** Tiap PC punya data sendiri. Backup per-PC adalah tanggung jawab operator.

---

## 9. Yang akan di-Fix (Setelah Konfirmasi Scope)

Mohon konfirmasi sebelum saya mulai fix. Options:

| # | Issue | File | Effort |
|---|-------|------|--------|
| A | Merge transaksi multi-server (8.1) | `useTransactionStore.ts`, `useRoomStore.ts` | ~30 mnt |
| B | Fix `loadTransactions` lookup (8.2) | `MultiSocketService.ts` | ~15 mnt |
| C | Refactor `AgentRegistry` key (8.3) | `AgentRegistry.ts`, semua callers | ~1 jam |
| D | Tambah sinkronisasi transaksi antar-server (8.4) | `DatabaseService.ts`, server baru | ~3-5 jam |

Default saya kerjakan **A + B** saja (sesuai scope dokumentasi yang Anda minta). C & D hanya kalau Anda mau.

---

## 10. Acceptance Criteria (konsolidasi)

Aplikasi dianggap "sesuai" jika:

- [ ] Tiap PC ruangan bisa auto-start `agent + server + web` via systemd.
- [ ] PC Kasir bisa konek ke 1+ server ruangan tanpa crash.
- [ ] Activate dari Kasir → agent di ruangan yg sama terima `agent:activation` < 1 detik.
- [ ] Deactivate dari Kasir → transaksi auto-created dengan harga yg benar (per jam, ceil).
- [ ] Auto-expiry bekerja (kalau `durationMinutes` diset) → deactivate + clear player di agent.
- [ ] Timer countdown di Cashier sinkron dengan `expiresAt` server.
- [ ] Perpanjangan waktu dari Kasir → `expiresAt` update di server + agent.
- [ ] Transaksi dari tiap ruangan muncul di Transaction page (setelah fix 8.1).
- [ ] Status ruangan (OFFLINE, AKTIF, UNPAID, PAID, BERSIHKAN, SUDAH DIBERSIHKAN, ONLINE) tampil sesuai kondisi.
- [ ] Move Room (pindah ruangan) preserve customer info + sisa waktu.
- [ ] `BILLING_ENABLED=false` → agent auto-aktif tanpa tunggu kasir.

---

## 11. Di Luar Scope (Tidak di-handle aplikasi)

- **Backup database otomatis** — tanggung jawab operator (cron, rsync, dll).
- **Sinkronisasi transaksi antar-PC** — desain topologi memang isolated.
- **Multi-agent di 1 PC** — tidak digunakan (sesuai "1 ruangan = 1 PC").
- **High-availability** server — kalau PC ruangan mati, ruangan tsb offline sampai PC nyala lagi.
- **Auth/login** — tidak ada. Semua socket trusted di jaringan lokal.
- **HTTPS/WSS** — plain HTTP/WS, asumsi jaringan private.

---

## 12. Konfirmasi (Closed)

- ✅ Scope fix bug: **A + B + C** (transaksi hilang + lookup key + AgentRegistry key).
- ✅ Web PWA dipakai di tiap PC Ruangan.
- ✅ Export/sync transaksi antar PC: **TIDAK diperlukan** (desain isolated sudah cukup).

---

## 13. Implementation Plan Fix A + B + C

### Fix A: Merge transaksi multi-server
- File: `cashier/src/store/useTransactionStore.ts`
- Ganti `setTransactions(serverTransactions)` jadi merge by id:
  - Existing transactions (state.transactions) ∪ Server transactions
  - Kalau id sama, server wins (kecuali local `cleanedAt` lebih baru dari server — local wins)
- File: `cashier/src/services/MultiSocketService.ts`
- Handler `transaction:get` cukup pass data mentah, store yang handle merge

### Fix B: Lookup connection yang robust
- File: `cashier/src/services/MultiSocketService.ts`
- `loadTransactions(roomId)`: tambah helper `findConnectionForRoom(roomId)` yang fallback lookup by:
  - `connection.config.id === roomId`
  - `connection.config.roomId === roomId`
  - `connection.config.name.toLowerCase() === roomId.toLowerCase()`
- Sama untuk method lain (`activateRoom`, `deactivateRoom`, `extendTime`)

### Fix C: AgentRegistry pakai `roomId` sebagai key
- File: `server/src/services/AgentRegistry.ts`
- `register(agent)`: key = `agent.roomId` (bukan `agent.id`)
- Update semua method `get`, `updateHeartbeat`, `updateSnapshot`, `setActive`, `removeBySocket`, dll.
- File affected: `SocketServer.ts`, `CommandController.ts`, semua callers dari `getById`/`getRef(id)`

---

---

## §10. Bug-Bug yang Ditemukan via Unit Test (Critical)

Saat menulis unit test untuk Fix A+B+C, ditemukan bug tambahan yang **sebelumnya tidak terdeteksi**:

### Bug A.1: `setTransactions` Tidak Commit ke Store
**Symptom**: Function compute `merged` & `deduplicated` tapi tidak pernah `set({ transactions: ... })`.
**Lokasi**: `cashier/src/store/useTransactionStore.ts:147`
**Fix**: Tambah `set({ transactions: deduplicated })` di akhir function.
**Severity**: 🔴 Critical — store tidak pernah update dari server.

### Bug A.2: Multi-Server Orphan Hilang
**Symptom**: Saat 2 server mengirim transaksi secara bergantian, transaksi dari server pertama hilang saat server kedua update.
**Root Cause**: Policy orphan: `paidAt === 0` → drop. Tapi di multi-server, transaksi dari server lain akan kelihatan orphan & di-drop.
**Fix**: Tambah parameter `sourceRoomId` ke `setTransactions(tx, sourceRoomId)`. Orphan dengan `roomId \!== sourceRoomId` sekarang **dipertahankan**.
**Lokasi**:
- `cashier/src/store/useTransactionStore.ts:74` (signature)
- `cashier/src/services/MultiSocketService.ts:451` (pass sourceRoomId)
**Severity**: 🟡 High — silent data loss.

### Bug B.1: Connection Lookup Strict
**Symptom**: `loadTransactions(roomId)` gagal resolve kalau `config.id \!== roomId`.
**Fix**: Tambah helper `findConnectionForRoom()` dengan 5 fallback modes (config.id, config.roomId, agent.roomId, config.name case-insensitive, config.id normalized).
**Lokasi**: `cashier/src/services/MultiSocketService.ts:129`
**Severity**: 🟡 High — feature could silently fail.

---

## §11. Unit Test Setup

### Server
- **Framework**: vitest 2.x
- **File**: `server/vitest.config.ts`
- **Tests**: `server/src/services/AgentRegistry.test.ts` (20 tests)

### Cashier
- **Framework**: vitest 2.x
- **File**: `cashier/vitest.config.ts`
- **Tests**:
  - `cashier/src/store/useTransactionStore.test.ts` (11 tests, Fix A)
  - `cashier/src/services/MultiSocketService.test.ts` (7 tests, Fix B)

### Hasil Test

```
=== SERVER (Fix C) ===
✓ src/services/AgentRegistry.test.ts (20 tests)
   Tests  20 passed (20)

=== CASHIER (Fix A + B) ===
✓ src/store/useTransactionStore.test.ts (11 tests)
✓ src/services/MultiSocketService.test.ts (7 tests)
   Tests  18 passed (18)

TOTAL: 38 tests passed
```

### Cara Run
```bash
# Server
cd server && npm test

# Cashier
cd cashier && npm test

# Watch mode
cd cashier && npm run test:watch
```

### TypeScript Build Status
| Package | Status |
|---------|--------|
| server  | ✅ tsc OK |
| agent   | ✅ tsc OK |
| cashier | ✅ tsc -b + vite OK |
| web     | ✅ tsc + vite OK |

---

## §12. E2E Test Setup

### Lokasi
- Folder: [`scripts/e2e/`](scripts/e2e/)
- Entry point: [`scripts/e2e/run.ts`](scripts/e2e/run.ts)
- Wrapper bash: [`scripts/e2e/run-test.sh`](scripts/e2e/run-test.sh)
- Helper: `spawn-server.ts`, `test-client.ts`, `spawn-mock-agent.ts`

### Tujuan
Mensimulasikan topologi production (1 ruangan = 1 PC) di 1 host dengan cara:
- Spawn 3 server processes di port berbeda (53331, 53332, 53333)
- Spawn 3 mock agents (1 per server) yang register + heartbeat
- Spawn 1 cashier-like client dengan `MultiSocketService`-style (1 socket per entry `VITE_ROOMS`)

### Tests yang Dijalankan

| # | Test | Verifikasi |
|---|------|------------|
| 1 | Multi-server connection | Cashier buka 3 socket simultan ke 3 server |
| 2 | Activate flow end-to-end | Activate Ruangan 1 → hanya agent Ruangan 1 yg terima activation |
| 3 | Transaction merge (Fix A) | Cross-server transaction preservation |
| 4 | Connection lookup (Fix B) | Activate via agent roomId (bukan config.id) |
| 5 | Reconnect | Kill + restart 1 server → agent re-register, transaksi preserved |

### Cara Run

```bash
# Auto-detect Node 18+
./scripts/e2e/run-test.sh

# Override Node path (untuk environment terbatas)
NODE_BIN=/path/to/node ./scripts/e2e/run-test.sh

# Manual (setelah bundle)
esbuild scripts/e2e/run.ts --bundle --platform=node --target=es2018 \
  --outfile=scripts/e2e/dist/run.cjs --format=cjs
node scripts/e2e/dist/run.cjs
```

### Prerequisites
- Node 18+ terinstall di system (bukan Electron-bundled).
- Server sudah di-build: `cd server && npm run build`.

### Output yang Diharapkan
```
[STEP] Phase 1: Spawning 3 servers
[PASS] Server Room 1 spawned on port 53331
[PASS] Server Room 2 spawned on port 53332
[PASS] Server Room 3 spawned on port 53333
[INFO] Waiting for all servers to be ready...
[PASS] All 3 servers ready

[STEP] Phase 2: Spawning 3 mock agents
... (semua pass)

[STEP] Test 1: Multi-server connection
[PASS] All 3 cashier sockets connected to 3 servers

[STEP] Test 2: Activate flow end-to-end
... (semua pass)

[STEP] Test 3: Transaction merge (Fix A)
[PASS] Cross-server preservation works: server 1 still has 4 tx after server 2 update

[STEP] Test 4: Connection lookup robust (Fix B)
... (semua pass)

[STEP] Test 5: Reconnect after server restart
... (semua pass)

[PASS] ALL E2E TESTS PASSED ✅
```

### Hasil Test Terakhir
```
=== E2E (5 test scenarios) ===
Tests  33 passed (33 assertions across 5 tests)
```

### Catatan Penting
- **Electron-bundled Node TIDAK didukung.** Gunakan system Node 18+ (mis. via nvm).
- Database SQLite per-server di-isolasi di `.e2e-data/server-{name}/database.sqlite`.
- Cleanup otomatis stop semua processes di akhir (atau force-kill setelah 3s).
