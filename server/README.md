# Video Controller Server

Server pusat untuk menghubungkan semua komponen sistem video controller. Server ini mengelola koneksi antara Agent, Cashier, dan Web.

## Fitur

- **Socket.io Server**: Komunikasi real-time dengan semua client
- **Multi-room Management**: Mengelola multiple ruangan secara bersamaan
- **Command Dispatcher**: Meneruskan perintah dari client ke agent yang sesuai
- **YouTube API Integration**: Untuk pencarian dan validasi video YouTube
- **Billing Service**: Menghitung biaya penggunaan ruangan
- **Room Matching**: Fuzzy matching untuk ID ruangan (roomId, altRoomId, roomName)

## Cara Menjalankan

```bash
# Install dependencies
cd server
npm install

# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

## Konfigurasi Environment

Buat file `.env` di root folder server:

```bash
# YouTube API Configuration
YOUTUBE_API_KEY=AIzaSy...

# Server Configuration
PORT=53331

# Billing Configuration
BILLING_ENABLED=true
```

### Konfigurasi Parameter

| Parameter | Default | Deskripsi |
|-----------|---------|-----------|
| `PORT` | `53331` | Port server |
| `YOUTUBE_API_KEY` | - | API key untuk YouTube Data API v3 |
| `BILLING_ENABLED` | `true` | Aktifkan fitur billing |

## Arsitektur

```
                    ┌─────────────┐
                    │   Server    │
                    │  Port 53331 │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  ┌────────────┐    ┌────────────┐    ┌────────────┐
  │   Agent    │    │  Cashier   │    │    Web     │
  │  (Room 1) │    │            │    │            │
  └────────────┘    └────────────┘    └────────────┘
         │
         ▼
  ┌────────────┐
  │  (Room 2) │
  └────────────┘
```

## Struktur Project

```
server/
├── src/
│   ├── app.ts           # Express app
│   ├── index.ts         # Entry point
│   ├── bootstrap/       # Bootstrap modules
│   ├── config/          # Configuration
│   ├── container/      # DI container
│   ├── controllers/     # HTTP controllers
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── socket/          # Socket.io handlers
│   │   ├── SocketEvents.ts
│   │   └── SocketServer.ts
│   ├── types/           # TypeScript types
│   └── youtube/         # YouTube API helpers
├── data/                # SQLite database
├── dist/                # Build output
└── package.json
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

## API Endpoints

### Health Check

```
GET /health
```

### Room Status

```
GET /api/rooms
GET /api/rooms/:roomId
```

### YouTube

```
GET /api/youtube/search?q=query
GET /api/youtube/video/:videoId
```

## Room ID Matching

Server mendukung fuzzy matching untuk room ID:

1. Coba `roomId` (exact match)
2. Coba `altRoomId` (jika ada)
3. Coba `roomName` (fuzzy match)

Contoh:
- Agent: `roomId: "room-002"`, `roomName: "Room 2"`
- Cashier: `id: "env-room-1"`
- Server akan mencocokkan berdasarkan konfigurasi

## Billing

Server menghitung biaya berdasarkan:

- `pricePerHour` - Tarif per jam per ruangan (dari cashier config)
- `activeTime` - Waktu aktif ruangan

Rumus:
```
biaya = (activeTime dalam jam) × pricePerHour
```

### Transaksi dan Status Ruangan

Server menyimpan data transaksi dengan field:
- `paidAt` - Timestamp saat transaksi lunas (0 = unpaid)
- `cleanedAt` - Timestamp saat ruangan ditandai sudah bersih

Status ruangan dihitung berdasarkan:
- Jika `paidAt === 0` → UNPAID
- Jika `paidAt > 0` dan belum ada `cleanedAt`:
  - Dalam 3 menit setelah paidAt → PAID
  - 3-4 menit setelah paidAt → BERSIHKAN
  - Setelah 4 menit atau ada `cleanedAt` → SUDAH DIBERSIHKAN

## Command Types

| Command | Payload | Deskripsi |
|---------|---------|-----------|
| `play` | - | Memutar video |
| `pause` | - | Jeda video |
| `stop` | - | Stop video |
| `next` | - | Video berikutnya |
| `previous` | - | Video sebelumnya |
| `playUrl` | `{ url }` | Mainkan URL YouTube |
| `addToQueue` | `{ url, title }` | Tambah ke queue |
| `clearQueue` | - | Clear queue |
| `setVolume` | `{ level }` | Atur volume (0-100) |

## Cara Install sebagai Service (Linux)

### Menggunakan systemd

1. Build aplikasi: `npm run build`
2. Copy folder server ke `/opt/video-server`
3. Buat service file:

```bash
# /etc/systemd/system/video-server.service
[Unit]
Description=Video Controller Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/video-server
ExecStart=/opt/video-server/node_modules/.bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

4. Aktifkan service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable video-server
sudo systemctl start video-server
```

### Menggunakan PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name video-server
pm2 save
pm2 startup
```

## Logging

Server menggunakan Pino untuk logging:

- Console output
- File: `logs/server.log`

Level: `trace`, `debug`, `info`, `warn`, `error`

## Database

Server menggunakan SQLite (sql.js) untuk menyimpan:

- Room configurations
- Usage history
- Billing records

File database: `data/video-controller.db`

## Troubleshooting

### Port sudah digunakan
```bash
# Cek port yang digunakan
netstat -ntlp | grep 53331

# Jika perlu, ganti port di .env
```

### Socket connection refused
- Pastikan server sudah running
- Cek firewall/network

### YouTube API error
- Cek `YOUTUBE_API_KEY` di .env
- Pastikan API key valid dan quota cukup

### Agent tidak terkoneksi
- Cek roomId di agent .env
- Cek server URL di agent .env
- Lihat logs untuk error detail

### Billing tidak berfungsi
- Pastikan `BILLING_ENABLED=true` di server dan cashier
- Cek pricePerHour di cashier config
