# Video Controller

Sistem manajemen playlist video real-time dengan integrasi YouTube untuk karaoke. Terdiri dari web frontend, Node.js server, dan agent. Kontrol pemutaran video dari jarak jauh dan kelola playlist bersama.

## Fitur

- **Manajemen Playlist Real-time** - Tambah, hapus, dan urutkan video dalam playlist bersama
- **Kontrol Pemutaran Jarak Jauh** - Play, pause, skip, dan atur volume dari client manapun
- **Integrasi YouTube** - Mainkan video YouTube dengan kontrol penuh via DOM
- **Multi-client Support** - Multiple web clients dapat terhubung bersamaan via Socket.IO
- **Monitoring Kesehatan** - Health check otomatis untuk browser, player, dan network
- **Auto-recovery** - Sistem recovery cerdas untuk menangani failure scenarios
- **Billing Otomatis** - Perhitungan biaya berdasarkan durasi dan tarif per ruangan
- **Paket Harga Tetap** - Opsional per ruangan (mis. "Paket 2 Jam"), kelebihan waktu tetap ditagih per jam di atas harga paket
- **Multi-room** - Kelola multiple ruangan karaoke secara bersamaan
- **Status Ruangan** - Monitoring real-time status ruangan (OFFLINE, AKTIF, UNPAID, BERSIHKAN, SUDAH DIBERSIHKAN, ONLINE)
- **Pindah Ruangan** - Pindahkan billing customer ke ruangan lain saat ingin pindah kamar
- **Full Page Loading** - Feedback visual untuk setiap proses operasi

## Arsitektur

**Topologi: 1 Ruangan = 1 PC terisolasi**

Setiap PC ruangan adalah unit self-contained yang menjalankan **Agent + Server + Web** sebagai satu bundle. PC Kasir terpisah, hanya menjalankan **Cashier** dan konek ke setiap server ruangan via jaringan.

```
┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
│   PC Ruangan 1               │  │   PC Ruangan 2               │  │   PC Ruangan 3               │
│                              │  │                              │  │                              │
│   ┌───────────────────────┐  │  │   ┌───────────────────────┐  │  │   ┌───────────────────────┐  │
│   │ Agent (Room 1)        │  │  │   │ Agent (Room 2)        │  │  │   │ Agent (Room 3)        │  │
│   │ + Browser YouTube     │  │  │   │ + Browser YouTube     │  │  │   │ + Browser YouTube     │  │
│   └──────────┬────────────┘  │  │   └──────────┬────────────┘  │  │   └──────────┬────────────┘  │
│              │ socket.io     │  │              │ socket.io     │  │              │ socket.io     │
│   ┌──────────▼────────────┐  │  │   ┌──────────▼────────────┐  │  │   ┌──────────▼────────────┐  │
│   │ Server (Room 1)       │  │  │   │ Server (Room 2)       │  │  │   │ Server (Room 3)       │  │
│   │ :53331                │  │  │   │ :53331                │  │  │   │ :53331                │  │
│   └───────────────────────┘  │  │   └───────────────────────┘  │  │   └───────────────────────┘  │
│   ┌───────────────────────┐  │  │   ┌───────────────────────┐  │  │   ┌───────────────────────┐  │
│   │ Web (Room 1)          │  │  │   │ Web (Room 2)          │  │  │   │ Web (Room 3)          │  │
│   │ Halaman kontrol video │  │  │   │ Halaman kontrol video │  │  │   │ Halaman kontrol video │  │
│   └───────────────────────┘  │  │   └───────────────────────┘  │  │   └───────────────────────┘  │
│                              │  │                              │  │                              │
│   ROOM_ID=room-001           │  │   ROOM_ID=room-002           │  │   ROOM_ID=room-003           │
└──────────────┬───────────────┘  └──────────────┬───────────────┘  └──────────────┬───────────────┘
               │                                  │                                  │
               │ Socket.IO                        │ Socket.IO                        │ Socket.IO
               │ (port 53331)                     │ (port 53331)                     │ (port 53331)
               │                                  │                                  │
               └──────────────────────────────────┼──────────────────────────────────┘
                                                  │
                                                  ▼
                              ┌───────────────────────────────────────┐
                              │  PC Kasir                             │
                              │                                       │
                              │  ┌─────────────────────────────────┐  │
                              │  │ Cashier (:53334)                 │  │
                              │  │ Halaman billing & monitoring     │  │
                              │  │ VITE_ROOMS = 3 entries           │  │
                              │  │ - ip tiap ruangan, port 53331   │  │
                              │  └─────────────────────────────────┘  │
                              └───────────────────────────────────────┘
```

### Penjelasan Topologi

- **Tidak ada server pusat.** Tiap PC ruangan punya server-nya sendiri.
- **Cashier** konek ke **N server sekaligus** (1 socket per ruangan) lewat `MultiSocketService`.
- **Agent di setiap ruangan** hanya terdaftar di server PC-nya sendiri (tidak terlihat dari server lain).
- **Transaksi lokal per PC.** Transaksi billing hanya tersimpan di server ruangan masing-masing.

### Komponen

- **Agent** - Browser automation (Playwright) untuk kontrol video YouTube di tiap ruangan
- **Server** - Socket.IO + Express + SQLite per ruangan. Listen di port `53331`
- **Web** - React PWA frontend untuk kontrol video (mobile/tablet, opsional). Terinstall di tiap PC ruangan
- **Cashier** - React frontend untuk billing di PC Kasir. Port `53334` (dev) / `53335` (preview)

## Prerequisites

- Node.js 18+
- npm atau yarn
- Google Chrome/Chromium (untuk Playwright)

## Installation

```bash
# Install dependencies untuk semua packages
cd agent && npm install
cd ../server && npm install
cd ../web && npm install
cd ../cashier && npm install
```

## Konfigurasi

Setiap komponen memiliki file `.env` sendiri:

| File | Komponen | Deskripsi |
|------|----------|-----------|
| `server/.env` | Server | PORT, YOUTUBE_API_KEY, BILLING_ENABLED, PRICE_PER_HOUR, PACKAGES (opsional) |
| `agent/.env` | Agent | ROOM_ID, ROOM_NAME, BILLING_ENABLED, SERVER_IP/SERVER_PORT, Browser options |
| `web/.env` | Web | VITE_SERVER_IP, VITE_SERVER_PORT, VITE_BILLING_ENABLED |
| `cashier/.env` | Cashier | VITE_ROOMS, VITE_BILLING_ENABLED |

### Room ID Matching

Server **tidak** melakukan fuzzy matching. `AgentRegistry` menyimpan agent dengan key = `roomId` (exact match). `agent.id` disimpan sebagai secondary index untuk lookup fallback (mis. dari REST `/api/command`), tapi ini bukan fuzzy match berdasarkan nama.

Karena itu, `roomId` di `agent/.env` (`ROOM_ID`) **harus identik** dengan `roomId` pada entry `VITE_ROOMS` di `cashier/.env` yang menunjuk ke PC ruangan tersebut - tidak ada toleransi penulisan berbeda.

Contoh konfigurasi:
```bash
# Agent (.env, PC Ruangan 1)
ROOM_ID=room-001
ROOM_NAME=Room 1
SERVER_IP=192.168.1.10
SERVER_PORT=53331

# Server (.env, PC ruangan yang sama)
PRICE_PER_HOUR=50000
# Opsional - daftar paket harga tetap untuk ruangan ini
PACKAGES=[{"id":"p2j","name":"Paket 2 Jam","durationMinutes":120,"price":150000}]

# Cashier (.env, PC Kasir)
VITE_ROOMS=[{"roomId":"room-001","name":"Room 1","ip":"192.168.1.10","port":53331}]
```

## Development

Jalankan setiap service di terminal terpisah:

```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start agent (ulang untuk setiap ruangan)
cd agent
npm run dev

# Terminal 3 - Start web frontend
cd web
npm run dev

# Terminal 4 - Start cashier app
cd cashier
npm run dev
```

Services akan tersedia di:
- **Server API**: http://localhost:53331
- **Web UI**: http://localhost:53332
- **Cashier UI**: http://localhost:53334

## Cara Menjalankan (Production)

```bash
# Build semua packages
cd agent && npm run build
cd ../server && npm run build
cd ../web && npm run build
cd ../cashier && npm run build

# Start services
cd server && npm start
cd agent && npm start  # untuk setiap ruangan
```

## Docker Deployment

Alternatif untuk build+run native. Setiap service (`agent`, `server`, `web`, `cashier`) punya `Dockerfile` sendiri, dan `install.sh` / `install.ps1` punya mode `docker-*` bawaan yang menjalankannya (prompt konfigurasi `.env`-nya sama seperti mode native).

**Catatan penting soal agent:** agent membuka browser Chrome/Chromium yang benar-benar tampil di layar PC ruangan (`BROWSER_HEADLESS=false`) - bukan service headless biasa. Ini cuma bisa jalan di Docker pada **Linux** (lewat X11 socket passthrough ke display host). Di **Windows**, tidak ada padanan X11-nya, jadi agent tetap harus native lewat `install.ps1` (mode `room`/`autostart-room`); `server` dan `web` tetap bisa di-Docker-kan di Windows karena keduanya headless.

### Lewat install script (disarankan)

```bash
# Linux - Room App (server+agent+web)
./install.sh docker-room

# Linux/Windows - Kasir saja
./install.sh docker-kasir        # atau: .\install.ps1 -Mode docker-kasir

# Room App + Kasir sekaligus
./install.sh docker-all          # atau: .\install.ps1 -Mode docker-all

# Stop semua service Docker yang lagi jalan
./install.sh docker-down         # atau: .\install.ps1 -Mode docker-down
```

Atau jalankan `install.sh`/`install.ps1` tanpa argumen dan pilih menu `[G]`-`[J]`. Di Windows, mode `docker-room`/`docker-all` cuma menjalankan `server`+`web` lewat Docker (agent tetap native) - script akan cetak pengingat ini di layar.

### Lewat docker compose langsung

```bash
# Sekali saja per sesi X di Linux (izinkan container gambar ke display host)
xhost +si:localuser:$(whoami)

# Isi agent/.env, server/.env, web/.env dulu (lihat bagian Konfigurasi di atas)
docker compose up -d --build              # Room App (server+agent+web), Linux
docker compose up -d --build server web   # Room App headless-only, Windows
docker compose -f docker-compose.cashier.yml up -d --build   # Kasir
```

### Catatan

- `web`/`cashier` adalah Vite app - variabel `VITE_*` di-*bake* ke bundle JS saat build image. Ubah `.env` lalu **rebuild** (`docker compose up -d --build`), restart container saja tidak cukup.
- `server`/`agent` baca `.env` langsung lewat `env_file:` - ubah `.env` lalu restart container sudah cukup, tidak perlu rebuild.
- Data persisten (`server/data/database.sqlite`, profil browser agent yang menyimpan sesi login YouTube) disimpan di named volume Docker, aman lintas `docker compose up`/`down` (bukan `down -v`).
- Untuk mengganti `SERVER_IP` yang dipakai agent menghubungi server, override sudah otomatis diarahkan ke nama service Docker (`server`) di `docker-compose.yml` - field `SERVER_IP` di `agent/.env` sendiri tetap dipakai apa adanya oleh `web`/`cashier` karena mereka diakses dari luar jaringan Docker (LAN).

## Socket Events

Protokol real-time selengkapnya ada di `server/src/socket/SocketEvents.ts` dan `server/src/socket/SocketServer.ts`. Ringkasan event yang benar-benar aktif:

### Agent ↔ Server

| Event | Arah | Payload | Deskripsi |
|-------|------|---------|-----------|
| `agent:register` | Agent → Server | `AgentInfo` (id, roomId, roomName, ...) | Agent register saat connect |
| `agent:heartbeat` | Agent → Server | `{ id }` | Heartbeat periodik dari agent |
| `player:state` | Agent → Server | `AgentSnapshot` | Push state player terbaru |
| `playlist:state` | Agent → Server | `PlaylistSnapshot` | Push state playlist terbaru |
| `agent:error` | Agent ↔ Server | `{ agentId, roomId, type, message, ... }` | Agent lapor error; server simpan + broadcast ulang |
| `command` | Server → Agent | `CommandPayload` | Perintah yang dieksekusi agent |
| `agent:activation` | Server → Agent | `{ isActive, expiresAt?, ... }` | Server memberi tahu agent statusnya aktif/nonaktif |
| `agent:clear-data` | Server → Agent | `{}` | Server minta agent kosongkan player/playlist |

### Cashier/Web ↔ Server

| Event | Arah | Payload | Deskripsi |
|-------|------|---------|-----------|
| `agents:update` | Server → Client | `AgentInfo[]` | Broadcast semua agent state (juga dikirim saat client baru connect) |
| `client:request-state` | Web → Server | - | Web PWA minta ulang `agents:update` |
| `cashier:request-agents` | Cashier → Server | - | Cashier minta ulang `agents:update` |
| `player:command` | Web/Cashier → Server | `CommandPayload` | Kirim perintah kontrol video ke sebuah agent |
| `player:update` / `playlist:update` | Server → Client | `AgentSnapshot` / `PlaylistSnapshot` | Broadcast state player/playlist terbaru ke semua client |
| `cashier:activate-room` | Cashier → Server | `{ roomId, roomName, durationMinutes?, packageId?, customerName?, ... }` | Aktivasi ruangan (mulai sesi billing). `packageId` divalidasi server-side terhadap `PACKAGES`; kalau valid, durasi & harga paket menggantikan `durationMinutes` |
| `cashier:deactivate-room` | Cashier → Server | `{ roomId, reason? }` | Nonaktifkan ruangan (akhiri sesi, catat transaksi) |
| `cashier:extend-time` | Cashier → Server | `{ roomId, additionalMinutes }` | Perpanjang waktu sesi yang sedang aktif |
| `cashier:mark-room-cleaned` | Cashier → Server | `{ roomId }` | Tandai ruangan (hasil Move Room) sudah dibersihkan |
| `room:activation` | Server → Client | `{ roomId, isActive, expiresAt, ... }` | Broadcast perubahan status aktivasi ruangan |
| `room:expiry-warning` | Server → Client | `{ roomId, secondsRemaining, expiresAt }` | Peringatan sebelum sesi ruangan habis |
| `transaction:get` | Client ↔ Server | `Transaction[]` | Minta/terima daftar transaksi |
| `transaction:save` | Cashier → Server | `Transaction` | Update field pembayaran/customer pada transaksi (server menolak perubahan harga) |
| `transaction:delete` | Cashier → Server | `transactionId` | Hapus satu transaksi |
| `transaction:clear` | Cashier → Server | `{ roomId? }` | Hapus semua transaksi (atau per ruangan) |

## REST Endpoints

- `GET /health` - Health check lengkap (uptime, memory, daftar agent)
- `GET /health/live` - Liveness check sederhana
- `GET /health/ready` - Readiness check
- `GET /api/agents` - Get semua agent yang terdaftar di server ini
- `POST /api/command` - Kirim command ke agent (`{ agentId, command }`)
- `GET /api/search?keyword=query` - Search YouTube

## Struktur Project

```
video-controller/
├── agent/           # Agent (browser automation)
│   ├── src/
│   │   ├── browser/     # Playwright browser management
│   │   ├── commands/    # Command handlers
│   │   ├── config/      # Configuration
│   │   ├── core/        # Agent core logic
│   │   ├── health/      # Health check
│   │   ├── network/     # Socket client, local IP detection
│   │   ├── player/      # YouTube player control
│   │   ├── playlist/    # Playlist management
│   │   ├── recovery/    # Auto-recovery
│   │   ├── repositories/ # Local persistence (player/playlist)
│   │   ├── services/    # Services (incl. logging)
│   │   ├── socket/      # Socket.io event names
│   │   └── index.ts     # Entry point
│   ├── data/          # Browser profile
│   └── .env           # ROOM_ID, ROOM_NAME, SERVER_IP/SERVER_PORT, dll
├── server/          # Socket.io server
│   ├── src/
│   │   ├── bootstrap/    # Route registration
│   │   ├── container/    # DI container
│   │   ├── controllers/  # HTTP controllers
│   │   ├── routes/      # API routes
│   │   ├── services/    # Backend services
│   │   ├── socket/      # Socket.io handlers
│   │   ├── types/       # TypeScript types
│   │   ├── youtube/     # YouTube API helpers
│   │   └── index.ts     # Entry point
│   ├── data/           # SQLite database
│   └── .env            # PORT, YOUTUBE_API_KEY, PRICE_PER_HOUR, PACKAGES (opsional)
├── web/              # React PWA frontend (1 instance per PC ruangan, kontrol room-nya sendiri)
│   ├── src/
│   │   ├── context/     # React Context (loading state)
│   │   ├── features/    # Feature modules (player, playlist, search, agent)
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Page components
│   │   ├── shared/      # Shared components
│   │   └── services/    # Socket + API services (juga pemilik agent/player/playlist state)
│   └── .env            # VITE_SERVER_IP, VITE_SERVER_PORT, VITE_BILLING_ENABLED
├── cashier/          # React cashier frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── context/     # React Context (room config, loading state)
│   │   ├── pages/       # Pages
│   │   └── services/    # Socket service (juga pemilik data transaksi)
│   └── .env            # VITE_ROOMS, VITE_BILLING_ENABLED
├── install.sh          # Linux installation script
├── install.ps1        # Windows installation script
└── README.md
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, React Router (tidak pakai Zustand — `web/` dan `cashier/` sama-sama pakai React Context + service singleton, lihat PRD.md § State Management Frontend)
- **Server**: Express, Socket.io, SQLite (sql.js), Google APIs
- **Agent**: Playwright, Socket.io Client, Pino (logging), Zod

## Billing

Sistem billing menghitung biaya berdasarkan:
- `pricePerHour` - Tarif per jam ruangan (dari env `PRICE_PER_HOUR` di `server/.env` PC ruangan tsb)
- `activeTime` - Waktu aktif ruangan

Rumus (hourly, default):
```
biaya = (activeTime dalam jam, dibulatkan ke atas, minimum 1 jam) × pricePerHour
```

### Paket Harga Tetap (opsional)

Kalau ruangan punya `PACKAGES` terkonfigurasi (lihat env `PACKAGES` di `server/.env`), cashier bisa memilih paket saat aktivasi alih-alih mengisi durasi bebas. Durasi & harga paket **divalidasi dan disimpan di server**, tidak pernah dipercaya dari client. Kalau sesi diperpanjang melebihi durasi paket (via "Tambah Waktu"), kelebihannya ditagih per jam dengan `pricePerHour` normal ruangan tsb:

```
biaya = packagePrice + (kelebihan waktu dalam jam, dibulatkan ke atas) × pricePerHour
```

Paket tidak ikut pindah saat Move Room - ruangan tujuan default kembali ke billing hourly kecuali cashier memilih paket lagi secara eksplisit.

## Status Ruangan (Cashier)

Sistem cashier menampilkan status ruangan secara real-time:

| Status | Deskripsi |
|--------|-----------|
| OFFLINE | Ruangan tidak terhubung ke server |
| AKTIF | Ruangan sedang digunakan |
| UNPAID | Ada transaksi belum lunas (`paidAt === 0`) |
| BERSIHKAN | Sudah dibayar, dalam 30 menit pertama setelah `paidAt` |
| SUDAH DIBERSIHKAN | 30-60 menit setelah `paidAt`, atau transaksi sudah ditandai `cleanedAt` |
| ONLINE | Terhubung, tidak aktif, dan lebih dari 60 menit sejak `paidAt` |

Prioritas evaluasi status (lihat `cashier/src/utils/roomStatus.ts`): OFFLINE > AKTIF > UNPAID > BERSIHKAN/SUDAH DIBERSIHKAN > ONLINE. Tidak ada status `PAID` tersendiri - begitu lunas, ruangan langsung masuk fase BERSIHKAN.

### Transisi Status
- **UNPAID → BERSIHKAN**: Otomatis begitu `paidAt` terisi (pembayaran dikonfirmasi)
- **BERSIHKAN → SUDAH DIBERSIHKAN**: Otomatis 30 menit setelah `paidAt` (atau lebih cepat kalau ditandai manual)
- **SUDAH DIBERSIHKAN → ONLINE**: Otomatis 60 menit setelah `paidAt`
- Manual: Tombol "Sudah Bersih" pada transaksi (set `cleanedAt`) langsung memindahkan ke SUDAH DIBERSIHKAN

### Pemblokiran Aktivasi
Tombol aktivasi di kasir diblokir (dengan alert penjelasan) untuk dua status: **UNPAID** (ada transaksi belum lunas - harus dilunasi dulu di Riwayat Transaksi) dan **BERSIHKAN** (masih dalam proses pembersihan - tunggu sampai SUDAH DIBERSIHKAN). Ini pengecekan di sisi client (`cashier/src/components/RoomCard.tsx`), bukan penolakan dari server.

## Troubleshooting

### Agent tidak terhubung
- Pastikan server running di port yang dikonfigurasi
- Cek network/firewall settings
- Review agent logs untuk connection errors

### YouTube player tidak responsif
- Pastikan browser launched dengan permissions yang benar
- Cek YouTube page load dengan benar
- Verify player DOM selectors up to date

### Billing tidak berfungsi
- Pastikan `BILLING_ENABLED=true` di server dan cashier
- Cek `PRICE_PER_HOUR` di `server/.env` PC ruangan tsb
- Review server logs

### Room tidak terdeteksi
- Cek `ROOM_ID` di agent `.env` harus **persis sama** dengan `roomId` pada entry `VITE_ROOMS` di cashier `.env` (server hanya exact-match, bukan fuzzy)
- Cek `ip`/`port` entry `VITE_ROOMS` menunjuk ke PC ruangan yang benar
- Restart agent/server kalau baru mengubah `ROOM_ID`

## License

ISC
