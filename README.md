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

## Arsitektur

```
┌─────────────────────────────────────────────────────────────────────┐
│                           SERVER (Port 53331)                       │
│                   Socket.IO + Express + SQLite                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Agent     │         │  Cashier    │         │     Web     │
│  (Room 1)   │         │  (Reception)│         │  (Mobile)   │
└─────────────┘         └─────────────┘         └─────────────┘
       │
       ▼
┌─────────────┐
│   Agent     │
│  (Room 2)  │
└─────────────┘
```

- **Server** - Socket.io server untuk komunikasi real-time dan API (port 53331)
- **Agent** - Browser automation (Playwright) untuk mengontrol video di setiap ruangan
- **Cashier** - React frontend untuk billing dan manajemen timer (PC kasir)
- **Web** - React PWA frontend untuk kontrol via mobile/web

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

# Cashier (.env)
VITE_ROOMS=[{"name":"Room 1","ip":"192.168.1.10","port":53331,"pricePerHour":50000}]
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
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── store/       # Zustand state
│   └── .env            # SERVER_URL
├── cashier/          # React cashier frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Pages
│   │   ├── services/    # Socket service
│   │   └── store/       # Zustand state
│   └── .env            # VITE_ROOMS, BILLING_ENABLED
├── install.sh          # Linux installation script
├── install.ps1        # Windows installation script
└── README.md
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Zustand, React Router
- **Server**: Express, Socket.io, SQLite (sql.js), Google APIs
- **Agent**: Playwright, Socket.io Client, Pino (logging), Zod

## Billing

Sistem billing menghitung biaya berdasarkan:
- `pricePerHour` - Tarif per jam per ruangan (dari cashier config)
- `activeTime` - Waktu aktif ruangan

Rumus:
```
biaya = (activeTime dalam jam) × pricePerHour
```

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
- Cek `pricePerHour` di cashier config
- Review server logs

### Room tidak terdeteksi
- Cek `ROOM_ID` dan `ROOM_NAME` di agent .env
- Cek konfigurasi room di cashier `.env`
- Server melakukan fuzzy matching - coba restart server

## License

ISC
