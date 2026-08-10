# Video Controller — Product Requirement Document (PRD) v2

> Dokumen ini jadi acuan utama sebelum fix bug atau tambah fitur. Versi ini adalah hasil audit kode mendalam (bukan cuma asumsi desain) terhadap `server/`, `agent/`, `web/`, `cashier/` — setiap klaim dilengkapi `file:line` supaya bisa diverifikasi langsung. Bagian "Known Issues" sengaja dipisah per severity karena banyak yang baru ketemu lewat audit ini (bukan dari laporan user).

---

## 1. Topologi Sistem

### 1.1 Batasan utama (Confirmed)
- **1 Ruangan = 1 PC** yang berdiri sendiri (isolated).
- Tiap PC Ruangan terinstall **Agent + Server + Web** (Room App bundle) lewat `install.sh mode 1`.
- Tiap PC Ruangan punya `ROOM_ID` unik dan SQLite database lokal sendiri (`server/data/database.sqlite`).
- **PC Kasir** adalah PC terpisah yang hanya terinstall **Cashier** lewat `install.sh mode 2`.
- PC Kasir konek ke N server ruangan lewat `MultiSocketService` (1 socket per entry `VITE_ROOMS`).
- **Tidak ada auth/login, tidak ada HTTPS/WSS.** CORS terbuka penuh (`origin: "*"`) di Express maupun Socket.IO (`server/src/app.ts:8`, `server/src/socket/SocketServer.ts:74-76`). Trust boundary = jaringan lokal saja.

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
- **Agent tidak terlihat dari server lain** — cashier hanya kenal agent di server yang sama PC-nya.
- **Server adalah lapisan "dumb" persistence/broadcast** — server TIDAK menghitung harga transaksi, TIDAK memvalidasi payload event, dan mempercayai apa pun yang dikirim client (lihat §4.1.7).

---

## 2. Stack & Port Standar

| Komponen | Port Default | Stack | Catatan |
|----------|-------------|-------|---------|
| Server (Socket.IO + Express) | `53331` | Express 5 + Socket.IO 4 + sql.js (WASM SQLite) + googleapis | tiap PC ruangan, hardcoded |
| Web Vite dev | `53332` | React 19 + Vite + Tailwind v4 + Zustand | tiap PC ruangan saat dev |
| Web Vite preview | `53333` | — | production preview di tiap PC ruangan |
| Cashier Vite dev | `53334` | React + Vite + Zustand + socket.io-client | PC Kasir |
| Cashier Vite preview | `53335` | — | production preview di PC Kasir |
| Agent | (tidak ada port sendiri) | Node + Playwright/Chromium (persistent context) | menghubungi server via `SERVER_IP:PORT` |

---

## 3. Konfigurasi `.env` (Konsolidasi + Verifikasi Kode)

### 3.1 `agent/.env` (per PC Ruangan)
```bash
# WAJIB (beda tiap PC)
ROOM_ID=room-001            # default kode: 'room-001' (agent/src/config/config.ts:68)
ROOM_NAME=Room 1            # default kode: 'Room 1' (config.ts:69)

# Opsional
BILLING_ENABLED=true        # config.ts:72 — "!== 'false'" artinya SEMUA value selain string 'false' dianggap true
SERVER_IP=                  # kosongkan = auto-detect IP lokal PC (ConfigService.ts:100, getLocalIpAddress())
SERVER_PORT=53331           # ⚠️ TIDAK DIBACA. Kode aktual membaca process.env.PORT (ConfigService.ts:102), bukan SERVER_PORT.
                             #    Ini bug dokumentasi/config: set SERVER_PORT di .env TIDAK BERPENGARUH. Default fallback: 53331.

# Browser (PC ruangan biasanya visible, pakai display)
BROWSER_HEADLESS=false       # config.ts:75 — default false kecuali literal 'true'
BROWSER_CHANNEL=chrome       # config.ts:76
BROWSER_ARGS=--start-maximized||--kiosk||--disable-dev-shm-usage||--no-sandbox   # split by '||' (config.ts:60-64)
BROWSER_VIEWPORT=false       # config.ts:78-81 — kalau bukan 'true', viewport=null (pakai ukuran window asli)
BROWSER_VIEWPORT_WIDTH=1920
BROWSER_VIEWPORT_HEIGHT=1080

# YouTube
YOUTUBE_HOME=https://www.youtube.com   # config.ts:84

# Health
HEALTH_INTERVAL=5000         # config.ts:87, ms
LOG_LEVEL=info                # config.ts:90, dipakai LoggerService (pino)
```

> ⚠️ **Perbaikan diperlukan**: rename `PORT` di kode agent jadi baca `SERVER_PORT` (atau update dokumentasi supaya konsisten pakai `PORT`), karena saat ini nama env var di `.env.example` menyesatkan operator.

### 3.2 `server/.env` (per PC Ruangan)
```bash
PORT=53331                    # index.ts:10, fallback 53331
BILLING_ENABLED=true          # index.ts:11 — "!== 'false'"
YOUTUBE_API_KEY=<key>         # YoutubeSearchService.ts:27,34,58 — kalau kosong, search akan gagal (500) tanpa pesan jelas
```
Tidak ada env var lain yang dibaca `server/src` — tidak ada `NODE_ENV`, `DB_PATH`, `LOG_LEVEL`, atau CORS-origin override. `server/src/config/` folder ada tapi **kosong** (belum dipakai).

### 3.3 `web/.env` (per PC Ruangan, opsional)
```bash
VITE_SERVER_IP=127.0.0.1    # web/src/utils/getServerUrl.ts:3 — fallback ke window.location.hostname kalau kosong
VITE_SERVER_PORT=53331      # ⚠️ TIDAK DIBACA sama sekali oleh kode. Port API di-derive dari window.location.port
                             #    (53332/53333 dev/preview → dipetakan ke 53331; port lain dipakai apa adanya).
VITE_BILLING_ENABLED=true   # web/src/config/env.ts:7 — ⚠️ DIDEKLARASIKAN TAPI TIDAK PERNAH DIBACA di komponen manapun.
                             #    Tidak ada UI billing/expiry/countdown di web app sama sekali (lihat §4.3.9).
```

### 3.4 `cashier/.env` (PC Kasir)
```bash
VITE_BILLING_ENABLED=true   # cashier/src/config/billing.ts:3 — default enabled kecuali literal 'false'

# Tiap entry = 1 ruangan di 1 PC server tersendiri.
# 'ip' = IP PC ruangan tsb (bukan IP server pusat).
# 'roomId' HARUS sama dengan ROOM_ID di agent/.env PC terkait.
VITE_ROOMS=[
  {"roomId":"room-001","name":"Room 1","ip":"192.168.1.104","port":53331,"pricePerHour":50000},
  {"roomId":"room-002","name":"Room 2","ip":"192.168.1.114","port":53331,"pricePerHour":60000},
  {"roomId":"room-003","name":"Room 3","ip":"192.168.1.12", "port":53331,"pricePerHour":45000}
]
```
`config.id` di-set ke `room.roomId` (bukan id acak terpisah) — lihat `useRoomStore.ts:48-112`. `pricePerHour` default `50000` kalau tidak diisi (`?? 50000`), tapi angka default ini **terduplikasi di 4 lokasi kode berbeda** (`useRoomStore.ts:105`, `MultiSocketService.ts:421,886`, `RoomCard.tsx:215`) — bukan konstanta tersentralisasi.

`VITE_SERVER_PORT` dideklarasikan di `cashier/src/vite-env.d.ts:3-7` tapi **tidak pernah dibaca** — dead env var.

---

## 4. Arsitektur & Flow Detail per Komponen

### 4.1 Server (`server/`)

Stack: Express 5 + Socket.IO 4 + sql.js (in-memory WASM SQLite, persist manual ke disk) + googleapis. TypeScript **strict mode OFF** (`server/tsconfig.json:7`).

#### 4.1.1 Bootstrap & urutan start

**`server/src/index.ts`**:
1. `dotenv.config()` load `.env`.
2. `createApp()` (`app.ts:4-13`) — Express + `cors()` terbuka + `express.json()`. Tidak ada helmet/rate-limit/auth middleware.
3. `http.Server` mentah dibuat membungkus Express (`index.ts:15`) — ini yang dipakai Socket.IO, bukan `app.listen()`.
4. `ServiceContainer` di-construct (`index.ts:17` → `ServiceContainer.ts:23-47`) — di dalam constructor (bukan `initialize()`):
   - `DatabaseService` di-`new` (belum akses file DB).
   - `AgentManager` di-`new` — **langsung** start `setInterval(5000)` heartbeat-check loop di constructor-nya sendiri.
   - `SocketServer` di-`new` — Socket.IO `Server` dibuat dan `io.on("connection", ...)` didaftarkan **secara sinkron**. Artinya **Socket.IO sudah listening sebelum database ter-inisialisasi**.
   - `CommandService` di-`new`.
5. **`container.initialize()` dipanggil TANPA di-await** (`index.ts:20-24`, fire-and-forget `.then()/.catch()`). Di dalamnya: `DatabaseService.initialize()` (buat folder `data/`, load/buat `database.sqlite`, `CREATE TABLE IF NOT EXISTS`), lalu `SocketServer.initialize()` yang **memanggil `database.initialize()` lagi** (redundant, tapi idempoten karena `IF NOT EXISTS`).
6. `registerRoutes(app, container)` dipanggil **segera setelah** `initialize()` di-fire (bukan setelah selesai) — `index.ts:26`.
7. `httpServer.listen(PORT, ...)`.

⚠️ **Race condition cold-start**: karena `initialize()` tidak di-await, ada jendela waktu di mana event masuk (mis. `player:state`, `transaction:save`) bisa tiba sebelum `this.db` di-set — namun semua method DB guard dengan `if (!this.db) return;` sehingga **silent no-op**, bukan error/queue. Berpotensi silent data-loss di window ini.

`AppContainer` (`server/src/container/AppContainer.ts`) adalah **dead code** — class DI container kedua yang tidak pernah di-instantiate di manapun. Container aktif yang dipakai adalah `ServiceContainer`.

#### 4.1.2 Semua Socket.IO Event (Server)

Definisi event: `server/src/socket/SocketEvents.ts` (enum). Semua handler: `server/src/socket/SocketServer.ts` (942 baris — mayoritas business logic ada di sini).

**Server → Client (emit)**

| Event | Emit site | Payload | Trigger |
|---|---|---|---|
| `agents:update` | `broadcastAgents()` dipanggil dari banyak tempat (`:151-159,219-221,255-257,281-283,425,436,491,588,650,930`) | `AgentInfo[]` (clone) | Broadcast ke semua client tiap kali registry berubah |
| `agent:activation` | `:213,486-490,535,632-635,896-899` | `{isActive, expiresAt?, reason?, ...customerInfo}` | Ke socket agent spesifik saja, saat register/activate/deactivate/extend/expiry |
| `player:state` | `:127,566,926` | `{agentId, player}` / empty state | Push saved state ke agent reconnect; broadcast empty state saat deactivate/expiry |
| `playlist:state` | `:130,567,927` | `PlaylistData` / empty | Sama seperti di atas |
| `player:update` | `:368-374` | raw payload dari `PLAYER_STATE` inbound | Broadcast ke **semua** client (`io.emit`, termasuk pengirim) tiap kali ada client kirim `player:state` |
| `playlist:update` | `:403-409` | raw snapshot | Broadcast ke semua saat ada `playlist:state` masuk |
| `room:activation` | `:503-510,579-586,638-648,934-941` | `{roomId, roomName, isActive, expiresAt, startTime?, reason?, ...customerInfo}` | Broadcast global saat activate/deactivate/extend/auto-expire |
| `room:expiry-warning` | `sendRoomWarning`, `:867-871` | `{roomId, secondsRemaining, expiresAt}` | Dari `setTimeout` yang dijadwalkan `setupRoomTimer` |
| `command` | `sendCommand`, `:778-784` | object command apa pun, diteruskan verbatim | Ke satu socket agent, dari `player:command` inbound atau REST `/api/command` |
| `agent:clear-data` | `:538-541,902` | `{}` | Ke socket agent spesifik saat deactivate/expiry |
| `transaction:get` | `:665,678,691,704` | `TransactionData[]` | Broadcast/response setelah save/get/delete/clear |
| `agent:error` | `:728` | error object | Rebroadcast setelah persist ke DB |

**Client → Server (listen)**

| Event | Handler | Payload | Logic |
|---|---|---|---|
| `agent:register` | `:163-225` | `{id, name, roomId, roomName}` | Cek `activatedRooms.get(roomId)`. `initialStatus/Active = (!billingEnabled \|\| wasActivated) ? ONLINE/true : WAITING/false`. Register dengan `startTime:null, expiresAt:null` (⚠️ **tidak restore** durasi/expiry lama walau room sebelumnya aktif — lihat §4.1.4). Kalau `initialActive`, emit `agent:activation` balik. Panggil `loadAndSendAgentData()` (async, tidak di-await) untuk push state tersimpan. Broadcast `agents:update`. |
| `agent:heartbeat` | `:229-261` | `{id}` | `registry.updateHeartbeat()`, lalu flip `OFFLINE→ONLINE` manual lagi (redundant). Broadcast `agents:update`. |
| `disconnect` (built-in) | `:265-286` | — | `registry.removeBySocket()` — **hapus total** entry dari registry (bukan mark OFFLINE). `activatedRooms` tetap utuh, jadi reconnect di roomId sama akan kembali ONLINE/active. |
| `player:command` | `:289-323` | command object incl. `agentId` | `sendCommand()` — throw kalau agent tidak ada/`!isActive`, di-catch lokal & **hanya di-log**, tidak ada error balik ke pengirim. |
| `player:state` | `:325-379` | `{agentId, player}` | `registry.updateSnapshot()`, simpan ke DB (`savePlayerState`), rebroadcast sebagai `player:update` ke **semua** termasuk pengirim. |
| `playlist:state` | `:381-413` | playlist snapshot | Simpan ke DB, rebroadcast `playlist:update`. **Tidak** memanggil `registry.updateSnapshot()` — registry in-memory bisa drift dari yang tersimpan/broadcast. |
| `cashier:request-agents` | `:418-427` | — | Respon hanya ke pemanggil (`agents:update`). |
| `client:request-state` | `:430-438` | — | Sama, respon hanya ke pemanggil. |
| `cashier:activate-room` | `:441-512` | `{roomId, roomName, durationMinutes?, customerName?, customerPhone?, customerEmail?, customerNote?}` | Lihat §4.1.4. |
| `cashier:deactivate-room` | `:514-593` | `{roomId}` | Lihat §4.1.4. |
| `cashier:extend-time` | `:596-652` | `{roomId, additionalMinutes}` | Lihat §4.1.4. |
| `transaction:save` | `:655-670` | `TransactionData` lengkap (sudah termasuk `totalPrice`) | Upsert by `id`, lalu broadcast ulang **semua** transaksi via `transaction:get`. **Server TIDAK menghitung harga** — client (cashier) dipercaya penuh. |
| `transaction:get` | `:672-683` | — | Respon ke pemanggil saja, `ORDER BY paidAt DESC`. |
| `transaction:delete` | `:685-696` | `transactionId` | Delete by id, broadcast list terbaru ke semua. |
| `transaction:clear` | `:698-709` | — | `DELETE FROM transactions` **tanpa WHERE** — hapus transaksi **semua ruangan**, bukan hanya satu (⚠️ lihat Known Issues — kontradiksi dengan commit `fff0470`). |
| `agent:error` | `:712-733` | `{agentId, roomId, timestamp, type, message, stack?, context?}` | Simpan ke tabel `errors`, rebroadcast ke semua. Kalau simpan gagal, **tidak** direbroadcast (client lain tidak pernah tahu ada error). |

**Tidak ada validasi payload sama sekali** (tidak ada zod/joi) — field yang hilang jadi `undefined` dan ditulis apa adanya ke DB.

#### 4.1.3 REST/HTTP Endpoints

Router terdaftar di `server/src/bootstrap/registerRoutes.ts:16-29`.

| Method | Path | Handler | Response |
|---|---|---|---|
| `GET` | `/api/agents` | `AgentController.list` | `AgentInfo[]` (dump registry penuh, termasuk field internal `socketId`) |
| `POST` | `/api/command` | `CommandController.send` | `{agentId, command}` → delegasi ke `SocketServer.sendCommand`. ⚠️ Error dari `sendCommand` **tidak di-catch** di controller → propagate jadi 500 default Express. Response selalu `{success:true}` di happy path meski emit sebenarnya fire-and-forget. |
| `GET` | `/api/health` | `health.ts:10-46` | `{status, timestamp, uptime, system:{...}, process:{...}, agents:{connected, list}}` |
| `GET` | `/api/health/live` | `health.ts:48-50` | plain text `"OK"` |
| `GET` | `/api/health/ready` | `health.ts:52-56` | `{ready:true, agents:<count>}` — selalu `ready:true`, **tidak benar-benar cek DB siap** meski komentar bilang begitu |
| `GET` | `/api/search?keyword=...` | `SearchController.search` | `SearchResult[]` atau `{message:"Search failed"}` 500 |

⚠️ `server/README.md` mendokumentasikan endpoint `GET /api/rooms`, `/api/rooms/:roomId`, `/api/youtube/video/:videoId` yang **TIDAK ADA** di kode — README bersifat aspirasional/stale, jangan dipakai sebagai referensi tanpa cross-check ke kode.

#### 4.1.4 AgentRegistry & Room Activation Lifecycle

**File**: `server/src/services/AgentRegistry.ts` (188 baris, 20 unit test lulus).

- Key registry (post Fix C, sudah diterapkan): `Map<string, AgentInfo>` **di-key oleh `roomId`** (bukan `agent.id`), dengan secondary index `agentIdIndex: Map<agentId, roomId>` untuk lookup lama (`:14-37`).
- Method: `register()`, `get()`/`getAll()` (return **clone**), `getRef()`/`getByRoomIdRef()` (return **reference** untuk mutasi in-place), `updateHeartbeat()`, `removeBySocket()`, `updateSnapshot()`, `setActive()`, dll.

**State lifecycle** (state tersimpan di `AgentInfo` registry + `SocketServer.activatedRooms: Map<roomId, boolean>` sebagai source-of-truth "pernah diaktifkan"):

- **Register**: `wasActivated = activatedRooms.get(roomId)===true`. `initialStatus = (!billingEnabled || wasActivated) ? "ONLINE" : "WAITING"`. `startTime/expiresAt` di-reset ke `null` — ⚠️ **tidak dipulihkan** dari state lama walau timer server (`roomTimers`) tetap jalan independen dari koneksi socket. Reconnecting agent tidak tahu sisa waktu sampai ada broadcast baru.

- **Activate** (`cashier:activate-room`):
```
activatedRooms.set(roomId, true)
expiresAt = durationMinutes ? Date.now() + durationMinutes*60*1000 : null
agent.isActive = true; agent.expiresAt = expiresAt; agent.startTime = Date.now()
Object.assign(agent, {customerName, customerPhone, customerEmail, customerNote})
emit agent:activation → socket agent
if (durationMinutes > 0) setupRoomTimer(roomId, durationMinutes, agent.socketId)
emit room:activation → semua client
```
Kalau tidak ada agent yang cocok, `activatedRooms` tetap di-set dan timer tetap dijadwalkan — room bisa "aktif" di server walau tidak ada agent terkoneksi.

- **Auto-expiry timer** (`setupRoomTimer`, `:826-851`):
```js
warningThresholds = [300, 120, 60, 30] // detik: 5menit, 2menit, 1menit, 30detik
```
Untuk tiap threshold, jadwalkan `setTimeout` terpisah mengirim `room:expiry-warning`. ⚠️ **Timer warning TIDAK dilacak/dibatalkan** — `clearRoomTimer()` hanya membatalkan timer expiry final, bukan 4 timer warning. Kalau room di-deactivate atau di-extend sebelum warning sempat fire, timer warning lama **tetap jalan** dan mengirim event stale (`secondsRemaining`/`expiresAt` basi) di waktu yang sudah tidak relevan.

- **Deactivate** (`cashier:deactivate-room`):
```
clearRoomTimer(roomId)     // hanya cancel timer expiry, bukan 4 warning timer
activatedRooms.delete(roomId)
agent.isActive = false
emit agent:activation{isActive:false} + agent:clear-data → socket agent
io.emit player:state/playlist:state kosong → SEMUA client
registry.updateSnapshot(agent.id, emptyPlayerState)
agent.customerName/Phone/Email/Note = undefined
emit room:activation{isActive:false, reason:"deactivated", expiresAt, startTime} → semua
```
⚠️ **Server TIDAK membuat transaksi apa pun di sini** — tidak ada `database.saveTransaction()` call di path deactivate/expire. Transaksi hanya tersimpan lewat event `transaction:save` yang dikirim terpisah oleh cashier (lihat §4.4.6). `agent.status` juga **tidak** direset ke `WAITING` (tetap `ONLINE`).

- **Extend time** (`cashier:extend-time`): `newExpiresAt = (agent.expiresAt || Date.now()) + additionalMinutes*60000`. Kalau `!agent.isActive`, request **diabaikan diam-diam** tanpa error balik. Timer lama diganti total via `setupRoomTimer` lagi (termasuk 4 warning timer baru — timer warning versi lama tetap orphan, lihat di atas).

- **Auto-expiry** (`expireRoom`): mirip deactivate, tapi set `agent.expiresAt = null` (deactivate manual justru **membiarkan** `expiresAt` terisi) — inkonsistensi kecil antar dua code path yang seharusnya serupa.

#### 4.1.5 Database (sql.js / SQLite)

File: `server/data/database.sqlite`. sql.js adalah SQLite in-memory berbasis WASM — **tidak ada mode file-backed native**; persist ke disk dilakukan manual: tiap mutasi memanggil `save()` yang di-debounce 100ms lalu `db.export()` (full dump in-memory) ditulis ulang seluruhnya ke file (`DatabaseService.ts:172-189`). Artinya:
- Setiap batch perubahan = **rewrite seluruh file DB** (bukan incremental/WAL).
- Crash dalam window debounce 100ms = kehilangan write yang belum sempat ditulis, tanpa fsync guarantee.

**Schema (`createTables()`, `:113-170`)**

```sql
CREATE TABLE IF NOT EXISTS agents (
    agentId TEXT PRIMARY KEY,
    player TEXT NOT NULL,     -- JSON.stringify(PlayerData)
    playlist TEXT NOT NULL,   -- JSON.stringify(PlaylistData)
    updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    roomId TEXT NOT NULL,
    roomName TEXT NOT NULL,
    customerName TEXT, customerPhone TEXT, customerEmail TEXT, customerNote TEXT,
    startTime INTEGER NOT NULL,
    endTime INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    pricePerHour REAL NOT NULL,
    totalPrice REAL NOT NULL,
    paymentMethod TEXT,
    paidAt INTEGER DEFAULT 0,     -- 0 = belum bayar
    cleanedAt INTEGER,
    notes TEXT
);
-- migrasi defensif: ALTER TABLE transactions ADD COLUMN cleanedAt INTEGER (try/catch "column already exists")

CREATE TABLE IF NOT EXISTS errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agentId TEXT NOT NULL, roomId TEXT NOT NULL, timestamp INTEGER NOT NULL,
    type TEXT NOT NULL, message TEXT NOT NULL, stack TEXT, context TEXT
);
```
Tidak ada migration framework — hanya try/catch `ALTER TABLE` manual. Tidak ada tabel versioning.

**CRUD Transaksi**: `saveTransaction()` = check-then-insert-or-update (2 round trip, bukan `UPSERT`/`INSERT OR REPLACE` walau `id` adalah PK). `getTransactions()` = `SELECT * ORDER BY paidAt DESC`, tanpa pagination. `getTransactionsByRoom`/`getTransactionsByDateRange` **ada di kode tapi tidak pernah dipanggil** (dead code, tidak ada route/handler yang mengekspos).

⚠️ **`clearAgentData(agentId)`** (reset player/playlist ke default di DB) **tidak pernah dipanggil** dari flow deactivate/expire — registry in-memory dan socket broadcast di-clear, tapi row SQLite `agents` tetap menyimpan state video terakhir. Reconnect berikutnya (`loadAndSendAgentData`) bisa push balik video lama yang seharusnya sudah "dibersihkan".

**Errors table**: `getAgentErrors()`/`clearAgentErrors()` ada tapi **tidak diekspos** lewat route/socket manapun — tidak ada cara baca/hapus error tersimpan via API saat ini; tabel `errors` cuma tumbuh terus.

#### 4.1.6 Perhitungan Harga Transaksi — TIDAK di Server

Grep menyeluruh `pricePerHour`/`totalPrice`/`Math.ceil` di `server/src` = nol hasil logic perhitungan. Field-field ini hanya dideklarasikan di interface `TransactionData` dan di-passthrough saat `INSERT`/`UPDATE`. **Semua kalkulasi harga (per jam, ceiling ke atas) terjadi di `cashier/` (client), server hanya menyimpan hasil akhir apa adanya.** Lihat §4.4.6 untuk formula aslinya.

#### 4.1.7 Error Handling

Event `agent:error` disimpan ke tabel `errors` lalu direbroadcast — **tapi hanya kalau save berhasil**; kalau gagal, client lain tidak pernah tahu error itu terjadi. Tidak ada `ErrorService` terpisah — logic langsung di `DatabaseService`. Tidak ada Express error-handling middleware — error yang throw di route handler (mis. `CommandController.send`) jatuh ke default Express handler. Dependency `pino` **terinstall tapi tidak pernah dipakai** — semua log pakai `console.log`/`console.error` manual, sangat verbose (dump JSON registry di hampir tiap event).

#### 4.1.8 Config/Env yang Benar-Benar Dibaca

Hanya 3: `PORT` (default 53331), `BILLING_ENABLED` (default true, `!== 'false'`), `YOUTUBE_API_KEY` (tidak ada default; kalau kosong search gagal generic 500). Tidak ada `NODE_ENV`, `DB_PATH`, `LOG_LEVEL`, atau CORS override.

#### 4.1.9 DI Container

`ServiceContainer` (`server/src/container/ServiceContainer.ts`, 72 baris) — wiring manual `new X(...)` berurutan, tanpa reflection/IoC framework:
```
DatabaseService() → AgentManager() → SocketServer(httpServer, agentManager, billingEnabled, database) → CommandService(socketServer)
```
`getDatabase()` **tidak diekspos** sebagai getter publik — akses DB langsung dari luar `SocketServer` tidak dimungkinkan lewat container. `YoutubeSearchService` **tidak dikelola container** — di-`new` langsung di dalam `SearchController`.

---

### 4.2 Agent (`agent/`)

Stack: Node + TypeScript + Playwright (persistent Chromium context) + socket.io-client.

#### 4.2.1 Startup Flow

**`agent/src/index.ts`** → `new Agent().start()`.

`Agent` constructor (`core/Agent.ts:105-157`) wiring sinkron: `BrowserService` → `PlaylistRepository`+`PlaylistService` → `CommandDispatcher`+`CommandService`+`CommandRouter` → load config → `AgentIdentityProvider` → `SocketClient(...)`.

`Agent.start()` (`Agent.ts:162-340`), urutan:
1. Setup global error handlers (`process.on uncaughtException/unhandledRejection` → forward ke `agent:error`).
2. `socketClient.connect()` — **panggilan pertama** dari dua (lihat Known Issues, "double connect").
3. `await socketClient.waitForConnection()`.
4. **Gate billing** (lihat §4.2.2).
5. `await browser.start()` — launch Playwright.
6. `new PlayerService(page, playerRepository)`.
7. `player.showStartImage()` — navigasi ke `start_image.html`.
8. Setup `HealthService.start(config.health.interval)`.
9. `player.loadSnapshot()` + `player.restore()` — **efektif no-op** karena `PlayerRepository` kini in-memory-only (lihat §4.2.11).
10. `playlist.load()` **sebelum** `setOnEnded` didaftarkan (urutan penting supaya `repeatMode` benar saat auto-advance pertama kali fire).
11. `player.fullscreen()`.
12. `player.setOnEnded(...)` — chain video-selesai → `playlist.next()` → `player.openVideo()`.
13. `registerCommands()`.
14. `socketClient.connect()` — **panggilan kedua** (lihat Known Issues).
15. `HeartbeatService.start()`.
16. Start 3 interval: `startPlayerStateSync()` (1s), `startPlaylistSync()` (1s), `startAutoSkipAds()` (500ms).

#### 4.2.2 Activation Gating

```ts
// Agent.ts:181-206
const billingEnabled = config.billing?.enabled ?? true;
if (billingEnabled) {
    const heartbeatInterval = setInterval(() => socketClient.sendHeartbeat(), 5000);
    await socketClient.waitForActivation();
    clearInterval(heartbeatInterval);
} else {
    socketClient.setActive(true);
}
```
Selama menunggu, agent kirim heartbeat manual tiap 5 detik (terpisah dari `HeartbeatService`) supaya tidak kena timeout OFFLINE server (15 detik, meski deteksi ini sendiri sekarang tidak berfungsi — lihat §4.1 Known Issues Server).

`agent:activation` handler (`SocketClient.ts:212-299`), didaftarkan ulang tiap `connect()`:
- `isActive:false` → dispatch `STOP` command internal + `playerService.showExpiredImage()`.
- `isActive:true` → `resumeStateSync()` + `playerService.showStartImage()`.

Event `cashier:deactivate-room` juga punya listener terpisah (`setupDeactivationListener`) yang melakukan hal sama — dua jalur independen menuju efek yang sama.

**Tidak ada auto-navigasi ke video YouTube saat aktivasi** — agent tetap di `start_image.html` sampai perintah `PLAY`/`OPEN_VIDEO`/playlist datang, atau ada video snapshot lama untuk di-restore. Command masuk **diblok diam-diam** kalau `!identity.isActive` (`SocketClient.ts:120-124`).

#### 4.2.3 Socket.IO Events (Agent)

**Emit:**

| Event | Payload | Frekuensi |
|---|---|---|
| `agent:register` | `AgentIdentity` | Sekali per `connect` |
| `agent:heartbeat` | `{id}` | Tiap 5000ms (`HeartbeatService`) + tambahan saat menunggu aktivasi |
| `player:state` | `{agentId, player, playlist}` | Tiap 1000ms |
| `playlist:state` | `{items, currentIndex, repeat, shuffle}` | Tiap 1000ms + sekali di startup + sekali setelah clear-data |
| `agent:error` | `{agentId, roomId, timestamp, type, message, stack?, context?}` | Hanya untuk `STARTUP_ERROR`/`UNCAUGHT_EXCEPTION`/`UNHANDLED_REJECTION` — error command/recovery/playback sehari-hari **tidak** dilaporkan ke server, hanya di-console log lokal |

**Listen:** `connect`, `command` (gated `isActive`), `agent:activation`, `cashier:deactivate-room`, `player:state`/`playlist:state` **inbound** (dipakai server untuk push restore-state — event nama sama dengan yang di-emit, dibedakan lewat isi payload), `agent:clear-data`.

#### 4.2.4 Browser Automation

Playwright pakai **persistent context** (`chromium.launchPersistentContext`, bukan `launch()+newContext()`) supaya profil (cookies/login) tersimpan lintas restart — folder profil `<cwd>/data/browser-profile`. `launchChrome()` dicoba dulu (pakai `channel: 'chrome'`), fallback ke `launchChromium()` kalau gagal.

Stealth: override `navigator.webdriver`, `navigator.permissions.query`, `navigator.plugins`, `navigator.languages`, set `window.chrome={runtime:{}}` — dipasang di `BrowserLauncher` **dan** diulang lagi secara terpisah di `YouTubePlayer.open()` sebelum tiap navigasi (duplikasi, bukan bug fungsional).

`start_image.html`/`expired_image.html`: **bukan overlay** — agent navigasi page yang sama ke `file://.../data/start_image.html` atau `expired_image.html` (masing-masing `<img>` fullscreen menunjuk file JPEG statis di folder yang sama).

Navigasi YouTube: `page.goto('${YOUTUBE_HOME}/watch?v=${videoId}', {waitUntil:"domcontentloaded"})` + wait 2000ms fixed + poll DOM sampai `<video>` ready (`readyState>=1 && duration>0`).

#### 4.2.5 Command Handling

`CommandType` enum penuh: `PLAY, PAUSE, VOLUME, SEEK, MUTE, UNMUTE, STOP, OPEN_VIDEO, NEXT, PREVIOUS, FULLSCREEN, EXIT_FULLSCREEN, TOGGLE_FULLSCREEN, ADD_PLAYLIST, REMOVE_PLAYLIST, CLEAR_PLAYLIST, PLAY_PLAYLIST_ITEM, SHUFFLE_PLAYLIST, REPEAT_OFF, REPEAT_ONE, REPEAT_ALL, SKIP_AD`. Satu handler class per tipe di `agent/src/commands/handlers/`. **Tidak ada command `openUrl`** meski disebut di draf PRD lama — yang ada `OPEN_VIDEO` (terima `videoId`, bukan URL bebas).

`CommandDispatcher.dispatch()` throw `Handler not found` kalau tipe tak dikenal — di-catch di `SocketClient`'s listener, **hanya di-log**, tidak dilaporkan ke server.

#### 4.2.6 Player State Extraction

`YouTubePlayer.getSnapshot()` (dipanggil tiap 1s): scraping DOM murni via `page.evaluate()` (bukan YouTube IFrame API — page memang berada di halaman watch YouTube asli). Title/channel diambil lewat `document.querySelector("#movie_player").getVideoData()` dulu (works saat fullscreen), fallback ke cascade selector CSS kalau API itu gagal. Thumbnail disintesis dari URL pattern `img.youtube.com/vi/{id}/mqdefault.jpg`, bukan hasil scrape.

`PlayerService.getSnapshot()` membungkus dengan **fallback "last-healthy snapshot"** — kalau snapshot baru tidak sehat (videoId kosong / currentTime-duration-volume tidak finite / duration<=0), kembalikan snapshot sehat terakhir supaya tidak flicker state buruk ke server.

#### 4.2.7 Playlist Management

`PlaylistService` in-memory `items[]` + `currentIndex`. `next()`/`previous()` menghormati `repeatMode` (`OFF`/`ONE`/`ALL`): `ONE` tidak pindah index, `ALL` wrap ke ujung lain, `OFF` berhenti di ujung (return `undefined`, auto-advance chain berhenti diam-diam). `shuffle()` Fisher-Yates dengan retry max 10x supaya tidak no-op pada list kecil, lalu re-locate `currentIndex` berdasar id item yang sebelumnya current.

Auto-advance: `player.setOnEnded()` dipicu dari `page.exposeFunction("youtubeEnded", ...)` + listener DOM per-navigasi.

#### 4.2.8 Health Check & Auto-Recovery

`HealthService` jalan tiap `HEALTH_INTERVAL` (default 5000ms), 4 check per tick: `BrowserHealthCheck`, `PageHealthCheck`, `VideoHealthCheck`, `PlayerHealthCheck` (dua terakhir **implementasinya identik**, bukan sinyal berbeda). `consecutiveFailures >= 3` (~15 detik) memicu recovery:
- **Browser sendiri unhealthy** → `process.exit(1)` — agent **tidak** relaunch browser sendiri di dalam proses; mengandalkan process supervisor eksternal (systemd, dll — di luar `agent/src`) untuk restart binary.
- **Page/video/player saja yang unhealthy** → `RecoveryEngine.recover(RELOAD_PAGE)`: capture snapshot → `page.reload()` → restore video (retry 3x) → restore posisi/volume/mute/fullscreen → `page.waitForTimeout(300)` → restore playback play/pause.

Tidak ada backoff/cooldown — 3 kegagalan berturut-turut langsung memicu recovery lagi tanpa jeda progresif. `RecoveryAction.REOPEN_VIDEO`/`RESTART_BROWSER` dideklarasikan di enum tapi **tidak pernah dipakai** di kode manapun.

#### 4.2.9 State Sync Cadence

Dua `setInterval` independen, **fixed 1000ms**, tanpa debounce/diff (state dikirim tiap tick tanpa cek berubah atau tidak): `startPlayerStateSync()` dan `startPlaylistSync()`. `isSyncingPaused` hanya menggate player-state sync, **tidak** menggate playlist-state sync — asimetri: saat clear-data, playlist snapshot tetap terkirim tiap detik walau player berhenti.

#### 4.2.10 Error Reporting

Hanya `STARTUP_ERROR`, `UNCAUGHT_EXCEPTION`, `UNHANDLED_REJECTION` yang dikirim ke server via `agent:error`. Error command/recovery/snapshot sehari-hari hanya `console.error`/`LoggerService.error` lokal.

#### 4.2.11 Persistence — In-Memory Saja

`PlayerRepository`/`PlaylistRepository` punya komentar eksplisit: *"Data is now stored in server database, not local file... kept for interface compatibility but no longer persists to disk."* Artinya `player.loadSnapshot()`/`playlist.load()` saat startup **tidak pernah** menemukan state lama dari lokal — restore sesungguhnya bergantung 100% pada server push balik `player:state`/`playlist:state` setelah register. Ada sisa file `agent/dist/persistence/*.js` hasil build lama **tanpa source** yang sesuai di `agent/src` — konfirmasi persistence layer lama sudah dicabut tapi dist lama belum dibersihkan.

#### 4.2.12 Config Env yang Dibaca

`ROOM_ID` (default `room-001`), `ROOM_NAME` (default `Room 1`), `BILLING_ENABLED`, `BROWSER_HEADLESS`, `BROWSER_CHANNEL`, `BROWSER_ARGS`, `BROWSER_VIEWPORT[_WIDTH/_HEIGHT]`, `YOUTUBE_HOME`, `HEALTH_INTERVAL`, `LOG_LEVEL`, `SERVER_IP` (auto-detect kalau kosong), dan **`PORT`** (⚠️ bukan `SERVER_PORT` — lihat §3.1).

---

### 4.3 Web (`web/`)

Stack: React 19 + Vite + Tailwind v4 + Zustand, PWA (`vite-plugin-pwa` + hand-rolled `sw.js`).

#### 4.3.1 Struktur & Routing

`AppRouter` — 4 route di bawah `MainLayout`: `/` (`HomePage`, kontrol player), `/playlist` (`PlaylistPage`), `/search` (`SearchPage`), `/settings` (`SettingsPage`). `App.tsx` selalu me-render `<AgentOfflineOverlay/>` global independen dari route — memblokir seluruh UI kalau `agent.online===false`.

`MainLayout` memanggil `useAgent()` di level layout supaya listener/poll agent tetap hidup lintas halaman, dan menghitung state loading gabungan dari `globalLoading`/`initialLoading`/`processing` map dengan bucket durasi 300/500/1000ms tergantung jenis aksi.

#### 4.3.2 Koneksi Socket

`getServerUrl()` (`utils/getServerUrl.ts`): `hostname = VITE_SERVER_IP || window.location.hostname`; port di-derive dari `window.location.port` — kalau `53332`/`53333` (dev/preview) dipetakan ke `53331`, selain itu pakai port halaman saat ini atau `53331`. **`VITE_SERVER_PORT` tidak pernah dibaca.**

`io(apiUrl, {transports:["websocket"]})` — **hanya websocket**, tanpa polling fallback, tanpa opsi reconnection kustom (pakai default socket.io-client). Ada `onAny` debug listener yang log **semua** event masuk ke console **tanpa gate `import.meta.env.DEV`** — verbose logging ikut ke production build (potensi kebocoran info sesi ke devtools browser).

#### 4.3.3 Socket.IO Events (Web)

**Emit**: `client:request-state` (saat connect), `player:command` (`PlayerCommand` object — 21 helper method di `PlayerCommandService`: play/pause/stop/next/previous/fullscreen/volume/mute/seek/openVideo/addPlaylist/playlist ops/repeat/skipAd). Semua **fire-and-forget**, tanpa ack/korelasi respons dari server.

**Listen**: `player:state`, `player:update`, `playlist:state`, `playlist:update`, `agents:update`. ⚠️ `player:update` dan `playlist:state/update` masing-masing didengarkan dari **2 tempat berbeda** (listener class terpisah + hook `usePlayer`/`usePlaylist`) — berpotensi handler terdaftar dobel.

#### 4.3.4 Player Controls UI

`PlayerControls.tsx`: Play/Pause toggle, Stop, Next/Previous, Mute/Unmute, Fullscreen toggle, Skip Ad — semua tombol nonaktif kalau `!agent.online`. `VolumeSlider` dan seek bar (`ProgressBar`) commit ke server hanya di `onMouseUp`/`onTouchEnd` (bukan tiap `onChange`) supaya tidak membanjiri socket saat drag.

#### 4.3.5 Search & Add-to-Playlist

`SearchService.search()` → REST `GET {serverUrl}/api/search?keyword=...` (proxy ke YouTube Data API di server, web tidak pernah pegang API key). Diblokir total (silent, tanpa pesan) kalau `!agent.online`. Play → command `OPEN_VIDEO`. Add to Playlist → command `ADD_PLAYLIST`. Spinner "processing" di-clear via `setTimeout` client-side, **bukan** ack server — jadi kegagalan di sisi server/agent tidak pernah terlihat oleh user.

#### 4.3.6 Current Video Info

`CurrentVideo.tsx` mencocokkan `player.videoId` ke item playlist untuk info lebih lengkap (title/channel/duration/thumbnail), fallback ke field yang menempel langsung di `player` state, fallback lagi ke thumbnail sintetis + placeholder title `Video {videoId}`.

#### 4.3.7 State Management

Zustand store tunggal `useAppStore` — **tanpa persistence**, reset tiap reload. Slice: `agent`, `player`, `playlist`, `search` (⚠️ dideklarasikan tapi tidak dipakai — `SearchPage` punya `useState` lokal sendiri), `processing` (17 boolean per jenis command), flag UI lain.

#### 4.3.8 PWA

Manifest statis (`web/public/manifest.json`) — mereferensikan `icon-192.png`/`icon-512.png` yang **tidak ada** di `web/public/` (hanya `favicon.svg`/`icons.svg`). **Dua mekanisme service worker berjalan bersamaan**: `sw.js` hand-rolled (stale-while-revalidate, precache minim) **dan** SW auto-generate dari `vite-plugin-pwa`/Workbox — potensi konflik cache/versi.

#### 4.3.9 Billing/Activation Display — Gap

`VITE_BILLING_ENABLED` **dideklarasikan tapi tidak pernah dibaca** di komponen manapun. **Tidak ada UI billing sama sekali** di web app — tidak ada countdown, harga, atau status sesi. Satu-satunya sinyal terkait billing yang sampai ke UI adalah boolean `agent.online` (kombinasi `status ONLINE/PLAYING` + `isActive===true`) yang menggerakkan `AgentOfflineOverlay`. Kalau produk butuh visibilitas billing di layar kontrol (sisa waktu, harga/jam), ini **belum diimplementasi** — perlu masuk sebagai fitur baru, bukan bug fix.

#### 4.3.10 Config Env yang Dibaca

Hanya 2: `VITE_SERVER_IP`, `VITE_BILLING_ENABLED` (dideklarasikan, tidak dipakai). `VITE_SERVER_PORT` dead.

---

### 4.4 Cashier (`cashier/`)

Stack: React + Vite + Zustand + socket.io-client.

#### 4.4.1 Struktur & Routing

Hanya **satu route terdaftar**: `/` → `DashboardPage` (grid kartu ruangan). `TransactionsPage.tsx` (riwayat transaksi global) **sudah dibangun lengkap tapi tidak pernah di-route** — tidak ada `<Route path="/transactions">`, dan `MenuLink.tsx` (nav-link component) juga tidak dipakai di manapun. Riwayat transaksi global saat ini **hanya bisa diakses per-ruangan** lewat `TransactionModal` (tombol Receipt di `RoomCard`).

#### 4.4.2 MultiSocketService — Multi Koneksi

Singleton `multiSocketService`. `VITE_ROOMS` di-parse jadi `RoomConfig[]` (`config.id = room.roomId`), tiap config dapat 1 `Socket` (`io(ip:port, {reconnection:true, reconnectionAttempts:10, reconnectionDelay:1000, timeout:10000})`), disimpan di `Map<config.id, RoomConnection>`.

**Lookup connection yang robust** (Fix B, sudah diterapkan & diverifikasi lewat test): `findConnectionForRoom(roomId)` dengan **5 fallback**: (1) `connections.get(roomId)` langsung, (2) `config.roomId===roomId`, (3) `agents[0]?.roomId===roomId`, (4) `config.name` case-insensitive, (5) `config.id` dinormalisasi (`replace(/[^a-z0-9]/g,'')`). Dipakai di **semua** method publik (`activateRoom`, `deactivateRoom`, `loadTransactions`, `extendTime`, dll).

Reconnect: full re-sync tiap `connect` (`cashier:request-agents` + `transaction:get` — bukan incremental). `agentUpdateQueue: Promise<void>` per koneksi men-serialize update supaya tidak race, dan drop update dengan `timestamp < lastAgentUpdate` ("stale update" skip).

⚠️ `SocketService.ts` (single-socket, versi lama) + `getServerUrl.ts` (hardcode port cashier) masih ada di kode tapi **tidak dipakai di manapun** — dead code peninggalan arsitektur sebelum multi-room.

#### 4.4.3 Socket.IO Events (Cashier)

**Emit**: `cashier:request-agents`, `transaction:get`, `cashier:activate-room` `{roomId, roomName, durationMinutes?, customerName?, customerPhone?, customerEmail?, customerNote?}`, `cashier:deactivate-room` `{roomId}`, `cashier:extend-time` `{roomId, additionalMinutes}`, `transaction:save`, `transaction:delete`, `transaction:clear`.

**Listen**: `connect`/`disconnect`/`connect_error`, `transaction:get` (→ `useTransactionStore.setTransactions(tx, sourceRoomId)`), `agent:register`/`agent:status`/`agent:heartbeat` (merge state agent, logic hampir duplikat 3x), `player:state`, `agents:update`/`agents:list` (juga hampir duplikat), `room:activation` (**trigger utama pembuatan transaksi**, lihat §4.4.6), `room:expiry-warning`.

Method `activateRoom`/`deactivateRoom`/`extendTime` mendaftarkan listener one-shot untuk resolve `onComplete()`, dengan **timeout fallback 3000ms** kalau server tidak pernah merespons — ini yang membuat loading spinner selalu ter-clear meski gagal diam-diam.

#### 4.4.4 Status Ruangan — State Machine Aktual

**File**: `RoomCard.tsx:222-284`.
```ts
const CLEANING_THRESHOLD = 30 * 60 * 1000; // 30 menit
const CLEANED_THRESHOLD = 60 * 60 * 1000;  // 60 menit

const getPaidStatus = () => {
  if (hasUnpaid) return null;
  if (!lastPaid || !latestTransaction) return null;
  const allPaidCleaned = roomTransactions.filter(t => t.paidAt > 0).every(t => t.cleanedAt > 0);
  if (allPaidCleaned) return 'SUDAH DIBERSIHKAN';
  if (timeSincePaid < CLEANING_THRESHOLD) return 'BERSIHKAN';
  if (timeSincePaid < CLEANED_THRESHOLD) return 'SUDAH DIBERSIHKAN';
  return null; // >60 menit → revert ke ONLINE
};
```
Prioritas label final: **OFFLINE > AKTIF > UNPAID > BERSIHKAN > SUDAH DIBERSIHKAN > ONLINE**. Catatan: status **"PAID" tidak pernah tampil sebagai label terpisah** di badge — transaksi yang baru dibayar langsung jadi `BERSIHKAN` (kalau `<30 menit`) atau `SUDAH DIBERSIHKAN` (kalau `allPaidCleaned`); "PAID" cuma konsep sesaat di data, bukan status UI.

Tombol Activate `disabled` kalau `hasUnpaid || paidStatus==='BERSIHKAN'` — dicek dua kali (disabled attribute + guard ulang di `handleToggleActive` langsung dari store, bukan hook, sebagai pertahanan terhadap stale state).

#### 4.4.5 Activate / Extend Room

Form: Nama, No. HP, Email, Catatan, Menit (`min=1 max=480`, opsional — kalau kosong = tanpa batas waktu). `handleToggleActive` → `multiSocketService.activateRoom(...)` → resolve connection → emit pakai `agentRoomId = connection.agents[0]?.roomId || roomId` (pakai roomId dari agent, bukan mentah-mentah dari UI, supaya konsisten dengan yang dikenal server).

Extend: form menit terpisah (max 480), server recalculate `expiresAt` dan reset timer (termasuk efek "warning timer lama jadi orphan" di §4.1.4). Ada juga shortcut "Perpanjang 1 Jam" hardcoded 60 menit di modal "Waktu Habis!" — tapi modal ini **tidak pernah ke-trigger** (`showExpiredConfirm` di-`useState` tapi tidak pernah di-set `true` di manapun) — dead UI path; auto-deactivate saat countdown habis langsung panggil `deactivateRoom`, tidak lewat modal ini.

#### 4.4.6 Deactivate & Pembuatan Transaksi — Sepenuhnya Client-Side

Transaksi **dibuat di cashier**, dipicu oleh listener `room:activation` yang mendeteksi transisi `isActive: true→false`:
```ts
const pricePerHour = config.pricePerHour ?? 50000;
const startTime = agent.startTime || 0;
const endTime = data.expiresAt || agent.expiresAt || Date.now();
const durationSeconds = Math.floor((endTime - startTime) / 1000);
// Billing per-blok/jam: minimum 1 jam, dibulatkan ke atas
const totalPrice = Math.max(0, Math.ceil(durationSeconds / 3600) * pricePerHour);
```
Transaksi baru selalu `paidAt: 0` (unpaid), lalu dipush ke server lewat `transaction:save` untuk persist saja (server tidak menghitung ulang).

⚠️ **Poin penting**: `endTime` dihitung dari `data.expiresAt` (durasi yang **dibeli**), bukan `Date.now()` — artinya kalau ruangan di-deactivate **lebih awal** dari durasi yang dibeli, customer tetap ditagih penuh sesuai blok waktu yang dibeli, bukan waktu aktual terpakai. Ini **intentional** (komentar di kode menyebut "minimum 1 jam"). Kalau room tanpa durasi (unlimited), fallback ke `agent.expiresAt` lalu `Date.now()` (baru di sini waktu aktual yang dipakai).

#### 4.4.7 Move Room

`MoveRoomModal`: hitung `remainingMinutes = ceil((expiresAt - now)/60000)` dari sisa waktu **aktual** (bukan durasi asli), lalu `deactivateRoom(sumber)` (ini **memicu pembuatan transaksi normal** di ruangan sumber untuk waktu yang sudah terpakai) → delay fixed 500ms → `activateRoom(target, remainingMinutes, ...)` dengan catatan otomatis "Pindahan dari {roomSumber}". Tidak ada penyesuaian harga — target room pakai `pricePerHour` miliknya sendiri, jadi pindah ke ruangan lebih mahal/murah akan mengubah tarif untuk sisa waktu.

#### 4.4.8 Transaction Store — Status Bug Lama

**Semua bug yang didokumentasikan di draf lama (§8.1 lama, Bug A.1, A.2) SUDAH DIPERBAIKI**, terverifikasi baca kode + `npm test` (18/18 lulus):
- `setTransactions()` **memanggil `set()`** di akhir (Bug A.1 fixed).
- Parameter `sourceRoomId` ada dan dipakai untuk melindungi transaksi "orphan" lintas-server dari ruangan lain supaya tidak ter-drop (Bug A.2 fixed).

Algoritma merge: dedupe server list by id → untuk tiap transaksi lokal yang ada di server map, **server menang** kecuali `local.cleanedAt > server.cleanedAt` (lokal menang untuk field itu saja) → orphan lokal (tidak ada di server): drop kalau `cleanedAt` sudah terisi (anggap sudah sinkron), **simpan** kalau `roomId !== sourceRoomId` (proteksi cross-server), else pakai policy lama (`paidAt>0` → simpan, else drop).

⚠️ **Bug baru ditemukan (belum dilaporkan sebelumnya)**: `getTotalRevenue()` menjumlahkan `totalPrice` dari **semua** transaksi tanpa filter `paidAt` — transaksi unpaid ikut dihitung sebagai "revenue". `getTodayRevenue()` justru filter `paidAt >= todayStart`, jadi undercount konsisten untuk transaksi unpaid hari ini. Dua fungsi ini **tidak konsisten** satu sama lain.

`useRoomStore` juga punya **sistem transaksi paralel kedua** (`transactions: Map<roomId, Transaction[]>` + method sendiri) yang **tidak dipakai komponen manapun** — vestigial, kandidat dihapus.

#### 4.4.9 Payment Confirmation & Mark Cleaned

Bayar: `PaymentConfirmModal` → `paidAt: Date.now()` (client-generated, **optimistic**, tidak menunggu ack server) → `updateTransaction()` lokal + `multiSocketService.updateTransaction()` (broadcast `transaction:save` ke **semua** koneksi, bukan hanya ruangan terkait — bergantung pada server tiap ruangan meng-upsert-atau-abaikan berdasar `id` yang cocok).

Mark cleaned: `cleanedAt: Date.now()` — begitu di-set, `getPaidStatus()` langsung `SUDAH DIBERSIHKAN` **melewati threshold waktu 30/60 menit** (override manual).

#### 4.4.10 Print Receipt

Murni client-side (`window.open` + `document.write` + `window.print()`), tidak ada integrasi printer thermal langsung (ESC/POS) — mengandalkan dialog print browser. **Nama/alamat/telepon bisnis hardcoded** (`BUSINESS_NAME='KARAOKE'`, dll, `PrintReceipt.tsx:44-46`) — perlu dijadikan konfigurasi (env var) untuk deployment nyata.

#### 4.4.11 Transaction History Pages

- **Per-ruangan** (`TransactionModal`, satu-satunya yang bisa diakses user): filter roomId/roomName, search nama/HP, filter tanggal (`all`/`today`), sort unpaid dulu lalu `paidAt` descending.
- **Global** (`TransactionsPage`): sudah dibangun lengkap (search, hapus, clear-all, kartu revenue total/hari-ini) tapi **tidak bisa diakses** karena tidak ada route/nav link (§4.4.1).

#### 4.4.12 Config Env

`VITE_BILLING_ENABLED` (default enabled), `VITE_ROOMS` (JSON array, wajib). `VITE_SERVER_PORT` dead (dideklarasikan di type, tidak dibaca).

---

## 5. Katalog Event Real-Time (Ringkasan Lintas-Aplikasi)

Lihat detail lengkap tiap arah di §4.1.2 (server), §4.2.3 (agent), §4.3.3 (web), §4.4.3 (cashier). Ringkasan arah komunikasi:

```
Cashier  --cashier:activate-room/deactivate-room/extend-time--> Server --agent:activation/agent:clear-data--> Agent
Cashier  --transaction:save/get/delete/clear-------------------> Server (persist + broadcast balik)
Agent    --agent:register/heartbeat/player:state/playlist:state-> Server --agents:update/player:update/playlist:update--> Cashier & Web
Server   --room:activation/room:expiry-warning------------------> Cashier & Web (broadcast global, filter by roomId di client)
Web      --player:command----------------------------------------> Server --command--> Agent
Agent    --agent:error-------------------------------------------> Server (persist ke tabel errors) --agent:error--> semua client
```

**Catatan penting**: hampir semua broadcast server bersifat **global** (`io.emit`), bukan di-scope per-ruangan/per-koneksi — client (cashier/web) bertanggung jawab memfilter berdasarkan `roomId` sendiri. Ini konsisten dengan desain "1 server = 1 ruangan sungguhan", tapi berarti tidak ada isolasi di level transport.

---

## 6. State & Storage

### 6.1 Server SQLite (per PC Ruangan) — lihat schema exact di §4.1.5
- `agents(agentId PK, player JSON, playlist JSON, updatedAt)`
- `transactions(id PK, roomId, roomName, customerName/Phone/Email/Note, startTime, endTime, duration, pricePerHour, totalPrice, paymentMethod, paidAt DEFAULT 0, cleanedAt, notes)`
- `errors(id PK AUTOINCREMENT, agentId, roomId, timestamp, type, message, stack, context)`

### 6.2 Agent — In-Memory Saja
`PlayerRepository`/`PlaylistRepository` tidak lagi persist ke disk lokal (lihat §4.2.11) — restore sepenuhnya bergantung pada push balik dari server.

### 6.3 Cashier Storage (in-memory + Zustand)
`useRoomStore` (config ruangan dari `VITE_ROOMS` + sistem transaksi paralel yang tidak dipakai), `useTransactionStore` (transaksi ter-merge dari semua server). Tidak ada persistence — refresh browser = reset total, reload dari server via `transaction:get`.

### 6.4 Web — Zustand tanpa persistence
Reset tiap reload, tidak ada localStorage/IndexedDB.

---

## 7. Status Ruangan (Cashier View)

| Status | Kondisi (kode aktual, `RoomCard.tsx:243-284`) | Aksi yang bisa dilakukan |
|--------|---------|--------------------------|
| **OFFLINE** | `!roomBilling.isConnected` | Tunggu online, tidak ada aksi |
| **AKTIF** | `roomBilling.isActive` | Deactivate, Extend, Move |
| **UNPAID** | Ada transaksi `paidAt=0` di ruangan ini | Activate diblokir |
| **BERSIHKAN** | `paidStatus==='BERSIHKAN'`: sudah dibayar, belum `allPaidCleaned`, `timeSincePaid < 30menit` | Activate diblokir, tunggu SUDAH DIBERSIHKAN atau mark manual |
| **SUDAH DIBERSIHKAN** | `allPaidCleaned` (mark manual) ATAU `30menit <= timeSincePaid < 60menit` (auto) | Activate bisa dilakukan lagi |
| **ONLINE** | Tidak ada kondisi di atas yang cocok (termasuk >60 menit auto-revert) | Activate (klik tombol power) |

> **Catatan**: "PAID" sebagai label terpisah **tidak pernah muncul di UI** — hanya field data (`paidAt>0`), bukan status badge. Ini berbeda dari draf PRD lama yang mencantumkannya sebagai baris status tersendiri.

---

## 8. Known Issues — Konsolidasi (Kode Audit + Laporan User)

### 8.1 🔴 CRITICAL — Deteksi OFFLINE via heartbeat timeout TIDAK BERFUNGSI
**Lokasi**: `server/src/services/AgentManager.ts:52-84` (`checkHeartbeat`).
**Gejala**: Agent yang berhenti heartbeat (tanpa disconnect socket eksplisit) tidak pernah ditandai OFFLINE — tetap tampil ONLINE/WAITING selamanya di `agents:update`.
**Penyebab**: `getAll()` mengembalikan **clone**, bukan reference. Loop `checkHeartbeat()` men-set `agent.status="OFFLINE"` pada clone yang langsung dibuang — mutasi tidak pernah mencapai registry Map asli. Flag `changed` di-set tapi tidak ada broadcast/write-back (`// will be called later` — belum selesai dikerjakan).
**Dampak**: Status OFFLINE hanya terjadi lewat `disconnect` socket asli (yang justru **menghapus total** entry, bukan mark OFFLINE) — jadi ada celah kondisi (agent proses hang tapi socket TCP masih terbuka) yang tidak pernah terdeteksi oleh cashier.
**Fix yang disarankan**: Ganti `getAll()` dengan iterasi `getRef()`/akses langsung Map internal di `checkHeartbeat`, lalu panggil `broadcastAgents()` setelah ada perubahan.

### 8.2 🟠 HIGH — Timer warning ekspirasi bocor (orphan `setTimeout`)
**Lokasi**: `server/src/socket/SocketServer.ts` (`setupRoomTimer`/`clearRoomTimer`, `:826-861`).
**Gejala**: Deactivate manual atau extend-time sebelum warning 5/2/1/0.5 menit sempat fire → warning lama tetap terkirim dengan data stale di waktu yang sudah tidak relevan (room bisa sudah tidak aktif, atau sudah diperpanjang).
**Penyebab**: `clearRoomTimer` hanya menyimpan & membatalkan 1 timer (expiry final) di `roomTimers` Map; 4 `setTimeout` warning tidak dilacak sama sekali.
**Fix yang disarankan**: Simpan array timer (bukan satu timeout) per room, batalkan semuanya di `clearRoomTimer`.

### 8.3 🟠 HIGH — `transaction:clear` menghapus SEMUA ruangan, bukan satu ruangan
**Lokasi**: `server/src/socket/SocketServer.ts:698-709`, `DatabaseService.clearTransactions()`.
**Gejala**: Commit history (`fff0470 refactor: enhance transaction clearing logic to target specific rooms`) mengindikasikan niat room-scoped, tapi kode aktual masih `DELETE FROM transactions` tanpa `WHERE` — kasir yang klik "Hapus Semua Riwayat" di satu ruangan berisiko menghapus transaksi ruangan lain juga (tergantung apakah cashier mengirim event ini ke semua koneksi atau satu).
**Fix yang disarankan**: Tambah parameter `roomId` opsional ke event & method DB, `WHERE roomId=?` kalau diisi.

### 8.4 🟡 MEDIUM — DB-level `clearAgentData` tidak pernah dipanggil saat deactivate/expire
**Lokasi**: `server/src/services/DatabaseService.ts` (method ada), tidak dipanggil dari `SocketServer.ts` manapun.
**Gejala**: Row SQLite `agents` tetap menyimpan video terakhir walau UI sudah "dibersihkan" — reconnect berikutnya bisa push balik video lama.
**Fix yang disarankan**: Panggil `database.clearAgentData(agent.id)` di flow deactivate & expire.

### 8.5 🟡 MEDIUM — `getTotalRevenue()` vs `getTodayRevenue()` tidak konsisten soal `paidAt`
**Lokasi**: `cashier/src/store/useTransactionStore.ts` (`getTotalRevenue` tidak filter `paidAt`, `getTodayRevenue` filter `paidAt>=todayStart`).
**Gejala**: Total revenue di-inflate oleh transaksi unpaid; today revenue di-undercount untuk transaksi unpaid hari ini.
**Fix yang disarankan**: Samakan filter — keduanya hanya hitung `paidAt > 0`.

### 8.6 🟡 MEDIUM — `SERVER_PORT` (agent) dan `VITE_SERVER_PORT` (web/cashier) adalah dead config
**Lokasi**: `agent/src/services/ConfigService.ts:102` (baca `PORT`, bukan `SERVER_PORT`); `web/src/utils/getServerUrl.ts` (derive dari `window.location.port`, bukan env).
**Gejala**: Operator yang mengikuti `.env.example` mengira mengubah `SERVER_PORT`/`VITE_SERVER_PORT` berpengaruh — tidak.
**Fix yang disarankan**: Selaraskan nama env var dengan yang benar-benar dibaca, atau update kode supaya baca nama yang didokumentasikan.

### 8.7 🟡 MEDIUM — Double `socket.connect()` di Agent
**Lokasi**: `agent/src/core/Agent.ts:176,313`.
**Gejala**: `SocketClient.connect()` dipanggil 2x dalam satu startup, masing-masing membuat instance `io()` baru tanpa men-disconnect yang lama — socket pertama ditinggalkan begitu saja, semua handler didaftar ulang di socket kedua. Berisiko dua koneksi hidup singkat sebelum yang lama timeout, dan state promise internal (`activationResolve`) tidak direset dengan bersih.
**Fix yang disarankan**: `disconnect()` socket lama sebelum `connect()` kedua, atau restrukturisasi supaya `connect()` hanya dipanggil sekali setelah semua service siap didaftar sebagai handler.

### 8.8 🟢 LOW — `TransactionsPage` (riwayat transaksi global) tidak ke-route
**Lokasi**: `cashier/src/App.tsx` (hanya route `/`), `cashier/src/pages/TransactionsPage.tsx` (lengkap tapi orphan).
**Fix yang disarankan**: Tambah `<Route path="/transactions">` + nav link (`MenuLink` sudah ada, juga belum dipakai).

### 8.9 🟢 LOW — Billing/expiry tidak tervisualisasi di Web PWA
**Lokasi**: `web/src/config/env.ts:7` (`VITE_BILLING_ENABLED` dideklarasikan, tidak dipakai).
**Catatan**: Ini gap fitur, bukan regresi — perlu keputusan produk apakah web app room perlu menampilkan sisa waktu/harga.

### 8.10 🟢 LOW — Dead code / vestigial (kandidat cleanup, tidak mempengaruhi fungsi)
- `server/src/container/AppContainer.ts` (DI container tidak terpakai)
- `cashier/src/services/SocketService.ts` + `utils/getServerUrl.ts` (single-socket legacy)
- `cashier/src/store/useRoomStore.ts` — sistem transaksi paralel (`transactions: Map`) tidak dipakai
- `agent/src/youtube/YouTubeController.ts`, `agent/src/services/HealthService.ts` (stub), `agent/src/logger/Logger.ts` — implementasi lama yang sudah digantikan
- `web/src/features/player/components/PlayerProgress.tsx`, `PlayerStatus.tsx` (commented-out), `usePlayerControls.ts` (return value dibuang)
- Dependency `pino` di `server/package.json` — terinstall, tidak pernah diimpor

### 8.11 [KNOWN, tidak akan di-fix — sesuai konfirmasi desain]
- **Shared-IP Cashier conflict di AgentRegistry** — sudah tidak relevan pasca Fix C (key registry sekarang `roomId`, bukan `agent.id`).
- **Per-isolated Database** — sesuai desain, tidak ada sinkronisasi antar server. Backup per-PC tanggung jawab operator.

---

## 9. Riwayat Perbaikan (Sudah Selesai & Terverifikasi)

### Fix A — Merge transaksi multi-server
`cashier/src/store/useTransactionStore.ts` — `setTransactions(serverTx, sourceRoomId)` sekarang benar-benar `set()` hasil merge, dengan proteksi orphan cross-server via `sourceRoomId`. **Terverifikasi**: 11 test lulus.

### Fix B — Lookup koneksi robust
`cashier/src/services/MultiSocketService.ts` — `findConnectionForRoom()` 5-mode fallback dipakai di semua method publik. **Terverifikasi**: 7 test lulus.

### Fix C — AgentRegistry key = `roomId`
`server/src/services/AgentRegistry.ts` — key primer sekarang `roomId` (bukan `agent.id`), dengan secondary index `agentIdIndex` untuk lookup lama. **Terverifikasi**: 20 test lulus.

### Bug A.1 (setTransactions tidak commit) & Bug A.2 (orphan multi-server hilang) & Bug B.1 (lookup strict)
Semua sudah diperbaiki bersamaan dengan Fix A/B di atas — lihat kode aktual di §4.4.8/§4.4.2.

---

## 10. Unit Test & E2E Test Setup

### 10.1 Unit Test

| Package | Framework | File | Jumlah Test |
|---|---|---|---|
| server | vitest 2.x | `server/src/services/AgentRegistry.test.ts` | 20 |
| cashier | vitest 2.x | `cashier/src/store/useTransactionStore.test.ts` | 11 |
| cashier | vitest 2.x | `cashier/src/services/MultiSocketService.test.ts` | 7 |

**Total: 38 test, semua lulus.**

```bash
cd server && npm test
cd cashier && npm test
cd cashier && npm run test:watch   # watch mode
```

**TypeScript Build Status**: server ✅ tsc OK · agent ✅ tsc OK · cashier ✅ tsc -b + vite OK · web ✅ tsc + vite OK.

### 10.2 E2E Test

- Lokasi: `scripts/e2e/` — entry `run.ts`, wrapper `run-test.sh`, helper `spawn-server.ts`/`test-client.ts`/`spawn-mock-agent.ts`.
- Simulasi topologi produksi (1 ruangan = 1 PC) di 1 host: 3 server (port 53331-53333), 3 mock agent, 1 cashier-like multi-socket client.
- 5 skenario: multi-server connection, activate flow end-to-end, transaction merge (Fix A), connection lookup (Fix B), reconnect setelah restart server.
- Prasyarat: Node 18+ sistem (bukan Electron-bundled), `cd server && npm run build`.

```bash
./scripts/e2e/run-test.sh
NODE_BIN=/path/to/node ./scripts/e2e/run-test.sh   # override node path
```

**Hasil terakhir**: 33 assertion lulus di 5 skenario.

---

## 11. Acceptance Criteria (Konsolidasi & Diperbarui)

- [ ] Tiap PC ruangan bisa auto-start `agent + server + web` via systemd.
- [ ] PC Kasir bisa konek ke 1+ server ruangan tanpa crash.
- [ ] Activate dari Kasir → agent di ruangan yang sama terima `agent:activation` < 1 detik.
- [ ] Deactivate dari Kasir → transaksi auto-created dengan harga yang benar (per jam, ceil, berdasar durasi **yang dibeli** bukan waktu aktual terpakai — lihat §4.4.6).
- [ ] Auto-expiry bekerja (kalau `durationMinutes` diset) → deactivate + clear player di agent.
- [ ] Timer countdown di Cashier sinkron dengan `expiresAt` server.
- [ ] Perpanjangan waktu dari Kasir → `expiresAt` update di server + agent.
- [ ] Transaksi dari tiap ruangan muncul di Transaction page per-ruangan (Fix A terverifikasi). ⚠️ Riwayat global (`TransactionsPage`) belum accessible — lihat §8.8.
- [ ] Status ruangan (OFFLINE, AKTIF, UNPAID, BERSIHKAN, SUDAH DIBERSIHKAN, ONLINE) tampil sesuai kondisi — perhatikan "PAID" bukan status UI terpisah (§7).
- [ ] Move Room (pindah ruangan) preserve customer info + sisa waktu **aktual** (bukan durasi asli).
- [ ] `BILLING_ENABLED=false` → agent auto-aktif tanpa tunggu kasir.
- [ ] ⚠️ **Belum terpenuhi**: agent yang stop-heartbeat (proses hang, socket masih terbuka) terdeteksi OFFLINE oleh cashier — lihat §8.1, saat ini tidak berfungsi.

---

## 12. Di Luar Scope (Tidak di-handle aplikasi)

- **Backup database otomatis** — tanggung jawab operator (cron, rsync, dll).
- **Sinkronisasi transaksi antar-PC** — desain topologi memang isolated.
- **Multi-agent di 1 PC** — tidak digunakan (sesuai "1 ruangan = 1 PC").
- **High-availability** server — kalau PC ruangan mati, ruangan tsb offline sampai PC nyala lagi.
- **Auth/login** — tidak ada. Semua socket trusted di jaringan lokal.
- **HTTPS/WSS** — plain HTTP/WS, asumsi jaringan private.
- **Perhitungan harga di server** — by design, dipercayakan penuh ke cashier client (lihat §4.1.6).

---

## 13. Appendix — File Index per Aplikasi

**Server**
- Entry/bootstrap: `server/src/index.ts`, `server/src/app.ts`, `server/src/bootstrap/registerRoutes.ts`
- DI: `server/src/container/ServiceContainer.ts`, `AppContainer.ts` (unused)
- Realtime: `server/src/socket/SocketServer.ts`, `SocketEvents.ts`
- Registry/heartbeat: `server/src/services/AgentRegistry.ts` (+ `.test.ts`), `AgentManager.ts`
- Persistence: `server/src/services/DatabaseService.ts`
- HTTP: `server/src/routes/api.ts`, `health.ts`, `SearchRoutes.ts`; `server/src/controllers/*`
- YouTube: `server/src/youtube/YoutubeSearchService.ts`, `DurationFormatter.ts`

**Agent**
- Entry/orkestrasi: `agent/src/index.ts`, `agent/src/core/Agent.ts`
- Config: `agent/src/config/config.ts`, `agent/src/services/ConfigService.ts`
- Networking: `agent/src/network/SocketClient.ts`, `HeartbeatService.ts`, `CommandRouter.ts`, `agent/src/socket/SocketEvents.ts`
- Browser: `agent/src/browser/BrowserManager.ts`, `BrowserLauncher.ts`, `BrowserProfile.ts`
- Player/DOM: `agent/src/player/YouTubePlayer.ts`, `YouTubeDOM.ts`, `agent/src/services/PlayerService.ts`
- Playlist: `agent/src/services/PlaylistService.ts`, `agent/src/playlist/*`
- Commands: `agent/src/commands/CommandDispatcher.ts`, `agent/src/commands/handlers/*`
- Health/Recovery: `agent/src/health/HealthService.ts`, `agent/src/recovery/RecoveryEngine.ts`
- Assets statis: `agent/data/start_image.html`, `expired_image.html`

**Web**
- Entry: `web/src/main.tsx`, `App.tsx`, `routes/AppRouter.tsx`, `layouts/MainLayout.tsx`
- Socket: `web/src/services/socket/SocketService.ts`
- Player: `web/src/services/player/PlayerCommandService.ts`, `features/player/components/*`
- Search: `web/src/services/search/SearchService.ts`, `pages/SearchPage.tsx`
- Store: `web/src/store/appStore.ts`
- PWA: `web/public/manifest.json`, `web/public/sw.js`, `web/vite.config.ts`

**Cashier**
- Entry: `cashier/src/App.tsx`, `pages/DashboardPage.tsx`, `layouts/CashierLayout.tsx`
- Socket: `cashier/src/services/MultiSocketService.ts` (aktif), `SocketService.ts` (dead)
- Store: `cashier/src/store/useTransactionStore.ts`, `useRoomStore.ts`
- UI: `cashier/src/components/RoomCard.tsx`, `MoveRoomModal.tsx`, `TransactionModal.tsx`, `PaymentConfirmModal.tsx`, `PrintReceipt.tsx`
- Orphan (belum di-route): `cashier/src/pages/TransactionsPage.tsx`, `components/MenuLink.tsx`
