# Video Controller — Product Requirement Document (PRD) v3

> Dokumen ini jadi acuan utama sebelum fix bug atau tambah fitur. Versi ini adalah hasil audit kode mendalam (bukan cuma asumsi desain) terhadap `server/`, `agent/`, `web/`, `cashier/` — setiap klaim dilengkapi `file:line` supaya bisa diverifikasi langsung. Bagian "Known Issues" sengaja dipisah per severity karena banyak yang baru ketemu lewat audit ini (bukan dari laporan user). **v3 (2026-08-11)**: `cashier/` sudah tidak pakai Zustand sama sekali (§9.3-A); 2 bug produksi dari laporan user (transaksi duplikat, status Move Room salah) dan 6 celah sinkronisasi dari audit `agent/`+`web/` sudah diperbaiki (§9.3). **Update sama hari**: `web/` juga sudah tidak pakai Zustand (§9.4, atas permintaan eksplisit user demi konsistensi arsitektur — bukan bug fix, tidak ada masalah data-divergence yang ditemukan di store `web/`); migrasi itu sempat menimbulkan regresi (`web/` stuck di layar "Loading..." selamanya) yang ketahuan begitu user coba pakai aplikasinya langsung. Root cause sebenarnya baru ketemu di percobaan kedua: ada 2 instance `SocketService` singleton hidup berdampingan (bug lama, bukan cuma dari migrasi ini) — sudah diperbaiki jadi satu-satunya, lihat §9.5. **Update lagi**: bug terpisah dilaporkan user — Extend Time dari cashier bikin tampilan agent balik ke `start_image.jpeg` walau video sedang jalan; root cause di agent tidak membedakan "baru diaktifkan" vs "sudah aktif, cuma di-extend" — sudah diperbaiki, lihat §9.6. **Update terakhir**: atas permintaan user, `pricePerHour` dipindah dari `cashier/.env` (`VITE_ROOMS`) ke `server/.env` tiap PC ruangan (`PRICE_PER_HOUR`) — server sekarang jadi sumber tarif, dikirim ke cashier lewat `AgentInfo.pricePerHour`; kalkulasi `totalPrice` tetap di cashier — lihat §9.7.

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
| Web Vite dev | `53332` | React 19 + Vite + Tailwind v4 (Zustand dihapus, lihat §9.4) | tiap PC ruangan saat dev |
| Web Vite preview | `53333` | — | production preview di tiap PC ruangan |
| Cashier Vite dev | `53334` | React + Vite + Context API + socket.io-client (Zustand dihapus, lihat §9.3) | PC Kasir |
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
SERVER_PORT=53331           # Dibaca duluan (ConfigService.ts:102, fixed §9.2 #6), fallback ke PORT lalu 53331 kalau kosong.

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
PRICE_PER_HOUR=50000          # index.ts:12 — Number(...), fallback 50000. Tarif per jam ruangan ini
                               #   (§9.7). WAJIB beda tiap PC ruangan sesuai tarif ruangan tsb.
YOUTUBE_API_KEY=<key>         # YoutubeSearchService.ts:27,34,58 — kalau kosong, search akan gagal (500) tanpa pesan jelas
```
Tidak ada env var lain yang dibaca `server/src` — tidak ada `NODE_ENV`, `DB_PATH`, `LOG_LEVEL`, atau CORS-origin override. `server/src/config/` folder ada tapi **kosong** (belum dipakai).

### 3.3 `web/.env` (per PC Ruangan, opsional)
```bash
VITE_SERVER_IP=127.0.0.1    # web/src/utils/getServerUrl.ts:3 — fallback ke window.location.hostname kalau kosong
VITE_SERVER_PORT=53331      # Kalau diisi, dipakai sebagai override eksplisit (fixed §9.2 #6). Kosongkan untuk
                             #    heuristik lama: 53332/53333 dev/preview → 53331, port lain dipakai apa adanya.
VITE_BILLING_ENABLED=true   # web/src/config/env.ts:7 — sekarang dikonsumsi oleh BillingStatus.tsx (fixed §9.2 #9),
                             #    menampilkan countdown sisa waktu di HomePage saat room aktif.
```

### 3.4 `cashier/.env` (PC Kasir)
```bash
VITE_BILLING_ENABLED=true   # cashier/src/config/billing.ts:3 — default enabled kecuali literal 'false'

# Tiap entry = 1 ruangan di 1 PC server tersendiri.
# 'ip' = IP PC ruangan tsb (bukan IP server pusat).
# 'roomId' HARUS sama dengan ROOM_ID di agent/.env PC terkait.
# pricePerHour TIDAK ADA di sini lagi (dipindah ke server/.env tiap ruangan, §9.7).
VITE_ROOMS=[
  {"roomId":"room-001","name":"Room 1","ip":"192.168.1.104","port":53331},
  {"roomId":"room-002","name":"Room 2","ip":"192.168.1.114","port":53331},
  {"roomId":"room-003","name":"Room 3","ip":"192.168.1.12", "port":53331}
]
```
`config.id` di-set ke `room.roomId` (bukan id acak terpisah) — lihat `context/RoomConfigContext.tsx` (`loadRoomsFromEnv()`, pindahan dari `useRoomStore.ts` lama pasca penghapusan Zustand, §9.3). `pricePerHour` **sudah tidak lagi bagian dari `RoomConfig`/`VITE_ROOMS`** (§9.7) — tarif sekarang milik server tiap ruangan (`PRICE_PER_HOUR` di §3.2), dikirim ke cashier lewat field `pricePerHour` pada `AgentInfo` (`agent:register`/`agents:update`). Fallback `?? 50000` tetap ada di 3 titik baca (`MultiSocketService.ts` x2, `RoomCard.tsx`) untuk kondisi agent belum terkoneksi, tapi sumber angkanya sekarang seragam dari data server, bukan config lokal duplikat seperti sebelumnya.

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

`AppContainer` (bekas `server/src/container/AppContainer.ts`) adalah class DI container kedua yang tidak pernah di-instantiate di manapun — sudah **dihapus** (lihat §9.2 #10). Container aktif yang dipakai adalah `ServiceContainer`.

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
| `transaction:clear` | `:698-714` | `{roomId?}` (opsional) | `DELETE FROM transactions WHERE roomId=?` kalau `roomId` diisi, else hapus semua (fixed, lihat §9.2 #3) — broadcast sisa transaksi terbaru ke semua client. |
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
Untuk tiap threshold, jadwalkan `setTimeout` terpisah mengirim `room:expiry-warning`. Semua timer (4 warning + 1 expiry) disimpan sebagai array per room di `roomTimers: Map<string, NodeJS.Timeout[]>`, dan `clearRoomTimer()` membatalkan seluruhnya sekaligus (fixed, lihat §9.2 #2) — deactivate/extend-time sebelum warning fire tidak lagi meninggalkan timer basi.

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

- **Extend time** (`cashier:extend-time`): `newExpiresAt = (agent.expiresAt || Date.now()) + additionalMinutes*60000`. Kalau `!agent.isActive`, request **diabaikan diam-diam** tanpa error balik. Timer lama dibatalkan penuh (termasuk semua warning timer, fixed §9.2 #2) lalu diganti via `setupRoomTimer` lagi. Notifikasi ke agent memakai event **`agent:activation{isActive:true, expiresAt:newExpiresAt}` yang sama persis** dengan event reaktivasi asli — server tidak mengirim penanda apapun untuk membedakan "cuma extend, room sudah aktif" dari "baru diaktifkan". Ini bagian dari root cause bug §9.6 (tampilan agent balik ke `start_image.jpeg` saat di-extend) — fix akhirnya diletakkan di sisi agent (lihat §4.2.2), server-nya tetap begini.

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

`clearAgentData(agentId)` (reset player/playlist ke default di DB) sekarang **dipanggil** di kedua flow deactivate dan expire (fixed, lihat §9.2 #4) — row SQLite `agents` ikut ter-reset, jadi reconnect berikutnya tidak lagi mendapat push balik video lama.

**Errors table**: `getAgentErrors()`/`clearAgentErrors()` ada tapi **tidak diekspos** lewat route/socket manapun — tidak ada cara baca/hapus error tersimpan via API saat ini; tabel `errors` cuma tumbuh terus.

#### 4.1.6 Perhitungan Harga Transaksi — TIDAK di Server

Grep menyeluruh `totalPrice`/`Math.ceil` di `server/src` = nol hasil logic perhitungan. Field `totalPrice` hanya dideklarasikan di interface `TransactionData` dan di-passthrough saat `INSERT`/`UPDATE`. **Semua kalkulasi harga (per jam, ceiling ke atas) terjadi di `cashier/` (client), server hanya menyimpan hasil akhir apa adanya.** Lihat §4.4.6 untuk formula aslinya.

Sejak §9.7, tarif (`pricePerHour`) **sendiri** sekarang dimiliki server (env `PRICE_PER_HOUR`, §3.2), bukan lagi client — server hanya memberi tahu cashier berapa tarifnya (lewat `AgentInfo.pricePerHour`), tapi tidak ikut menghitung `totalPrice`. Pembagian tanggung jawab: **server = sumber tarif, cashier = tempat kalkulasi**.

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
2. `socketClient.connect()` — satu-satunya panggilan connect (dulu ada panggilan kedua yang duplikat, sudah dihapus — lihat §9.2 #7).
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
14. `HeartbeatService.start()`.
15. Start 3 interval: `startPlayerStateSync()` (1s), `startPlaylistSync()` (1s), `startAutoSkipAds()` (500ms).

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
Selama menunggu, agent kirim heartbeat manual tiap 5 detik (terpisah dari `HeartbeatService`) supaya tidak kena timeout OFFLINE server (15 detik — deteksi ini sudah diperbaiki, lihat §9.2 #1).

`agent:activation` handler (`SocketClient.ts:226-315`), didaftarkan ulang tiap `connect()`:
- `isActive:false` → dispatch `STOP` command internal + `playerService.showExpiredImage()`.
- `isActive:true` **dan sebelumnya tidak aktif** (`!wasActive`) → `resumeStateSync()` + `playerService.showStartImage()` (reaktivasi genuine).
- `isActive:true` **dan sebelumnya sudah aktif** (`wasActive`) → hanya update `expiresAt`/data lain, **tidak** menyentuh player/display (mis. extend-time). Fix §9.6 — sebelumnya kedua kasus ini diperlakukan sama, lihat catatan di bawah.

Event `cashier:deactivate-room` juga punya listener terpisah (`setupDeactivationListener`) yang melakukan hal sama — dua jalur independen menuju efek yang sama.

**Fix sesi ini (§9.3) — restore payload race saat boot**: `setupDatabaseRestoreListener()` (menangani push balik `PLAYER_STATE`/`PLAYLIST_STATE` dari server untuk restore state lama) didaftarkan segera setelah `connect`, tapi `playerService`/`playlistService` baru di-set jauh belakangan (setelah `browser.start()`, dan setelah `waitForActivation()` yang bisa lama kalau menunggu kasir). Kalau payload restore tiba di jendela waktu itu, dulu **hilang diam-diam** (`if (this.playerService) {...}` tanpa `else`). Sekarang di-buffer (`pendingPlayerRestore`/`pendingPlaylistRestore`) dan di-flush otomatis begitu `setPlayerService()`/`setPlaylistService()` dipanggil.

**Fix sesi ini (§9.3) — `pauseStateSync` bisa macet permanen**: `agent:clear-data` memanggil `pauseStateSync()`, dan **satu-satunya** tempat yang meng-resume adalah event `agent:activation{isActive:true}`. Kalau event reaktivasi itu pernah hilang/tidak sampai, sync state ke server berhenti **selamanya** sampai proses agent di-restart. Sekarang ada watchdog: kalau sudah paused >15 detik (jendela clear-data asli cuma butuh ~100-500ms) tanpa reaktivasi, `Agent.ts` auto-resume sendiri (dicek tiap tick 1 detik `startPlayerStateSync`, lewat `checkPauseWatchdog()`).

**Fix sesi ini (§9.3) — `expiresAt` tidak pernah ditegakkan lokal**: `identity.expiresAt` disimpan tapi sebelumnya tidak pernah dibandingkan ke `Date.now()` di mana pun — agent 100% bergantung pada event deactivate dari server sampai. Kalau event itu hilang, agent bisa terus memutar video walau waktu sudah habis. Sekarang ada `checkExpiryWatchdog()` (dicek tiap tick 1 detik yang sama) yang self-deactivate (stop + tampilkan gambar expired + `identity.isActive=false`) begitu `Date.now() >= identity.expiresAt` walau tidak ada event yang masuk.

**Fix §9.6 (2026-08-11) — Extend Time bikin tampilan agent balik ke `start_image.jpeg`**: dilaporkan user. Root cause di dua sisi. Server (`CASHIER_EXTEND_TIME` di `server/src/socket/SocketServer.ts`, lihat §4.1.4) mengirim `agent:activation{isActive:true, expiresAt:newExpiresAt}` ke agent setiap kali extend time — event yang **sama persis** dengan reaktivasi asli, tidak ada penanda pembeda. Agent-nya sendiri (`setupActivationListener`) cuma cek `data.isActive===true` tanpa peduli apakah room memang baru aktif atau sudah aktif dari tadi, jadi `showStartImage()` (yang melakukan `page.goto('file://.../start_image.html')`, full navigation menjauh dari video yang sedang diputar — lihat §4.2.6) selalu terpanggil setiap extend. Fix: `SocketClient.ts` sekarang menangkap `wasActive` sebelum overwrite `identity.isActive`, dan cuma menjalankan `resumeStateSync()`+`showStartImage()` kalau transisi `false→true` (reaktivasi genuine). `identity.expiresAt` tetap ter-update di semua kasus (jadi countdown & `checkExpiryWatchdog()` tetap benar), cuma efek display-nya yang di-skip untuk update sesama-aktif. Server sengaja **tidak diubah** — memperbaiki di agent lebih aman/kecil dampaknya daripada menambah event/field baru di server yang dipakai banyak jalur lain.

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

`PlayerService.getSnapshot()` membungkus dengan **fallback "last-healthy snapshot"** — kalau snapshot baru tidak sehat (videoId kosong / currentTime-duration-volume tidak finite / duration<=0), kembalikan snapshot sehat terakhir supaya tidak flicker state buruk ke server. ⚠️→✅ **Fix sesi ini (§9.3)**: fallback ini dulu **tidak dibatasi waktu** — kalau player benar-benar macet berkepanjangan (bukan sekadar glitch sesaat saat transisi iklan), agent bisa terus mengirim snapshot yang sama (makin lama makin basi) ke server tiap detik tanpa batas, tanpa ada tanda itu bukan data live. Sekarang dibatasi maksimal 5 detik (`HEALTHY_SNAPSHOT_MAX_AGE_MS`) — cukup untuk meredam glitch transisi iklan yang wajar, tapi setelah itu kembali mengirim snapshot mentah (meski "tidak sehat") daripada data basi tak terbatas.

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

`STARTUP_ERROR`, `UNCAUGHT_EXCEPTION`, `UNHANDLED_REJECTION`, dan **sejak sesi ini juga `COMMAND_ERROR`** (fix §9.3 — command handler yang gagal dulu cuma `console.error` lokal, sekarang juga dilaporkan ke server lewat `sendError()` yang sudah ada, dengan command yang gagal disertakan di `context`) dikirim ke server via `agent:error`. Error recovery/snapshot sehari-hari lainnya masih hanya `console.error`/`LoggerService.error` lokal.

#### 4.2.11 Persistence — In-Memory Saja

`PlayerRepository`/`PlaylistRepository` punya komentar eksplisit: *"Data is now stored in server database, not local file... kept for interface compatibility but no longer persists to disk."* Artinya `player.loadSnapshot()`/`playlist.load()` saat startup **tidak pernah** menemukan state lama dari lokal — restore sesungguhnya bergantung 100% pada server push balik `player:state`/`playlist:state` setelah register. Ada sisa file `agent/dist/persistence/*.js` hasil build lama **tanpa source** yang sesuai di `agent/src` — konfirmasi persistence layer lama sudah dicabut tapi dist lama belum dibersihkan.

#### 4.2.12 Config Env yang Dibaca

`ROOM_ID` (default `room-001`), `ROOM_NAME` (default `Room 1`), `BILLING_ENABLED`, `BROWSER_HEADLESS`, `BROWSER_CHANNEL`, `BROWSER_ARGS`, `BROWSER_VIEWPORT[_WIDTH/_HEIGHT]`, `YOUTUBE_HOME`, `HEALTH_INTERVAL`, `LOG_LEVEL`, `SERVER_IP` (auto-detect kalau kosong), dan **`PORT`** (⚠️ bukan `SERVER_PORT` — lihat §3.1).

---

### 4.3 Web (`web/`)

Stack: React 19 + Vite + Tailwind v4, PWA (`vite-plugin-pwa` + hand-rolled `sw.js`). **Zustand sudah dihapus** (lihat §9.4, sama seperti `cashier/` di §9.3) — state sekarang berupa singleton service (`AppStateService`) untuk data yang didorong socket, plus satu React Context (`LoadingContext`) untuk state UI loading.

#### 4.3.1 Struktur & Routing

`AppRouter` — 4 route di bawah `MainLayout`: `/` (`HomePage`, kontrol player), `/playlist` (`PlaylistPage`), `/search` (`SearchPage`), `/settings` (`SettingsPage`). `App.tsx` selalu me-render `<AgentOfflineOverlay/>` global independen dari route — memblokir seluruh UI kalau `agent.online===false`.

`MainLayout` memanggil `useAgent()` di level layout supaya listener/poll agent tetap hidup lintas halaman, dan membaca `globalLoading`/`initialLoading`/`processing` dari `useLoading()` (§4.3.7/§9.4) untuk menghitung state loading gabungan dengan bucket durasi 300/500/1000ms tergantung jenis aksi.

#### 4.3.2 Koneksi Socket

`getServerUrl()` (`utils/getServerUrl.ts`): `hostname = VITE_SERVER_IP || window.location.hostname`; port di-derive dari `window.location.port` — kalau `53332`/`53333` (dev/preview) dipetakan ke `53331`, selain itu pakai port halaman saat ini atau `53331`. **`VITE_SERVER_PORT` tidak pernah dibaca.**

`io(apiUrl, {transports:["websocket"]})` — **hanya websocket**, tanpa polling fallback, tanpa opsi reconnection kustom (pakai default socket.io-client). Ada `onAny` debug listener yang log **semua** event masuk ke console **tanpa gate `import.meta.env.DEV`** — verbose logging ikut ke production build (potensi kebocoran info sesi ke devtools browser).

#### 4.3.3 Socket.IO Events (Web)

**Emit**: `client:request-state` (saat connect), `player:command` (`PlayerCommand` object — 21 helper method di `PlayerCommandService`: play/pause/stop/next/previous/fullscreen/volume/mute/seek/openVideo/addPlaylist/playlist ops/repeat/skipAd). Semua **fire-and-forget**, tanpa ack/korelasi respons dari server.

**Listen**: `player:state`, `player:update`, `playlist:state`, `playlist:update`, `agents:update`.

⚠️→✅ **Bug ditemukan & diperbaiki sesi ini (§9.3)**: `player:update` dan `playlist:state/update` dulu didengarkan dari **2 tempat berbeda** — listener boot-time seumur-hidup-app (`PlayerStateListener`/`registerPlaylistListener` di `main.tsx`) **dan** hook per-halaman (`usePlayer()` di `HomePage`, `usePlaylist()` di `SearchPage`/`PlaylistPage`) yang subscribe lagi di tiap mount. Root cause sebenarnya lebih dalam: `SocketService.off(event)` menghapus **SEMUA** listener untuk event itu, bukan cuma milik pemanggil. Begitu user pindah dari halaman yang punya hook per-halaman (mis. dari `HomePage`), `useEffect` cleanup hook itu memanggil `off("player:update")` yang ikut menghapus listener boot-time global — dan listener itu **tidak pernah didaftarkan ulang**. Efeknya: update player/playlist dari server diam-diam diabaikan selama user berada di halaman lain, sampai balik ke halaman yang mendaftarkan listener lagi atau socket reconnect.

Fix: `usePlayer.ts`/`usePlaylist.ts` **dihapus total** (ternyata 100% redundan — keduanya cuma subscribe untuk efek samping, event yang sama sudah di-handle boot-time listener yang saat itu menulis ke `useAppStore`, dan semua halaman sudah baca state itu langsung lewat hook store). ⚠️ Koreksi di §9.5: klaim "100% redundan" ini **tidak akurat** untuk `usePlaylist.ts` secara spesifik pada saat itu — `registerPlaylistListener` (boot-time listener untuk playlist) ternyata sudah lama punya bug import terpisah (dua instance `SocketService`) yang membuatnya tidak pernah benar-benar jalan; `usePlaylist.ts` justru satu-satunya jalur yang berfungsi. Baru jadi benar-benar redundan setelah bug itu diperbaiki di §9.5. `SocketService.on()` sekarang **mengembalikan fungsi unsubscribe per-listener** (`socket.off(event, specificHandler)`, bukan `off(event)` global) — dipakai `useAgent.ts` untuk `agents:update`. Juga ditemukan & diperbaiki: `registerPendingHandlers()` (flush listener yang di-queue sebelum socket pertama kali connect) dulu membungkus callback dengan closure baru lagi, yang akan membuat unsubscribe gagal menemukan listener aslinya — sekarang pakai reference yang sama. Duplikasi instansiasi `PlayerStateListener` di `main.tsx` (dibuat dan `.start()` 2x) juga dihapus.

⚠️ Catatan pasca §9.4: `useAppStore` yang disebut di atas **sudah tidak ada lagi** — sesi berikutnya menghapus Zustand dari `web/` juga, jadi `PlayerStateListener`/`registerPlaylistListener` sekarang menulis ke `appStateService` (§4.3.7), bukan store manapun. Perbaikan `SocketService.on()`/`registerPendingHandlers()` di atas tetap berlaku persis sama, tidak terpengaruh oleh perubahan itu.

#### 4.3.4 Player Controls UI

`PlayerControls.tsx`: Play/Pause toggle, Stop, Next/Previous, Mute/Unmute, Fullscreen toggle, Skip Ad — semua tombol nonaktif kalau `!agent.online`. `VolumeSlider` dan seek bar (`ProgressBar`) commit ke server hanya di `onMouseUp`/`onTouchEnd` (bukan tiap `onChange`) supaya tidak membanjiri socket saat drag.

#### 4.3.5 Search & Add-to-Playlist

`SearchService.search()` → REST `GET {serverUrl}/api/search?keyword=...` (proxy ke YouTube Data API di server, web tidak pernah pegang API key). Diblokir total (silent, tanpa pesan) kalau `!agent.online`. Play → command `OPEN_VIDEO`. Add to Playlist → command `ADD_PLAYLIST`. Spinner "processing" di-clear via `setTimeout` client-side, **bukan** ack server — jadi kegagalan di sisi server/agent tidak pernah terlihat oleh user.

#### 4.3.6 Current Video Info

`CurrentVideo.tsx` mencocokkan `player.videoId` ke item playlist untuk info lebih lengkap (title/channel/duration/thumbnail), fallback ke field yang menempel langsung di `player` state, fallback lagi ke thumbnail sintetis + placeholder title `Video {videoId}`.

#### 4.3.7 State Management — Sekarang Tanpa Zustand (§9.4)

`useAppStore` (Zustand, store tunggal) **sudah dihapus total**. Audit konsumen (17 file) menemukan store itu sebenarnya menyimpan 3 jenis state berbeda yang butuh perlakuan berbeda, jadi migrasinya bukan "pindahkan semua ke Context" tapi mengikuti pola yang sama dengan `cashier/` (§9.3):

- **`agent`, `player`, `playlist`** — data yang didorong socket. Dua dari tiga penulisnya (`PlayerStateListener`, `registerPlaylistListener`) adalah class/fungsi di level modul yang jalan di `main.tsx` **sebelum React render sama sekali** — Context tidak punya cara untuk ditulis secara imperatif dari luar komponen seperti itu. Solusinya sama seperti `transactions` di cashier: `services/AppStateService.ts` (singleton biasa, bukan React) menyimpan ketiganya, expose `getAgent()`/`getPlayer()`/`getPlaylist()` + `setAgent()`/`setPlayer()`/`setPlaylist()` + pub/sub `onAgentUpdate()`/`onPlayerUpdate()`/`onPlaylistUpdate()` (masing-masing return unsubscribe). Komponen baca lewat hook baru `hooks/useAppState.ts` (`useAgentState()`/`usePlayerState()`/`usePlaylistState()`) — `useState(() => appStateService.getX())` + `useEffect(() => appStateService.onXUpdate(setX), [])`, pola identik dengan `roomBillings`/`transactions` di cashier.
- **`processing` (17 boolean per jenis command), `globalLoading`, `initialLoading`, `removingItemId`, `addingToPlaylist`** — state UI murni yang dibaca+ditulis ~10 komponen berbeda. `context/LoadingContext.tsx` (`LoadingProvider`/`useLoading()`), mirip `LoadingContext` di cashier. Coupling lama dipertahankan persis: `setProcessing` menurunkan `globalLoading` dari `Object.values(processing).some(Boolean)`, dan `setAddingToPlaylist` **juga** menulis `globalLoading` secara langsung (jalur kedua yang independen) — keduanya tetap satu file supaya coupling itu tidak hilang.
- **`search`/`setSearch`** — dikonfirmasi dead code (tidak pernah dibaca/ditulis di manapun; `SearchPage` sudah punya `useState` lokal sendiri) — tidak diportir sama sekali.

`SocketService.ts` yang tadinya menulis `initialLoading` secara imperatif (`useAppStore.getState().setInitialLoading(false)` di dalam `setTimeout` setelah event `'connect'`, dari singleton level-modul yang sama persis masalahnya dengan `PlayerStateListener`) sekarang expose `onConnect(cb)` (pub/sub) — `LoadingProvider` yang subscribe ke situ dan mengatur `initialLoading` sendiri. Arah dependency jadi benar: service expose pub/sub, React yang subscribe, bukan sebaliknya — berlaku juga untuk `AppStateService`.

`App.tsx` membungkus `<AppRouter/>` **dan** `<AgentOfflineOverlay/>` (sibling dari router, bukan di dalam `MainLayout`/`Outlet`) dengan `<LoadingProvider>` — persis pola `cashier/src/App.tsx`. Tidak perlu Provider terpisah untuk `agent`/`player`/`playlist` karena `AppStateService` bukan React state sama sekali.

#### 4.3.8 PWA

Manifest statis (`web/public/manifest.json`) — mereferensikan `icon-192.png`/`icon-512.png` yang **tidak ada** di `web/public/` (hanya `favicon.svg`). **Dua mekanisme service worker berjalan bersamaan**: `sw.js` hand-rolled (stale-while-revalidate, precache minim) **dan** SW auto-generate dari `vite-plugin-pwa`/Workbox — potensi konflik cache/versi.

#### 4.3.9 Billing/Activation Display

`VITE_BILLING_ENABLED` dikonsumsi oleh komponen `BillingStatus.tsx` (fixed §9.2 #9), dirender di atas `HomePage`. Menampilkan countdown live (update tiap detik) berdasar `agent.expiresAt` kalau room punya durasi, atau label "Tanpa Batas" kalau `expiresAt` null (unlimited), dan otomatis tersembunyi kalau billing dimatikan lewat env atau room belum aktif/offline. Field `isActive`/`expiresAt` di-alirkan dari payload `agents:update`/`/api/agents` ke `AgentState` (sebelumnya hanya `online` boolean yang dipakai untuk menggerakkan `AgentOfflineOverlay`; sinyal itu tetap ada, `BillingStatus` menambahkan detail sisa waktu di atasnya).

#### 4.3.10 Config Env yang Dibaca

Hanya 2: `VITE_SERVER_IP`, `VITE_BILLING_ENABLED` (dideklarasikan, tidak dipakai). `VITE_SERVER_PORT` dead.

---

### 4.4 Cashier (`cashier/`)

Stack: React + Vite + Context API + socket.io-client. **Zustand sudah dihapus total** (lihat §9.3) — tidak ada state library eksternal lagi, semua state cashier sekarang berupa React Context (`RoomConfigContext`, `LoadingContext`) atau state yang dimiliki langsung oleh `multiSocketService` (transaksi, agent/billing).

#### 4.4.1 Struktur & Routing

Single page: hanya route `/` → `DashboardPage` (grid kartu ruangan). Route `/transactions` beserta `TransactionsPage` dan nav link di header `CashierLayout` (`MenuLink.tsx`) sudah dihapus agar aplikasi tetap single page. Riwayat transaksi tetap bisa diakses per-ruangan lewat `TransactionModal` (tombol Receipt di `RoomCard`).

#### 4.4.2 MultiSocketService — Multi Koneksi & Pemilik State Transaksi

Singleton `multiSocketService`. `VITE_ROOMS` di-parse jadi `RoomConfig[]` (`config.id = room.roomId`, dilakukan di `context/RoomConfigContext.tsx`), tiap config dapat 1 `Socket` (`io(ip:port, {reconnection:true, reconnectionAttempts:10, reconnectionDelay:1000, timeout:10000})`), disimpan di `Map<config.id, RoomConnection>`.

**Pasca penghapusan Zustand (§9.3)**: tiap `RoomConnection` sekarang juga menyimpan `transactions: Transaction[]` miliknya sendiri (persis seperti field `agents` yang sudah lebih dulu ada di sana), **di-replace penuh** (bukan di-merge) tiap kali event `transaction:get` diterima dari koneksi itu — karena tiap ruangan server independen (§1.1), broadcast dari satu server memang selalu daftar lengkap yang otoritatif untuk ruangan itu, jadi tidak perlu logic merge lokal-vs-server yang tadinya rawan bug. `getTransactions()` men-flatten seluruh koneksi jadi satu array, dan `onTransactionsUpdate(cb)` adalah pub/sub (pola sama seperti `onUpdate`/`onStatusChange` yang sudah ada). Komponen (`RoomCard`, `TransactionModal`, `MoveRoomModal`) membaca lewat `useState(() => multiSocketService.getTransactions())` + `useEffect(() => multiSocketService.onTransactionsUpdate(setState), [])`.

**Lookup connection yang robust** (Fix B, sudah diterapkan & diverifikasi lewat test): `findConnectionForRoom(roomId)` dengan **5 fallback**: (1) `connections.get(roomId)` langsung, (2) `config.roomId===roomId`, (3) `agents[0]?.roomId===roomId`, (4) `config.name` case-insensitive, (5) `config.id` dinormalisasi (`replace(/[^a-z0-9]/g,'')`). Dipakai di **semua** method publik (`activateRoom`, `deactivateRoom`, `loadTransactions`, `extendTime`, dll).

Reconnect: full re-sync tiap `connect` (`cashier:request-agents` + `transaction:get` — bukan incremental). `agentUpdateQueue: Promise<void>` per koneksi men-serialize update supaya tidak race, dan drop update dengan `timestamp < lastAgentUpdate` ("stale update" skip).

⚠️ `SocketService.ts` (single-socket, versi lama) + `getServerUrl.ts` (hardcode port cashier) masih ada di kode tapi **tidak dipakai di manapun** — dead code peninggalan arsitektur sebelum multi-room.

#### 4.4.3 Socket.IO Events (Cashier)

**Emit**: `cashier:request-agents`, `transaction:get`, `cashier:activate-room` `{roomId, roomName, durationMinutes?, customerName?, customerPhone?, customerEmail?, customerNote?}`, `cashier:deactivate-room` `{roomId}`, `cashier:extend-time` `{roomId, additionalMinutes}`, `transaction:save`, `transaction:delete`, `transaction:clear`.

**Listen**: `connect`/`disconnect`/`connect_error`, `transaction:get` (→ **replace** slice transaksi koneksi itu di `multiSocketService`, lihat §4.4.2 — bukan lagi `useTransactionStore.setTransactions()`, store itu sudah dihapus), `agent:register`/`agent:status`/`agent:heartbeat` (merge state agent, logic hampir duplikat 3x), `player:state`, `agents:update`/`agents:list` (juga hampir duplikat), `room:activation` (**trigger utama pembuatan transaksi**, lihat §4.4.6), `room:expiry-warning`.

Method `activateRoom`/`deactivateRoom`/`extendTime` mendaftarkan listener one-shot untuk resolve `onComplete()`, dengan **timeout fallback 3000ms** kalau server tidak pernah merespons — ini yang membuat loading spinner selalu ter-clear meski gagal diam-diam.

⚠️→✅ **Bug ditemukan & diperbaiki sesi ini (§9.3)**: `updateTransaction()` dan `deleteTransaction()` dulu **broadcast ke SEMUA koneksi ruangan yang terhubung**, bukan hanya ke ruangan pemilik transaksi (`transaction.roomId`). Karena tiap ruangan punya server+SQLite independen, ini membuat server ruangan lain ikut meng-`INSERT` salinan transaksi yang sama (upsert by `id`, tapi ruangan lain belum pernah punya id itu) — transaksi jadi ada 2x secara fisik di dua database berbeda begitu ada yang klik "Bayar" saat lebih dari 1 ruangan online. Sekarang keduanya routing lewat `findConnectionForRoom(transaction.roomId)` (untuk `updateTransaction`) atau parameter `roomId` eksplisit (untuk `deleteTransaction`, dipanggil dari `TransactionModal` pakai `roomId` prop modal itu) — hanya mengirim ke satu server yang tepat.

#### 4.4.4 Status Ruangan — State Machine Aktual

**File**: `cashier/src/utils/roomStatus.ts` (fungsi `getRoomStatus()`, dipakai bersama oleh `RoomCard.tsx` dan `MoveRoomModal.tsx` — bukan logic inline terpisah di tiap komponen).
```ts
const CLEANING_THRESHOLD = 30 * 60 * 1000; // 30 menit
const CLEANED_THRESHOLD = 60 * 60 * 1000;  // 60 menit

// Alur normal: deactivate → transaksi unpaid → dibayar → dihitung dari paidAt
function getPaidCleaningStatus(roomTransactions) { /* ... paidAt-based, seperti sebelumnya ... */ }

// Alur Move Room: tidak ada transaksi baru di ruangan sumber, dihitung dari
// roomBilling.needsCleaning/lastTransactionEndTime yang di-set server saat move
function getMovedOutCleaningStatus(roomBilling) { /* ... lastTransactionEndTime-based ... */ }

export function getRoomStatus(roomBilling, transactions) {
  if (!roomBilling.isConnected) return 'OFFLINE';
  if (roomBilling.isActive) return 'AKTIF';
  if (hasUnpaid) return 'UNPAID';
  // getMovedOutCleaningStatus dicek LEBIH DULU (fix §9.3) - lihat catatan di bawah
  return getMovedOutCleaningStatus(roomBilling) ?? getPaidCleaningStatus(roomTransactions) ?? 'ONLINE';
}
```
Prioritas label final: **OFFLINE > AKTIF > UNPAID > BERSIHKAN > SUDAH DIBERSIHKAN > ONLINE**. Catatan: status **"PAID" tidak pernah tampil sebagai label terpisah** di badge — transaksi yang baru dibayar langsung jadi `BERSIHKAN` (kalau `<30 menit`) atau `SUDAH DIBERSIHKAN` (kalau `allPaidCleaned`); "PAID" cuma konsep sesaat di data, bukan status UI.

Tombol Activate `disabled` kalau `hasUnpaid || roomStatus.label==='BERSIHKAN'`.

⚠️→✅ **Bug ditemukan & diperbaiki sesi ini (§9.3)**: urutan pengecekan tadinya `getPaidCleaningStatus(roomTransactions) ?? getMovedOutCleaningStatus(roomBilling)` — **terbalik**. Move Room sengaja **tidak** mencatat transaksi baru di ruangan sumber (transaksi baru dicatat nanti di ruangan tujuan), jadi `getPaidCleaningStatus` yang jalan duluan malah menemukan transaksi **customer sebelumnya** yang tidak berhubungan. Kalau transaksi lama itu kebetulan dibayar 30-60 menit yang lalu, status langsung lompat ke `SUDAH DIBERSIHKAN` berdasarkan data basi itu, dan `getMovedOutCleaningStatus` (yang seharusnya benar, pakai `lastTransactionEndTime` fresh dari server) tidak pernah sempat dicek — ruangan sumber jadi bisa langsung diaktifkan lagi tanpa melalui `BERSIHKAN`. Server-nya sendiri **sudah benar** (`agent.needsCleaning=true; agent.lastTransactionEndTime=Date.now()` di `server/src/socket/SocketServer.ts` pada `reason==='move'`) — bug murni di urutan `??` sisi cashier. Fix: balik urutan jadi `getMovedOutCleaningStatus(roomBilling) ?? getPaidCleaningStatus(roomTransactions)`, karena `roomBilling.needsCleaning` cuma pernah `true` tepat setelah Move Room dan selalu di-reset server saat aktivasi/mark-cleaned — aman dijadikan prioritas tertinggi. Diverifikasi 5 test baru di `roomStatus.test.ts`.

#### 4.4.5 Activate / Extend Room

Form: Nama, No. HP, Email, Catatan, Menit (`min=1 max=480`, opsional — kalau kosong = tanpa batas waktu). `handleToggleActive` → `multiSocketService.activateRoom(...)` → resolve connection → emit pakai `agentRoomId = connection.agents[0]?.roomId || roomId` (pakai roomId dari agent, bukan mentah-mentah dari UI, supaya konsisten dengan yang dikenal server).

Extend: form menit terpisah (max 480), server recalculate `expiresAt` dan reset timer (termasuk efek "warning timer lama jadi orphan" di §4.1.4). Ada juga shortcut "Perpanjang 1 Jam" hardcoded 60 menit di modal "Waktu Habis!" — tapi modal ini **tidak pernah ke-trigger** (`showExpiredConfirm` di-`useState` tapi tidak pernah di-set `true` di manapun) — dead UI path; auto-deactivate saat countdown habis langsung panggil `deactivateRoom`, tidak lewat modal ini.

#### 4.4.6 Deactivate & Pembuatan Transaksi — Sepenuhnya Client-Side

Transaksi **dibuat di cashier**, dipicu oleh listener `room:activation` yang mendeteksi transisi `isActive: true→false`:
```ts
const pricePerHour = agent.pricePerHour ?? 50000; // dari AgentInfo, sumbernya server/.env (§9.7)
const startTime = agent.startTime || 0;
const endTime = data.expiresAt || agent.expiresAt || Date.now();
const durationSeconds = Math.floor((endTime - startTime) / 1000);
// Billing per-blok/jam: minimum 1 jam, dibulatkan ke atas
const totalPrice = Math.max(0, Math.ceil(durationSeconds / 3600) * pricePerHour);
```
Transaksi baru selalu `paidAt: 0` (unpaid), lalu dipush ke server lewat `transaction:save` untuk persist saja (server tidak menghitung ulang).

⚠️ **Poin penting**: `endTime` dihitung dari `data.expiresAt` (durasi yang **dibeli**), bukan `Date.now()` — artinya kalau ruangan di-deactivate **lebih awal** dari durasi yang dibeli, customer tetap ditagih penuh sesuai blok waktu yang dibeli, bukan waktu aktual terpakai. Ini **intentional** (komentar di kode menyebut "minimum 1 jam"). Kalau room tanpa durasi (unlimited), fallback ke `agent.expiresAt` lalu `Date.now()` (baru di sini waktu aktual yang dipakai).

#### 4.4.7 Move Room

`MoveRoomModal`: hitung `remainingMinutes = ceil((expiresAt - now)/60000)` dari sisa waktu **aktual** (bukan durasi asli), lalu `deactivateRoom(sumber, undefined, 'move')` (reason `'move'` — **TIDAK** memicu pembuatan transaksi di ruangan sumber, beda dari deactivate manual biasa; transaksi baru dicatat sekali nanti di ruangan tujuan saat sesi itu benar-benar berakhir) → delay fixed 500ms → `activateRoom(target, remainingMinutes, ..., originalStartTime: billing.startTime)` dengan catatan otomatis "Pindahan dari {roomSumber}", membawa `startTime` sesi asli supaya transaksi akhirnya menghitung total durasi dari awal sesi (bukan dari saat pindah). Tidak ada penyesuaian harga — target room pakai `pricePerHour` miliknya sendiri, jadi pindah ke ruangan lebih mahal/murah akan mengubah tarif untuk sisa waktu.

Status ruangan sumber pasca-move: lihat catatan bug di §4.4.4 — ruangan sumber harus melalui `BERSIHKAN` dulu (bukan langsung `SUDAH DIBERSIHKAN`), dan tombol Activate-nya harus tetap disabled selama itu.

#### 4.4.8 Sumber Data Transaksi — Sekarang Server-Authoritative (Zustand Dihapus, §9.3)

**`useTransactionStore.ts` (Zustand, beserta seluruh logic merge lokal-vs-server-nya) sudah dihapus total** di sesi ini. Transaksi sekarang dimiliki langsung oleh `multiSocketService` (§4.4.2): tiap koneksi ruangan simpan slice `transactions`-nya sendiri, **di-replace penuh** (bukan merge) tiap `transaction:get` diterima, lalu di-flatten lintas koneksi untuk tampilan.

Alasan penghapusan algoritma merge lama (dedupe by id, "server menang kecuali cleanedAt lokal lebih baru", proteksi orphan lewat `sourceRoomId`, dst): algoritma itu **hanya ada untuk menutupi desain lama** yang menyatukan data N server independen ke dalam **satu array flat**. Begitu tiap koneksi menyimpan slice-nya sendiri (desain baru), replace pada satu koneksi **tidak pernah** bisa menyentuh data koneksi lain — masalah yang dulu dikompensasi oleh merge jadi tidak relevan lagi secara struktural, bukan cuma "sudah tidak kejadian".

Efek samping bagus dari perubahan ini: bug id-mismatch pada pencatatan transaksi otomatis (`room:activation` auto-deactivate) ikut kebetulan diperbaiki — dulu ada **dua** `generateId()` terpisah untuk "salinan lokal" dan "payload ke server" pada transaksi yang sama; sekarang cuma satu id yang di-generate dan dipakai untuk satu-satunya payload yang dikirim ke server (state lokal tidak lagi ditulis optimistically, cukup menunggu broadcast `transaction:get` balik).

⚠️ **Bug lama masih ada, belum diperbaiki** (lokasinya pindah, bukan hilang): dulu didokumentasikan sebagai `useTransactionStore.getTotalRevenue()`/`getTodayRevenue()` tidak konsisten filter `paidAt`. Store itu sudah dihapus, tapi logic yang **sama persis** (dan bug yang sama) sekarang ada di `cashier/src/components/TransactionModal.tsx` — `calculateTotalRevenue()` menjumlahkan `totalPrice` dari **semua** transaksi tanpa filter `paidAt > 0` (unpaid ikut dihitung sebagai "Total Pendapatan"), sedangkan `calculateTodayRevenue()` filter `t.paidAt >= todayStart` (jadi transaksi unpaid otomatis ter-exclude karena `paidAt===0`). Masih perlu di-fix: `calculateTotalRevenue()` harus filter `t.paidAt > 0` juga.

#### 4.4.9 Payment Confirmation & Mark Cleaned

Bayar: `PaymentConfirmModal` → `paidAt: Date.now()` (client-generated) → `multiSocketService.updateTransaction(updatedData)`. **Sejak §9.3**: tidak ada lagi tulis-optimistik ke state lokal — UI menunggu broadcast `transaction:get` balik dari server untuk update tampilan (dibantu indikator `pendingIds` per-baris di `TransactionModal` supaya baris yang sedang diproses terlihat redup/nonaktif sampai broadcast/timeout 5 detik selesai — murni presentasional, tidak pernah menulis data transaksi palsu ke state bersama). **Bug broadcast-ke-semua-koneksi yang menyebabkan transaksi duplikat sudah diperbaiki** — lihat catatan di §4.4.3.

Mark cleaned: `cleanedAt: Date.now()` — begitu di-set, `getPaidCleaningStatus()` langsung `SUDAH DIBERSIHKAN` **melewati threshold waktu 30/60 menit** (override manual).

#### 4.4.10 Print Receipt

Murni client-side (`window.open` + `document.write` + `window.print()`), tidak ada integrasi printer thermal langsung (ESC/POS) — mengandalkan dialog print browser. **Nama/alamat/telepon bisnis hardcoded** (`BUSINESS_NAME='KARAOKE'`, dll, `PrintReceipt.tsx:44-46`) — perlu dijadikan konfigurasi (env var) untuk deployment nyata.

#### 4.4.11 Transaction History Pages

- **Per-ruangan** (`TransactionModal`, satu-satunya yang bisa diakses user): filter roomId/roomName, search nama/HP, filter tanggal (`all`/`today`), sort unpaid dulu lalu `paidAt` descending.
- **Global** (`TransactionsPage` via `/transactions`) sudah dihapus agar cashier tetap single page.

#### 4.4.12 Config Env

`VITE_BILLING_ENABLED` (default enabled), `VITE_ROOMS` (JSON array, wajib, entry `{roomId, name, ip, port}` — **tidak lagi ada `pricePerHour`**, dipindah ke server tiap ruangan, §9.7). `VITE_SERVER_PORT` dideklarasikan di type tapi tidak dipakai di cashier (port server ruangan selalu ikut field `port` per-entry di `VITE_ROOMS`, bukan variabel global — beda kasus dengan `SERVER_PORT`/`VITE_SERVER_PORT` di agent/web yang sudah di-fix §9.2 #6).

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

### 6.3 Cashier Storage (in-memory, tanpa Zustand — lihat §9.3)
Tidak ada localStorage/sessionStorage/IndexedDB, dan sejak sesi ini juga **tidak ada Zustand**. State terbagi:
- **`context/RoomConfigContext.tsx`** — `roomConfigs` (dari `VITE_ROOMS`, di-load sekali saat provider mount), `connectionStatus`. Plain React Context + `useState`.
- **`context/LoadingContext.tsx`** — `isLoading`/`loadingType`/`loadingMessage` global.
- **`multiSocketService`** (bukan React state sama sekali, singleton biasa) — pemilik data `agents`/billing (sudah dari awal) **dan sekarang juga `transactions`** (§4.4.2/§4.4.8), diekspos ke komponen lewat pola pub/sub (`onUpdate`/`onTransactionsUpdate`) + `useState` lokal di komponen pemanggil.

Tidak ada persistence — refresh browser = reset total, reload dari server via `transaction:get` (dan `cashier:request-agents`). `roomConfigs` dari `.env` bukan pengecualian "data lokal yang menyebabkan drift" — itu memang harus lokal (cashier butuh tahu IP/port tiap server ruangan sebelum bisa connect sama sekali).

### 6.4 Web — In-memory, tanpa Zustand (§9.4)

Reset tiap reload, tidak ada localStorage/IndexedDB, dan sejak sesi ini juga **tidak ada Zustand**. `agent`/`player`/`playlist` dimiliki `services/AppStateService.ts` (singleton, bukan React state); `processing`/`globalLoading`/`initialLoading`/`removingItemId`/`addingToPlaylist` dimiliki `context/LoadingContext.tsx` (React Context). Lihat §4.3.7 untuk alasan pembagiannya.

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

## 8. Known Issues — Status Terkini

Semua 10 issue yang ditemukan dari audit kode (§8.1-8.10 versi sebelumnya) **sudah di-fix, di-typecheck, dan lulus test** — lihat §9.2 untuk detail perubahan tiap item. Sesi berikutnya (§9.3) menambahkan: penghapusan total Zustand di `cashier/` (audit atas permintaan user, memastikan semua state berbasis server), 2 bug produksi yang dilaporkan langsung oleh user (transaksi duplikat saat Bayar, status ruangan salah setelah Move Room), dan hasil audit lanjutan di `agent/`+`web/` yang menemukan 6 celah sinkronisasi tambahan. Semua sudah di-fix & terverifikasi. Yang tersisa hanya item known-by-design yang memang sengaja tidak di-fix, plus satu bug lama yang lokasinya pindah tapi belum sempat diperbaiki (`calculateTotalRevenue()` tidak filter `paidAt`, lihat §4.4.8):

### 8.1 [KNOWN, tidak akan di-fix — sesuai konfirmasi desain]
- **Shared-IP Cashier conflict di AgentRegistry** — sudah tidak relevan pasca Fix C (key registry sekarang `roomId`, bukan `agent.id`).
- **Per-isolated Database** — sesuai desain, tidak ada sinkronisasi antar server. Backup per-PC tanggung jawab operator.

---

## 9. Riwayat Perbaikan (Sudah Selesai & Terverifikasi)

### 9.1 Fix A/B/C (batch pertama)

### Fix A — Merge transaksi multi-server
`cashier/src/store/useTransactionStore.ts` — `setTransactions(serverTx, sourceRoomId)` sekarang benar-benar `set()` hasil merge, dengan proteksi orphan cross-server via `sourceRoomId`. **Terverifikasi**: 11 test lulus.

### Fix B — Lookup koneksi robust
`cashier/src/services/MultiSocketService.ts` — `findConnectionForRoom()` 5-mode fallback dipakai di semua method publik. **Terverifikasi**: 7 test lulus.

### Fix C — AgentRegistry key = `roomId`
`server/src/services/AgentRegistry.ts` — key primer sekarang `roomId` (bukan `agent.id`), dengan secondary index `agentIdIndex` untuk lookup lama. **Terverifikasi**: 20 test lulus.

### Bug A.1 (setTransactions tidak commit) & Bug A.2 (orphan multi-server hilang) & Bug B.1 (lookup strict)
Semua sudah diperbaiki bersamaan dengan Fix A/B di atas — lihat kode aktual di §4.4.8/§4.4.2.

### 9.2 Fix batch kedua (hasil audit kode mendalam, 2026-08-11)

| # | Issue | File yang diubah | Verifikasi |
|---|---|---|---|
| 1 | 🔴 OFFLINE detection tidak berfungsi | `server/src/services/AgentRegistry.ts` (+`markStaleOffline()`), `AgentManager.ts` (+`onStatusChange()` callback), `SocketServer.ts` (subscribe & broadcast) | 20 test server lulus |
| 2 | 🟠 Timer warning ekspirasi bocor | `server/src/socket/SocketServer.ts` — `roomTimers` sekarang `Map<string, NodeJS.Timeout[]>`, `clearRoomTimer` membatalkan semua timer (warning + expiry) | tsc clean |
| 3 | 🟠 `transaction:clear` hapus semua ruangan | `server/src/services/DatabaseService.ts` (`clearTransactions(roomId?)`), `SocketServer.ts` (terima payload `{roomId?}`), `cashier/src/services/MultiSocketService.ts` (kirim `roomId` saat scoped) | tsc clean, build OK |
| 4 | 🟡 `clearAgentData` tidak dipanggil saat deactivate/expire | `server/src/socket/SocketServer.ts` — dipanggil di kedua flow (`CASHIER_DEACTIVATE_ROOM` handler + `expireRoom()`) | tsc clean |
| 5 | 🟡 `getTotalRevenue`/`getTodayRevenue` tidak konsisten | `cashier/src/store/useTransactionStore.ts` — keduanya sekarang filter `paidAt > 0` | 18 test cashier lulus |
| 6 | 🟡 `SERVER_PORT`/`VITE_SERVER_PORT` dead config | `agent/src/services/ConfigService.ts` (baca `SERVER_PORT` dengan fallback `PORT`), `web/src/utils/getServerUrl.ts` (baca `VITE_SERVER_PORT` sebagai override eksplisit) | tsc clean kedua app |
| 7 | 🟡 Double `socket.connect()` di Agent | `agent/src/core/Agent.ts` — panggilan kedua di `start()` dihapus, listener sudah lengkap dari `connect()` pertama | tsc clean |
| 8 | 🟢 `TransactionsPage` tidak ke-route | `cashier/src/App.tsx` (+`<Route path="/transactions">`), `cashier/src/layouts/CashierLayout.tsx` (+nav pakai `MenuLink`) | build + tsc OK |
| 9 | 🟢 Billing tidak tervisualisasi di Web | `web/src/types/app/AgentState.ts` (+`isActive`/`expiresAt`), `useAgent.ts`, `SearchPage.tsx`, `appStore.ts`, `services/agent/AgentService.ts` (+field), komponen baru `features/player/components/BillingStatus.tsx` (countdown live, gated `VITE_BILLING_ENABLED`) dipasang di `HomePage.tsx` | tsc + vite build OK |
| 10 | 🟢 Dead code (9 file + 1 dependency) | Dihapus: `server/src/container/AppContainer.ts`, `cashier/src/services/SocketService.ts`, `cashier/src/utils/getServerUrl.ts`, `agent/src/youtube/YouTubeController.ts`, `agent/src/services/HealthService.ts` (stub), `agent/src/logger/Logger.ts`, `web/src/features/player/components/PlayerProgress.tsx`, `PlayerStatus.tsx`, `web/src/hooks/usePlayerControls.ts`. Dependency `pino` dihapus dari `server/package.json`. Sistem transaksi paralel & modal-state yang tidak dipakai dihapus dari `cashier/src/store/useRoomStore.ts`. | tsc + build + test lulus di keempat app setelah cleanup |

**Verifikasi menyeluruh setelah semua fix**: server (tsc clean, 20/20 test), agent (tsc clean), cashier (tsc -b clean, vite build OK, 18/18 test), web (tsc clean, vite build + PWA generation OK). E2E suite (`scripts/e2e/run-test.sh`) tidak bisa dijalankan karena binary `esbuild` di root `node_modules` rusak (isu environment pre-existing, tidak terkait perubahan ini) — cakupan sudah tervalidasi lewat unit test + typecheck + production build di semua 4 aplikasi.

### 9.3 Fix batch ketiga (penghapusan Zustand + bug produksi + audit `agent/`/`web/`, 2026-08-11)

Dipicu oleh permintaan user untuk memastikan `cashier/` tidak menyimpan data lokal yang bisa divergen dari server (audit menemukan tidak ada localStorage, tapi Zustand store-nya tetap dihapus atas permintaan eksplisit), lalu berlanjut ke audit yang sama untuk `agent/`+`web/`, dan dua laporan bug langsung dari user saat pemakaian nyata.

**A. Cashier — penghapusan Zustand total (refactor arsitektur, bukan bug)**

`useRoomStore.ts` dan `useTransactionStore.ts` (+ `useTransactionStore.test.ts`) **dihapus**. Diganti:
- `context/RoomConfigContext.tsx` (baru) — `roomConfigs`/`connectionStatus`, plain `useState`.
- `context/LoadingContext.tsx` (baru) — loading global, dipisah dari config supaya tidak saling memicu re-render.
- Data transaksi pindah jadi state internal `multiSocketService` (§4.4.2/§4.4.8) — per-koneksi, **replace** bukan merge.

Dependency `zustand` dihapus dari `cashier/package.json`. Method `addRoom`/`removeRoom`/`getRoomConfig`/`reconnectAll` di `useRoomStore` lama **tidak diportir** — dikonfirmasi tidak ada pemanggil sama sekali (tidak ada UI "tambah ruangan"), jadi dibuang sekalian sebagai dead code.

| # | Perubahan | File | Verifikasi |
|---|---|---|---|
| A1 | Transaksi: per-koneksi replace, bukan flat-array merge | `cashier/src/services/MultiSocketService.ts` | 5 test baru (replace/flatten/unsubscribe/room-removed) |
| A2 | Room config & loading: Context API | `cashier/src/context/RoomConfigContext.tsx`, `LoadingContext.tsx` (baru), `App.tsx`, `DashboardPage.tsx`, `CashierLayout.tsx`, `RoomCard.tsx`, `MoveRoomModal.tsx`, `TransactionModal.tsx` | tsc -b clean |
| A3 | Fix id-mismatch di pencatatan transaksi otomatis (`room:activation`) — dulu 2 id terpisah untuk 1 transaksi | `MultiSocketService.ts` (`saveTransactionToServer`) | tsc -b clean |

**B. Cashier — bug produksi dilaporkan user**

| # | Severity | Issue | File | Verifikasi |
|---|---|---|---|---|
| B1 | 🔴 | Transaksi jadi 2x saat "Bayar"/hapus — `updateTransaction()`/`deleteTransaction()` broadcast `transaction:save`/`transaction:delete` ke **semua** koneksi ruangan (bukan cuma pemilik transaksi), server ruangan lain ikut `INSERT` salinannya | `MultiSocketService.ts` (route via `findConnectionForRoom(transaction.roomId)` / parameter `roomId` eksplisit), `TransactionModal.tsx` (kirim `roomId` ke `deleteTransaction`) | 2 test regresi baru — pastikan `emit` cuma 1x meski 2 ruangan connected |
| B2 | 🟠 | Ruangan sumber Move Room langsung `SUDAH DIBERSIHKAN`, seharusnya `BERSIHKAN` dulu — urutan `getPaidCleaningStatus() ?? getMovedOutCleaningStatus()` terbalik (lihat §4.4.4) | `cashier/src/utils/roomStatus.ts` | 5 test baru di `roomStatus.test.ts` (baru dibuat) |

**C. Web — audit sinkronisasi**

| # | Severity | Issue | File | Verifikasi |
|---|---|---|---|---|
| C1 | 🟠 | `SocketService.off(event)` hapus SEMUA listener event itu → listener boot-time `player:update`/`playlist:state/update` ikut terhapus & tak pernah didaftar ulang begitu user pindah dari halaman yang punya hook per-halaman (lihat §4.3.3) | `web/src/services/socket/SocketService.ts` (`on()` kembalikan unsubscribe per-listener), `hooks/useAgent.ts`, `main.tsx` (hapus duplikasi `PlayerStateListener`) | tsc + vite build OK |
| C2 | — | `usePlayer.ts`/`usePlaylist.ts` dihapus — 100% redundan dengan listener boot-time yang sudah menulis ke store yang sama | Dihapus: `hooks/usePlayer.ts`, `usePlaylist.ts`. Diubah: `pages/HomePage.tsx`, `SearchPage.tsx`, `PlaylistPage.tsx` | tsc + vite build OK |
| C3 | — | Fix laten: `registerPendingHandlers()` bungkus callback 2x, bikin unsubscribe tidak bisa cocok ke listener asli | `SocketService.ts` | tsc + vite build OK |

**D. Agent — audit sinkronisasi (5 celah independen, tidak perlu perubahan server)**

| # | Severity | Issue | File | Verifikasi |
|---|---|---|---|---|
| D1 | 🟡 | Restore payload (`PLAYER_STATE`/`PLAYLIST_STATE`) bisa hilang diam-diam kalau tiba sebelum `playerService`/`playlistService` siap saat boot | `agent/src/network/SocketClient.ts` (buffer `pendingPlayerRestore`/`pendingPlaylistRestore`, flush di `setPlayerService`/`setPlaylistService`) | tsc clean |
| D2 | 🟡 | `pauseStateSync` bisa macet permanen kalau event reaktivasi hilang | `agent/src/core/Agent.ts` (watchdog auto-resume 15 detik, `checkPauseWatchdog()`) | tsc clean |
| D3 | 🟡 | `expiresAt` tidak pernah ditegakkan lokal — agent bisa terus main lewat waktu habis kalau event deactivate hilang | `agent/src/core/Agent.ts` (`checkExpiryWatchdog()`, self-deactivate) | tsc clean |
| D4 | 🟢 | Command yang gagal cuma di-log lokal, tidak dilaporkan ke server | `agent/src/network/SocketClient.ts` (`sendError({type:"COMMAND_ERROR"})`) | tsc clean |
| D5 | 🟢 | Fallback "last-healthy snapshot" tidak dibatasi waktu — bisa kirim data basi tak terbatas ke server saat player macet lama | `agent/src/services/PlayerService.ts` (`HEALTHY_SNAPSHOT_MAX_AGE_MS=5000`) | tsc clean |

**Verifikasi menyeluruh batch ini**: cashier (`tsc -b` clean, `vite build` OK, **18/18 test** — komposisi berubah: `MultiSocketService.test.ts` 13 + `roomStatus.test.ts` 5, `useTransactionStore.test.ts` sudah tidak ada karena store-nya dihapus), web (`tsc` clean, `vite build` + PWA generation OK), agent (`tsc` clean). Tidak ada perubahan di `server/` pada batch ini — root cause B1/B2/C*/D* semua di sisi client, dikonfirmasi lewat pembacaan kode `server/src/socket/SocketServer.ts` sebelum menyimpulkan lokasi fix.

### 9.4 Penghapusan Zustand di `web/` (konsistensi arsitektur dengan `cashier/`, 2026-08-11)

Diminta eksplisit oleh user demi konsistensi antar frontend — bukan karena ditemukan bug (audit sebelum migrasi memang tidak menemukan bug data-divergence di store `web/`: tidak ada `persist`, tidak ada localStorage, tiap push server sudah meng-replace state dengan bersih). Rekomendasi awal adalah *tidak perlu*, tapi user tetap minta dikerjakan.

Audit konsumen (17 file yang import `useAppStore`) sebelum migrasi menyimpulkan store itu sebenarnya menyimpan 3 jenis state berbeda yang butuh perlakuan arsitektur berbeda — desain akhirnya **meniru struktur akhir `cashier/` yang sebenarnya** (bukan "semua ke Context"): `multiSocketService` di cashier memiliki `agents`+`transactions` sebagai singleton biasa; `RoomConfigContext`/`LoadingContext` menangani state UI/config lokal. Di `web/`: `AppStateService` (baru) memiliki `agent`/`player`/`playlist`; `LoadingContext` (baru) menangani `processing`/`globalLoading`/`initialLoading`/`removingItemId`/`addingToPlaylist`. Detail lengkap di §4.3.7.

| # | Perubahan | File | Verifikasi |
|---|---|---|---|
| 1 | `agent`/`player`/`playlist`: singleton + pub/sub, bukan Context — 2 dari 3 penulisnya (`PlayerStateListener`, `registerPlaylistListener`) adalah listener level-modul yang jalan sebelum React render, Context tidak punya jalur tulis imperatif untuk kasus itu | Baru: `web/src/services/AppStateService.ts`, `web/src/hooks/useAppState.ts`. Diubah: `PlayerStateListener.ts`, `PlaylistListener.ts`, `hooks/useAgent.ts` | tsc + vite build OK |
| 2 | `processing`/loading cluster: React Context, coupling `setProcessing`→`globalLoading` dan `setAddingToPlaylist`→`globalLoading` dipertahankan persis dalam 1 file | Baru: `web/src/context/LoadingContext.tsx`. Diubah: `App.tsx` (mount provider) | tsc + vite build OK |
| 3 | `SocketService.ts` tidak lagi menulis state secara imperatif (`getState().setInitialLoading`) — sekarang expose `onConnect()` pub/sub, `LoadingProvider` yang subscribe | `web/src/services/socket/SocketService.ts` | tsc + vite build OK |
| 4 | Semua ~13 komponen konsumen (`AgentOfflineOverlay`, `SettingsPage`, `BillingStatus`, `CurrentVideo`, `ProgressBar`, `PlayerControls`, `HomePage`, `PlaylistToolbar`, `PlaylistPanel`, `SearchResultCard`, `SearchPage`, `MenuLink`, `MainLayout`) pindah dari `useAppStore()` ke `useAgentState()`/`usePlayerState()`/`usePlaylistState()`/`useLoading()` | Lihat daftar di atas | tsc + vite build OK |
| 5 | `search`/`setSearch` (dead code, dikonfirmasi lewat audit — `SearchPage` sudah punya `useState` lokal) tidak diportir | `store/appStore.ts` (dihapus) | — |
| 6 | Dependency `zustand` dihapus | `web/package.json` | `npm run build` OK |

**Catatan environment (bukan bagian dari perubahan kode)**: saat verifikasi, `web/node_modules` dan `package-lock.json` ternyata kosong/hilang (bukan akibat perubahan sesi ini — tidak ada operasi yang menyentuh `node_modules` sebelum ditemukan kosong). Dijalankan `npm install` ulang untuk memulihkan sebelum build/lint bisa diverifikasi.

**Verifikasi**: `tsc -b && vite build` bersih (PWA generation OK), `npm run lint` — 5 error tersisa, semua dikonfirmasi pre-existing dan tidak berkaitan dengan file yang diubah (`public/sw.js` parsing error, `PlayerControls.tsx` unused assignment, `ProgressBar.tsx`/`VolumeSlider.tsx` set-state-in-effect, `useAgent.ts` implicit any) — 1 error baru yang sempat muncul dari file baru `LoadingContext.tsx` (`react-refresh/only-export-components`, karena file itu export Provider component + hook `useLoading` sekaligus — pola standar React Context, sama seperti punya cashier tapi cashier tidak punya eslint jadi tidak pernah ketahuan) sudah di-suppress dengan komentar inline. `web/` tidak dites end-to-end di browser sungguhan dengan agent/server aktif (butuh koneksi socket nyata, tidak tersedia di environment ini) — cakupan sejauh ini dari typecheck + build + review kode manual terhadap pola yang sudah tervalidasi di `cashier/`.

### 9.5 Regresi ditemukan user: `web/` stuck di "Loading..." (2026-08-11)

Persis celah yang sudah diperingatkan di catatan verifikasi §9.4 ("tidak dites end-to-end di browser sungguhan") — begitu user coba pakai aplikasinya beneran, layar loading tidak pernah hilang. Fix pertama (di bawah, "percobaan 1") ternyata belum cukup — user re-test dan masih sama. Root cause sebenarnya lebih dalam, ditemukan di percobaan 2.

**Percobaan 1 (tidak cukup)**: `SocketService.onConnect(cb)` (baru, dibuat di §9.4 sebagai pengganti jalur tulis imperatif `useAppStore.getState().setInitialLoading()`) awalnya cuma push `cb` ke antrian `connectCallbacks`, **tanpa** cek apakah socket sudah connect duluan — beda dengan `on()` (§9.3-C1) yang sudah benar dari awal. Sudah ditambahkan pengecekan `this.socket?.connected` supaya callback dipanggil langsung kalau socket sudah connect. Fix ini **benar secara logika tapi tidak menyelesaikan masalah**, karena ternyata `LoadingContext.tsx` subscribe ke instance `SocketService` yang **berbeda** dari yang di-`.connect()` oleh `main.tsx` — lihat percobaan 2.

**Percobaan 2 (root cause sebenarnya)**: ada **dua instance singleton `SocketService` yang hidup berdampingan**, bukan satu:
- `web/src/services/socket/SocketService.ts` (file class) sejak awal punya `export const socketService = new SocketService()` sendiri di baris terakhir file.
- `web/src/services/socket/index.ts` (barrel) **juga** melakukan `import { SocketService } from "./SocketService"; export const socketService = new SocketService();` — instance kedua yang independen.

`main.tsx` (dan sebagian besar file lain) import `socketService` lewat barrel (`"./services/socket"` atau `"../services"`) → dapat instance #2, yang **memang** di-`.connect()`. Tapi `LoadingContext.tsx` (dibuat di §9.4) import langsung `from "../services/socket/SocketService"` → dapat instance #1, yang **tidak pernah** di-`.connect()` oleh siapapun — `onConnect()`-nya (setelah fix percobaan 1 sekalipun) subscribe ke socket yang memang tidak akan pernah connect.

Lebih parah lagi: ini **bukan bug baru dari sesi ini**. `web/src/services/socket/PlaylistListener.ts` (`registerPlaylistListener`, dipanggil sekali di `main.tsx` saat boot) ternyata **sudah lama** kena masalah yang sama persis — import `socketService` langsung `from "./SocketService"`, bukan lewat barrel. Sebelum sesi ini, aplikasi tetap "kelihatan jalan" untuk update playlist karena `usePlaylist.ts` (hook per-halaman, sudah dihapus di §9.3-C2 karena dikira "100% redundan") kebetulan import lewat barrel (jalur yang benar) — jadi dialah yang sebenarnya melakukan pekerjaan nyata, bukan `registerPlaylistListener`. Klaim di §9.3-C2 bahwa `usePlaylist.ts` "100% redundan" **tidak akurat** pada saat itu — baru jadi benar-benar redundan **setelah** fix di bawah ini membuat `registerPlaylistListener` akhirnya berfungsi seperti seharusnya.

**Fix**: `SocketService.ts` sekarang jadi **satu-satunya** tempat instance singleton dikonstruksi. `services/socket/index.ts` diubah jadi murni barrel re-export (`export * from "./SocketService"; export * from "./PlaylistListener";`), tidak lagi bikin instance sendiri. Ditambahkan komentar eksplisit di `SocketService.ts` melarang siapapun menambahkan `new SocketService()` kedua lagi di file lain. Tidak ada perubahan pada `LoadingContext.tsx`/`PlaylistListener.ts` selain import path-nya kini otomatis benar (karena cuma ada satu instance untuk di-import, dari path manapun).

**Verifikasi**: `tsc -b && vite build` bersih, `npm run lint` — 5 error, semua pre-existing (sama seperti §9.4, tidak ada tambahan baru), dev server jalan tanpa warning circular-import (import siklik `index.ts` ⇄ `PlaylistListener.ts` sempat jadi pertimbangan desain — dihindari dengan menjadikan `SocketService.ts` module leaf yang tidak bergantung ke `index.ts`, bukan sebaliknya). `web/node_modules`/`package-lock.json` kosong lagi saat verifikasi (ketiga kalinya dalam sesi ini) — sepertinya environment ini me-reset `node_modules` antar pemanggilan tool, bukan efek perubahan kode; `npm install` ulang memulihkannya tiap kali.

### 9.6 Bug dilaporkan user: Extend Time bikin tampilan agent balik ke `start_image.jpeg` (2026-08-11)

Dilaporkan user: klik "Extend Time" di cashier untuk ruangan yang sedang aktif memutar video, tampilan di agent malah pindah ke gambar `start_image.jpeg` — seharusnya video yang sedang berjalan tidak terganggu sama sekali.

**Root cause, di dua sisi (lihat detail kode di §4.1.4 dan §4.2.2):**
- **Server** (`CASHIER_EXTEND_TIME` handler, `server/src/socket/SocketServer.ts`) mengirim `agent:activation{isActive:true, expiresAt:newExpiresAt}` ke agent setiap kali extend time — event yang **identik** dengan event reaktivasi genuine, tanpa penanda pembeda "cuma extend" vs "baru diaktifkan".
- **Agent** (`setupActivationListener`, `agent/src/network/SocketClient.ts`) tidak pernah menyimpan status aktif sebelumnya sebelum menimpanya dengan yang baru — begitu terima `isActive:true` apapun konteksnya, langsung anggap "reaktivasi" dan panggil `playerService.showStartImage()`, yang melakukan `page.goto('file://.../start_image.html')` — full navigation menjauhkan browser dari video yang sedang diputar.

**Fix**: `SocketClient.ts` sekarang menangkap `wasActive = this.identity.isActive` **sebelum** overwrite, lalu efek reaktivasi (`resumeStateSync()` + `showStartImage()`) cuma jalan kalau `data.isActive && !wasActive` (transisi genuine tidak-aktif→aktif). Kalau `data.isActive && wasActive` (room sudah aktif, cuma di-extend), hanya `identity.expiresAt`/data lain yang ter-update — display/player tidak disentuh. Server sengaja tidak diubah — perbaikan di satu titik (agent) lebih aman daripada menambah event/field baru yang harus disebar ke banyak jalur pemanggil di server.

**Verifikasi**: `tsc` (agent) bersih. Tidak dites end-to-end dengan browser/YouTube sungguhan (butuh Playwright + koneksi nyata, tidak tersedia di environment ini) — cakupan dari review kode + typecheck saja.

### 9.7 Pemindahan `pricePerHour` dari `cashier/.env` ke `server/.env` tiap ruangan (2026-08-11)

Diminta user: tarif per jam (`pricePerHour`) sebelumnya diisi manual per-entry di `VITE_ROOMS` (`cashier/.env`), dengan default `?? 50000` **terduplikasi** di 3 lokasi kode berbeda (`RoomConfigContext.tsx`, `MultiSocketService.ts` x3, `RoomCard.tsx`) — lihat catatan lama di §3.4. Dipindah supaya tiap PC ruangan jadi sumber kebenaran tarifnya sendiri, konsisten dengan topologi "1 Ruangan = 1 PC berdiri sendiri" (§1.1) dan pola env var `BILLING_ENABLED` yang sudah lebih dulu per-PC ruangan.

**Perubahan server (`server/`):**
- Env baru `PRICE_PER_HOUR` (§3.2), dibaca `index.ts` (`Number(...)`, fallback `50000`), diteruskan `ServiceContainer` → `SocketServer`.
- `AgentInfo.pricePerHour: number` (`server/src/types/Agent.ts`) — field baru, di-set saat `AGENT_REGISTER` (`SocketServer.ts`) dari `this.pricePerHour` (nilai env, sama untuk semua agent karena 1 PC = 1 ruangan). Otomatis ikut ter-broadcast lewat `agents:update`/`agents:list` (`registry.getAll()`) karena itu full clone `AgentInfo` — **tidak perlu** ubah payload `room:activation` (§4.1.2) yang memang sengaja payload tersendiri (curated), bukan `AgentInfo` penuh.

**Perubahan cashier (`cashier/`):**
- `RoomConfig` (`types/index.ts`) tidak lagi punya field `pricePerHour` — `VITE_ROOMS` sekarang cuma `{roomId, name, ip, port}`.
- `AgentInfo` (cashier, match tipe server) dapat field baru `pricePerHour?: number`.
- 3 titik baca harga di `MultiSocketService.ts` (fallback saat belum ada agent, kalkulasi transaksi di listener `room:activation`, `agentToBilling()`) semuanya baca dari `agent.pricePerHour ?? 50000` — bukan lagi `config.pricePerHour ?? 50000`. `RoomCard.tsx` disederhanakan jadi `roomBilling.pricePerHour ?? 50000` langsung, `useRoomConfig()` **dihapus** dari file itu (satu-satunya pemakaiannya di situ memang untuk baca harga).
- Formula kalkulasi (`Math.ceil(durationSeconds/3600) * pricePerHour`, per-blok/jam minimum 1 jam) **tidak berubah** dan **tetap di cashier** — hanya sumber angka tarifnya yang pindah. Server tetap tidak menghitung `totalPrice` (§4.1.6).

**E2E test helper (`scripts/e2e/`)**: `test-client.ts` (simulasi cashier) dan `spawn-server.ts` diupdate senada — `spawn-server.ts` sekarang bisa terima opsi `pricePerHour` (env `PRICE_PER_HOUR` ke proses server nyata yang di-spawn), `test-client.ts` baca `agent?.pricePerHour ?? 50000` alih-alih `config.pricePerHour`.

**Verifikasi**: `tsc --noEmit` bersih di `server/` dan `cashier/` (termasuk `noUnusedLocals`/`noUnusedParameters` strict cashier). Unit test: `server` 20/20 lulus (`AgentRegistry.test.ts`), `cashier` 18/18 lulus (termasuk `MultiSocketService.test.ts` setelah fixture `makeConfig()` disesuaikan). Tidak dites end-to-end lewat UI browser sungguhan di sesi ini.

---

## 10. Unit Test & E2E Test Setup

Seluruh infrastruktur testing (unit test vitest di `server`/`cashier`, E2E test di `scripts/e2e/`, config `vitest.config.ts`, script `npm test`/`test:e2e`, dan dependency terkait) telah **dihapus dari project** atas permintaan pemilik project (2026-08-12). Bagian ini disisakan sebagai catatan historis bahwa setup tersebut pernah ada — lihat git history sebelum tanggal tersebut untuk detail implementasinya.

---

## 11. Acceptance Criteria (Konsolidasi & Diperbarui)

- [ ] Tiap PC ruangan bisa auto-start `agent + server + web` via systemd.
- [ ] PC Kasir bisa konek ke 1+ server ruangan tanpa crash.
- [ ] Activate dari Kasir → agent di ruangan yang sama terima `agent:activation` < 1 detik.
- [ ] Deactivate dari Kasir → transaksi auto-created dengan harga yang benar (per jam, ceil, berdasar durasi **yang dibeli** bukan waktu aktual terpakai — lihat §4.4.6).
- [ ] Auto-expiry bekerja (kalau `durationMinutes` diset) → deactivate + clear player di agent.
- [ ] Timer countdown di Cashier sinkron dengan `expiresAt` server.
- [ ] Perpanjangan waktu dari Kasir → `expiresAt` update di server + agent.
- [x] Transaksi dari tiap ruangan muncul di Transaction page per-ruangan (Fix A terverifikasi); halaman global `TransactionsPage`/`/transactions` sudah dihapus agar cashier tetap single page.
- [ ] Status ruangan (OFFLINE, AKTIF, UNPAID, BERSIHKAN, SUDAH DIBERSIHKAN, ONLINE) tampil sesuai kondisi — perhatikan "PAID" bukan status UI terpisah (§7).
- [ ] Move Room (pindah ruangan) preserve customer info + sisa waktu **aktual** (bukan durasi asli).
- [ ] `BILLING_ENABLED=false` → agent auto-aktif tanpa tunggu kasir.
- [x] Agent yang stop-heartbeat (proses hang, socket masih terbuka) terdeteksi OFFLINE oleh cashier — fixed di §9.2 #1.

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
- DI: `server/src/container/ServiceContainer.ts` (`AppContainer.ts` sudah dihapus, lihat §9.2 #10)
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
- Entry: `web/src/main.tsx`, `App.tsx` (mount `LoadingProvider`, §9.4), `routes/AppRouter.tsx`, `layouts/MainLayout.tsx`
- Socket: `web/src/services/socket/SocketService.ts` (`on()` kembalikan unsubscribe per-listener sejak §9.3-C1; `onConnect()` pub/sub baru §9.4), `services/socket/PlaylistListener.ts`, `services/player/PlayerStateListener.ts` — ketiganya sekarang menulis ke `appStateService`, bukan store manapun.
- Player: `web/src/services/player/PlayerCommandService.ts`, `features/player/components/*`
- Search: `web/src/services/search/SearchService.ts`, `pages/SearchPage.tsx`
- State (§9.4, Zustand dihapus): `web/src/services/AppStateService.ts` (baru — pemilik `agent`/`player`/`playlist`, singleton bukan React), `hooks/useAppState.ts` (baru — `useAgentState()`/`usePlayerState()`/`usePlaylistState()`), `context/LoadingContext.tsx` (baru — `processing`/`globalLoading`/`initialLoading`/`removingItemId`/`addingToPlaylist`). `store/appStore.ts` (Zustand) **dihapus total** beserta direktori `store/`.
- PWA: `web/public/manifest.json`, `web/public/sw.js`, `web/vite.config.ts`
- Dihapus (§9.3-C2): `hooks/usePlayer.ts`, `hooks/usePlaylist.ts` — redundan dengan `PlayerStateListener`/`registerPlaylistListener`.

**Cashier**
- Entry: `cashier/src/App.tsx`, `pages/DashboardPage.tsx`, `layouts/CashierLayout.tsx`
- Socket: `cashier/src/services/MultiSocketService.ts` — satu-satunya, sekarang juga pemilik data `transactions` per-koneksi (§4.4.2/§9.3-A). `SocketService.ts` legacy sudah dihapus dari sesi audit sebelumnya (§9.2 #10).
- State: `cashier/src/context/RoomConfigContext.tsx`, `context/LoadingContext.tsx` (§9.3-A) — pengganti `store/useRoomStore.ts`/`useTransactionStore.ts` yang sudah **dihapus total** beserta seluruh direktori `store/`.
- UI: `cashier/src/components/RoomCard.tsx`, `MoveRoomModal.tsx`, `TransactionModal.tsx`, `PaymentConfirmModal.tsx`, `PrintReceipt.tsx`
- Util: `cashier/src/utils/roomStatus.ts` (+ `.test.ts` baru, §9.3-B2) — state machine status ruangan, dipakai `RoomCard`/`MoveRoomModal`.
