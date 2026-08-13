# Video Controller Server

Server pusat untuk menghubungkan semua komponen sistem video controller. Server ini mengelola koneksi antara Agent, Cashier, dan Web.

## Fitur

- **Socket.io Server**: Komunikasi real-time dengan semua client
- **Multi-room Management**: Mengelola multiple ruangan secara bersamaan
- **Command Dispatcher**: Meneruskan perintah dari client ke agent yang sesuai
- **YouTube API Integration**: Untuk pencarian dan validasi video YouTube
- **Billing Service**: Menghitung biaya penggunaan ruangan
- **Room Matching**: Exact match berdasarkan `roomId` (lihat bagian "Room ID Matching" di bawah)

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
| `PRICE_PER_HOUR` | `50000` | Tarif per jam ruangan ini (Rupiah). Wajib beda tiap PC ruangan sesuai tarif ruangan tsb - sumber kebenaran satu-satunya untuk harga (dikirim ke cashier lewat `pricePerHour` pada `AgentInfo`) |

## Topologi

**Tidak ada server pusat.** Server berjalan di tiap PC ruangan (satu server per PC). Cashier di PC terpisah konek ke banyak server ruangan sekaligus (1 socket per ruangan, via `MultiSocketService`).

```
┌────────────────────────────┐
│ PC Ruangan (1 PC = 1 unit) │
│ ┌────────────────────────┐ │
│ │ Server :53331          │ │
│ │ Agent                  │ │
│ │ Web                    │ │
│ └────────────────────────┘ │
└────────────────────────────┘
              ▲
              │ socket.io (LAN)
              │
┌─────────────────────────────────────┐
│ PC Kasir                           │
│  Cashier — buka N socket parallel  │
│  VITE_ROOMS[0].ip = PC Ruangan 1   │
│  VITE_ROOMS[1].ip = PC Ruangan 2   │
│  ...                                │
└─────────────────────────────────────┘
```

Server di tiap PC ruangan terpisah dan berdiri sendiri. Tidak ada komunikasi antar-server.

## Struktur Project

```
server/
├── src/
│   ├── app.ts           # Express app
│   ├── index.ts         # Entry point
│   ├── bootstrap/       # Route registration (registerRoutes.ts)
│   ├── container/      # DI container (ServiceContainer)
│   ├── controllers/     # HTTP controllers
│   ├── routes/          # API routes
│   ├── services/        # Business logic (AgentRegistry, database, dll)
│   ├── socket/          # Socket.io handlers
│   │   ├── SocketEvents.ts
│   │   └── SocketServer.ts
│   ├── types/           # TypeScript types (Agent, PlayerState, dll)
│   └── youtube/         # YouTube API helpers
├── data/                # SQLite database
├── dist/                # Build output
└── package.json
```

## Socket Events

Didefinisikan di `src/socket/SocketEvents.ts`, diimplementasi di `src/socket/SocketServer.ts` (setup terjadi per-connection di `io.on("connection", ...)`).

### Agent → Server

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `agent:register` | `AgentInfo` | Agent register ke server saat connect |
| `agent:heartbeat` | `{ id }` | Heartbeat periodik dari agent |
| `player:state` | `AgentSnapshot` | Push state player terbaru (disimpan + disiarkan sebagai `player:update`) |
| `playlist:state` | `PlaylistSnapshot` | Push state playlist terbaru (disimpan + disiarkan sebagai `playlist:update`) |
| `agent:error` | `{ agentId, roomId, type, message, ... }` | Agent lapor error, disimpan ke DB lalu disiarkan ulang |

### Cashier/Web → Server

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `client:request-state` | - | Web minta ulang `agents:update` |
| `cashier:request-agents` | - | Cashier minta ulang `agents:update` |
| `player:command` | `CommandPayload` | Kirim perintah kontrol video ke agent tertentu (`agentId`) |
| `cashier:activate-room` | `{ roomId, roomName, durationMinutes?, customerName?, customerPhone?, customerEmail?, customerNote?, originalStartTime? }` | Aktivasi ruangan (mulai sesi billing) |
| `cashier:deactivate-room` | `{ roomId, reason?: "manual" \| "move" }` | Nonaktifkan ruangan; server menghitung & menyimpan transaksi di sini |
| `cashier:extend-time` | `{ roomId, additionalMinutes }` | Perpanjang waktu sesi yang sedang aktif |
| `cashier:mark-room-cleaned` | `{ roomId }` | Tandai ruangan hasil Move Room sudah dibersihkan (clear `needsCleaning`) |
| `transaction:get` | - | Minta daftar transaksi (dijawab lewat event yang sama) |
| `transaction:save` | `Transaction` | Update field pembayaran/customer/`cleanedAt` pada transaksi yang sudah ada. Server menolak update ke transaksi yang tidak dikenal, dan tidak pernah menerima harga dari client - `totalPrice` selalu dihitung server-side |
| `transaction:delete` | `transactionId` | Hapus satu transaksi |
| `transaction:clear` | `{ roomId? }` | Hapus semua transaksi (atau per ruangan kalau `roomId` diisi) |

### Server → Agent

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `command` | `CommandPayload` | Perintah yang dieksekusi agent |
| `agent:activation` | `{ isActive, expiresAt?, serverTime?, reason?, ...customerInfo }` | Beri tahu agent statusnya aktif/nonaktif |
| `agent:clear-data` | `{}` | Minta agent kosongkan player/playlist |

### Server → Semua Client

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `agents:update` | `AgentInfo[]` | Broadcast semua agent state (juga dikirim ke socket baru saat connect) |
| `player:update` | `AgentSnapshot` | Broadcast state player terbaru |
| `playlist:update` | `PlaylistSnapshot` | Broadcast state playlist terbaru |
| `room:activation` | `{ roomId, roomName, isActive, expiresAt, startTime, reason?, ...customerInfo }` | Broadcast perubahan status aktivasi ruangan |
| `room:expiry-warning` | `{ roomId, secondsRemaining, expiresAt }` | Peringatan sebelum sesi ruangan habis (dikirim di beberapa threshold sebelum expiry) |

## API Endpoints

### Health Check

```
GET /health         # Detail: uptime, memory, daftar agent
GET /health/live     # Liveness check sederhana
GET /health/ready    # Readiness check
```

### Agents & Commands

```
GET  /api/agents     # Daftar semua agent yang terdaftar di server ini
POST /api/command    # Body: { agentId, command } - kirim command ke agent
```

### YouTube Search

```
GET /api/search?keyword=query
```

## Room ID Matching

Server **tidak** melakukan fuzzy matching. `AgentRegistry` (`src/services/AgentRegistry.ts`) menyimpan agent dengan **primary key = `roomId`** (exact match). `agent.id` disimpan sebagai secondary index untuk lookup fallback (dipakai mis. oleh `POST /api/command`), tapi ini juga exact match, bukan pencocokan nama.

Konsekuensinya: `ROOM_ID` di `agent/.env` harus persis sama dengan `roomId` pada entry `VITE_ROOMS` di `cashier/.env` yang menunjuk ke PC ruangan tersebut. Tidak ada field `altRoomId`, dan `roomName` tidak dipakai untuk matching sama sekali (hanya untuk tampilan).

## Billing

Server menghitung biaya berdasarkan:

- `pricePerHour` - Tarif per jam ruangan ini (dari env `PRICE_PER_HOUR` di `.env` server ini)
- `activeTime` - Waktu aktif ruangan

Rumus:
```
biaya = (activeTime dalam jam) × pricePerHour
```

### Transaksi dan Status Ruangan

Server menyimpan data transaksi dengan field (`TransactionData`):
- `paidAt` - Timestamp saat transaksi lunas (0 = unpaid)
- `cleanedAt` - Timestamp saat transaksi ditandai sudah bersih (diset via `transaction:save`, tombol "Sudah Bersih" di cashier)
- `totalPrice` - Dihitung server-side saja, di `recordTransaction()`: `ceil(durationSeconds / 3600) * pricePerHour` (dibulatkan ke atas per blok jam, minimum 1 jam)

Status ruangan yang ditampilkan di cashier **dihitung di client** (`cashier/src/utils/roomStatus.ts`), bukan dikirim server, dengan prioritas OFFLINE > AKTIF > UNPAID > BERSIHKAN/SUDAH DIBERSIHKAN > ONLINE:
- Tidak terhubung → OFFLINE
- `isActive` → AKTIF
- Ada transaksi dengan `paidAt === 0` → UNPAID
- `paidAt > 0` dan belum `cleanedAt`:
  - < 30 menit sejak `paidAt` → BERSIHKAN
  - 30-60 menit sejak `paidAt` → SUDAH DIBERSIHKAN
  - > 60 menit sejak `paidAt` → kembali ke ONLINE
- Kalau semua transaksi yang sudah `paidAt` juga sudah `cleanedAt` → langsung SUDAH DIBERSIHKAN

Tidak ada status `PAID` tersendiri - begitu lunas, status langsung masuk fase BERSIHKAN.

## Command Types

Command dikirim lewat event `player:command` (dari client) / `command` (ke agent), dengan `type` sesuai `CommandType` di `agent/src/commands/CommandType.ts`:

| CommandType | Payload tambahan | Deskripsi |
|-------------|-------------------|-----------|
| `PLAY` / `PAUSE` / `STOP` | - | Kontrol pemutaran |
| `NEXT` / `PREVIOUS` | - | Navigasi playlist |
| `OPEN_VIDEO` | `{ url }` | Mainkan URL YouTube tertentu |
| `SEEK` | `{ time }` | Lompat ke posisi waktu tertentu |
| `VOLUME` | `{ level }` | Atur volume (0-100) |
| `MUTE` / `UNMUTE` | - | Bisukan/nyalakan suara |
| `FULLSCREEN` / `EXIT_FULLSCREEN` / `TOGGLE_FULLSCREEN` | - | Kontrol fullscreen |
| `ADD_PLAYLIST` | `{ url, title, ... }` | Tambah item ke queue |
| `REMOVE_PLAYLIST` | `{ id }` | Hapus item dari queue |
| `CLEAR_PLAYLIST` | - | Kosongkan queue |
| `PLAY_PLAYLIST_ITEM` | `{ index }` | Mainkan item queue tertentu |
| `SHUFFLE_PLAYLIST` | - | Acak urutan queue |
| `REPEAT_OFF` / `REPEAT_ONE` / `REPEAT_ALL` | - | Atur mode repeat |
| `SKIP_AD` | - | Skip iklan YouTube yang sedang tampil |
| `SET_AUTO_SKIP_ADS` | `{ enabled }` | Toggle auto-skip iklan |

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

Server memakai `console.log`/`console.error` biasa (tidak ada library logging seperti Pino, dan tidak ada file transport). Semua log hanya muncul di stdout/stderr proses server.

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
- Cek `ROOM_ID` di agent .env
- Cek `SERVER_IP`/`SERVER_PORT` di agent .env
- Lihat logs untuk error detail

### Billing tidak berfungsi
- Pastikan `BILLING_ENABLED=true` di server dan cashier
- Cek `PRICE_PER_HOUR` di `server/.env`
