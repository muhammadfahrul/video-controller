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
- **Multi-room** - Kelola multiple ruangan karaoke secara bersamaan
- **Status Ruangan** - Monitoring real-time status ruangan (OFFLINE, AKTIF, UNPAID, PAID, BERSIHKAN, SUDAH DIBERSIHKAN, ONLINE)
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
| `server/.env` | Server | PORT, YouTube API Key, Billing |
| `agent/.env` | Agent | ROOM_ID, ROOM_NAME, Browser options |
| `web/.env` | Web | SERVER_URL |
| `cashier/.env` | Cashier | Rooms config, harga per jam |

### Room ID Matching

Server mendukung fuzzy matching untuk room ID:
1. Coba `roomId` (exact match)
2. Coba `altRoomId` (jika ada)
3. Coba `roomName` (fuzzy match)

Contoh konfigurasi:
```bash
# Agent (.env)
ROOM_ID=room-002
ROOM_NAME=Room 2

# Server (.env, PC ruangan yang sama)
PRICE_PER_HOUR=50000

# Cashier (.env)
VITE_ROOMS=[{"name":"Room 1","ip":"192.168.1.10","port":53331}]
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
- **Web UI**: http://localhost:5173
- **Cashier UI**: http://localhost:5174

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

## Socket Events

### Client → Server

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `agent:register` | `{ roomId, roomName }` | Agent register ke server |
| `agent:heartbeat` | `{ roomId, status }` | Heartbeat dari agent |
| `agent:state` | `{ roomId, state }` | Update state agent |
| `command:execute` | `{ roomId, command, payload }` | Eksekusi perintah |

### Server → Client

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `agents:update` | `Agent[]` | Broadcast semua agent state |
| `command:result` | `{ success, result }` | Result dari perintah |
| `error` | `{ message }` | Error message |

## REST Endpoints

- `GET /health` - Health check
- `GET /api/rooms` - Get semua room
- `GET /api/rooms/:roomId` - Get room tertentu
- `GET /api/youtube/search?q=query` - Search YouTube
- `GET /api/youtube/video/:videoId` - Get video info

## Struktur Project

```
video-controller/
├── agent/           # Agent (browser automation)
│   ├── src/
│   │   ├── browser/    # Playwright browser management
│   │   ├── commands/   # Command handlers
│   │   ├── config/     # Configuration
│   │   ├── health/     # Health check
│   │   ├── player/     # YouTube player control
│   │   ├── playlist/   # Playlist management
│   │   ├── socket/     # Socket.io client
│   │   └── index.ts    # Entry point
│   ├── data/          # Browser profile
│   └── .env           # ROOM_ID, ROOM_NAME, dll
├── server/          # Socket.io server
│   ├── src/
│   │   ├── controllers/  # HTTP controllers
│   │   ├── routes/      # API routes
│   │   ├── services/    # Backend services
│   │   ├── socket/      # Socket.io handlers
│   │   ├── youtube/     # YouTube API helpers
│   │   └── index.ts     # Entry point
│   ├── data/           # SQLite database
│   └── .env            # PORT, YOUTUBE_API_KEY
├── web/              # React PWA frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # React Context (loading state)
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Page components
│   │   └── services/    # API services (juga pemilik agent/player/playlist state)
│   └── .env            # SERVER_URL
├── cashier/          # React cashier frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── context/     # React Context (room config, loading state)
│   │   ├── pages/       # Pages
│   │   └── services/    # Socket service (juga pemilik data transaksi)
│   └── .env            # VITE_ROOMS, BILLING_ENABLED
├── install.sh          # Linux installation script
├── install.ps1        # Windows installation script
└── README.md
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, React Router (tidak pakai Zustand — `web/` dan `cashier/` sama-sama pakai React Context + service singleton, lihat PRD §9.3/§9.4)
- **Server**: Express, Socket.io, SQLite (sql.js), Google APIs
- **Agent**: Playwright, Socket.io Client, Pino (logging), Zod

## Billing

Sistem billing menghitung biaya berdasarkan:
- `pricePerHour` - Tarif per jam ruangan (dari env `PRICE_PER_HOUR` di `server/.env` PC ruangan tsb)
- `activeTime` - Waktu aktif ruangan

Rumus:
```
biaya = (activeTime dalam jam) × pricePerHour
```

## Status Ruangan (Cashier)

Sistem cashier menampilkan status ruangan secara real-time:

| Status | Deskripsi |
|--------|-----------|
| OFFLINE | Ruangan tidak terhubung ke server |
| AKTIF | Ruangan sedang digunakan |
| UNPAID | Transaksi belum lunas |
| PAID | Transaksi lunas, fase pembersihan belum dimulai |
| BERSIHKAN | Fase pembersihan (3 menit setelah payment) |
| SUDAH DIBERSIHKAN | Pembersihan selesai, siap digunakan |
| ONLINE | Terhubung tapi tidak aktif |

### Transisi Status
- **PAID → BERSIHKAN**: Otomatis 3 menit setelah payment
- **BERSIHKAN → SUDAH DIBERSIHKAN**: Otomatis 1 menit kemudian
- **SUDAH DIBERSIHKAN → ONLINE**: Siap diaktifkan kembali
- Manual: Tombol "Sudah Bersih" untuk加速 pembersihan

### Pemblokiran Aktivasi
Ruangan dengan status BERSIHKAN tidak dapat diaktifkan sampai status berubah ke SUDAH DIBERSIHKAN.

## Testing

Project ini punya 2 lapis test:

### Unit Tests (vitest)
- **Server**: `cd server && npm test` → 20 tests untuk `AgentRegistry`
- **Cashier**: `cd cashier && npm test` → 18 tests untuk transaction store & MultiSocketService
- Total: **38 unit tests**

### E2E Tests
Mensimulasikan topologi 3 ruangan di 3 PC berbeda, dijalankan di 1 host:

```bash
./scripts/e2e/run-test.sh
# atau
NODE_BIN=/path/to/node ./scripts/e2e/run-test.sh
```

E2E test akan:
1. Spawn 3 servers di port 53331, 53332, 53333 (isolated SQLite DB per server)
2. Spawn 3 mock agents (register + heartbeat)
3. Buat cashier-like client yang connect ke 3 server simultan
4. Run 5 test scenarios: multi-server connection, activate flow, transaction merge, connection lookup, reconnect

Lihat detail di [`scripts/e2e/`](scripts/e2e/) dan [`PRODUCT_REQUIREMENT.md`](PRODUCT_REQUIREMENT.md) §11.

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
- Cek `ROOM_ID` dan `ROOM_NAME` di agent .env
- Cek konfigurasi room di cashier `.env`
- Server melakukan fuzzy matching - coba restart server

## License

ISC
