# Video Controller Agent

Agent yang berjalan di ruangan karaoke untuk mengontrol pemutaran video YouTube. Agent terhubung ke server pusat dan menerima perintah dari kasir melalui server.

## Fitur

- **Kontrol Video**: Play, pause, stop, next, previous
- **Manajemen Playlist**: Mengelola queue video dari kasir
- **Browser Otomatis**: Membuka browser secara otomatis (Playwright)
- **Health Check**: Memantau status browser dan video secara berkala
- **Auto-recovery**: Recovery otomatis jika browser crash
- **Billing Integration**: Mengirim data penggunaan ke server untuk billing

## Cara Menjalankan

```bash
# Install dependencies
cd agent
npm install

# Build TypeScript
npm run build

# Development (hot reload)
npm run dev

# Production (from dist)
npm start
```

## Konfigurasi Environment

Buat file `.env` di root folder agent:

```bash
# Room Configuration
ROOM_ID=room-002
ROOM_NAME=Room 2

# Billing Configuration
BILLING_ENABLED=true

# Browser Configuration
BROWSER_HEADLESS=false
BROWSER_CHANNEL=chrome
BROWSER_ARGS=--start-maximized||--kiosk||--disable-dev-shm-usage||--no-sandbox||--disable-blink-features=AutomationControlled||--disable-web-security||--disable-features=IsolateOrigins,site-per-process||--disable-setuid-sandbox

# Optional: Custom viewport
BROWSER_VIEWPORT=false
BROWSER_VIEWPORT_WIDTH=1920
BROWSER_VIEWPORT_HEIGHT=1080

# YouTube Configuration
YOUTUBE_HOME=https://www.youtube.com

# Health Check (interval dalam ms)
HEALTH_INTERVAL=5000

# Logging
LOG_LEVEL=info

# Server Configuration
SERVER_URL=http://localhost:53331
```

### Konfigurasi Room

| Parameter | Deskripsi |
|-----------|-----------|
| `ROOM_ID` | ID unik ruangan (misal: `room-002`) |
| `ROOM_NAME` | Nama ruangan (misal: `Room 2`) |

### Konfigurasi Browser

| Parameter | Default | Deskripsi |
|-----------|---------|-----------|
| `BROWSER_HEADLESS` | `false` | `true` untuk mode headless (tanpa GUI) |
| `BROWSER_CHANNEL` | `chrome` | Channel browser (chromium, chrome, msedge) |
| `BROWSER_VIEWPORT` | `false` | Gunakan custom viewport |
| `BROWSER_VIEWPORT_WIDTH` | `1920` | Lebar viewport |
| `BROWSER_VIEWPORT_HEIGHT` | `1080` | Tinggi viewport |

### Browser Args

Argument browser dipisahkan dengan `||`:
- `--start-maximized` - Maximize window
- `--kiosk` - Mode kiosk
- `--disable-dev-shm-usage` - Disable /dev/shm usage
- `--no-sandbox` - Disable sandbox (diperlukan untuk root)
- `--disable-blink-features=AutomationControlled` - Hide automation
- `--disable-web-security` - Disable web security
- `--disable-setuid-sandbox` - Disable setuid sandbox

## Topologi (1 Ruangan = 1 PC)

Setiap PC ruangan adalah unit self-contained yang menjalankan **Agent + Server + Web** sebagai satu bundle. Topologi ini berarti:

- Tidak ada server pusat. Server jalan **di PC yang sama** dengan agent.
- `SERVER_IP` default = auto-detect IP lokal PC. Bisa dikosongkan.
- Tiap PC ruangan punya `ROOM_ID` berbeda satu sama lain.
- PC Kasir konek langsung ke IP PC ruangan ini via `cashier/.env → VITE_ROOMS[].ip`.

```
┌──────────────────────────────────────────┐
│  PC Ruangan 1                            │
│                                          │
│   Agent  ◄────socket.io────►  Server     │
│                                    :53331 │
└──────────────────────────────────────────┘
                  ▲
                  │ socket (LAN)
                  │
┌──────────────────────────────────────────┐
│  PC Kasir                                │
│   Cashier (VITE_ROOMS.ip = PC Ruangan 1) │
└──────────────────────────────────────────┘
```

## Struktur Project

```
agent/
├── src/
│   ├── browser/        # Browser management (launch, profile, state)
│   ├── commands/       # Command handlers
│   ├── config/         # Configuration
│   ├── core/           # Agent core logic
│   ├── events/         # Event definitions
│   ├── health/         # Health check
│   ├── logger/        # Logging
│   ├── network/       # Network utilities
│   ├── player/        # Player controls
│   ├── playlist/      # Playlist management
│   ├── recovery/     # Auto-recovery
│   ├── services/     # Services
│   ├── socket/       # Socket client
│   ├── state/        # State management
│   ├── types/        # TypeScript types
│   ├── utils/        # Utilities
│   ├── youtube/      # YouTube helpers
│   └── index.ts      # Entry point
├── data/              # Browser profile data
├── dist/             # Build output
└── package.json
```

## Perintah yang Didukung

Agent menerima perintah dari server:

| Perintah | Deskripsi |
|----------|-----------|
| `play` | Memutar video |
| `pause` | Jeda video |
| `stop` | Stop video |
| `next` | Video berikutnya |
| `previous` | Video sebelumnya |
| `playUrl` | Mainkan URL YouTube |
| `addToQueue` | Tambah ke queue |
| `clearQueue` | Clear queue |
| `setVolume` | Atur volume |

## Cara Install sebagai Service (Linux)

### Menggunakan systemd

1. Build aplikasi: `npm run build`
2. Copy folder agent ke `/opt/video-agent`
3. Buat service file:

```bash
# /etc/systemd/system/video-agent.service
[Unit]
Description=Video Controller Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/video-agent
ExecStart=/opt/video-agent/node_modules/.bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

4. Aktifkan service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable video-agent
sudo systemctl start video-agent
```

### Menggunakan PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name video-agent
pm2 save
pm2 startup
```

## Logging

Log menggunakan Pino dengan level yang bisa dikonfigurasi:

- `trace` - Semua log
- `debug` - Debug info
- `info` - Info umum (default)
- `warn` - Warning
- `error` - Error

Log tersimpan di:
- Console (stdout)
- File: `logs/agent.log` (jika dikonfigurasi)

## Troubleshooting

### Browser tidak terbuka
- Pastikan display tersedia atau gunakan `BROWSER_HEADLESS=true`
- Cek browser installation

### Tidak terhubung ke server
- Cek `SERVER_URL` di .env
- Cek firewall/network

### Video tidak autoplay
- Beberapa browser memblokir autoplay dengan audio
- Coba gunakan headless mode untuk testing

### Memory leak
- Browser profile bisa accumulate
- Gunakan `BROWSER_HEADLESS=true` untuk production
