# Video Controller Agent

Agent yang berjalan di ruangan karaoke untuk mengontrol pemutaran video YouTube. Agent terhubung ke server pusat dan menerima perintah dari kasir melalui server.

## Fitur

- **Kontrol Video**: Play, pause, stop, next, previous
- **Manajemen Playlist**: Mengelola queue video dari kasir
- **Browser Otomatis**: Membuka browser secara otomatis (Playwright)
- **Health Check**: Memantau status browser dan video secara berkala
- **Auto-recovery**: Recovery otomatis jika browser crash
- **Billing Integration**: Menerima status aktif/nonaktif ruangan (`agent:activation`) dari server - perhitungan biaya sendiri sepenuhnya di server, agent tidak mengirim data usage

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
# SERVER_IP = IP PC server (di topologi 1 ruangan = 1 PC, ini PC yang sama dengan agent).
# Kosongkan untuk auto-detect local IP.
SERVER_IP=
SERVER_PORT=53331
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

### Browser Profile (Data Lokal)

`data/browser-profile/` menyimpan profil Chrome persisten (cookies, session, login data YouTube, cache) untuk PC ruangan tersebut. Ini **disengaja**: supaya login YouTube dan preferensi browser tidak hilang tiap kali agent restart. Data ini murni lokal di PC — tidak pernah disinkronkan ke atau dari server.

Kapan perlu direset:
- PC ruangan diganti/di-reimage dan perlu login ulang dari awal
- Perlu logout paksa akun YouTube yang sedang dipakai
- Profil korup (browser gagal start terus-menerus meski konfigurasi benar)

Cara reset: hentikan agent, hapus folder `data/browser-profile/` secara manual, lalu jalankan ulang agent — folder akan dibuat ulang otomatis dan browser akan start dengan profil bersih (perlu login YouTube ulang jika diperlukan).

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
│   │   └── adapters/   # Browser adapter implementations
│   ├── commands/       # Command definitions + handlers
│   │   └── handlers/   # 1 handler class per CommandType
│   ├── config/         # Configuration
│   ├── core/           # Agent core logic
│   ├── health/         # Health check
│   ├── network/       # Socket client, local IP detection
│   ├── player/        # YouTube player control (DOM, selectors)
│   ├── playlist/      # Playlist management
│   ├── recovery/     # Auto-recovery
│   ├── repositories/ # Local persistence untuk player/playlist state
│   ├── services/     # Services (termasuk LoggerService, ConfigService)
│   ├── socket/       # Socket.io event name constants
│   ├── types/        # TypeScript types
│   ├── utils/        # Utilities
│   └── index.ts      # Entry point
├── data/              # Browser profile data (lokal, lihat "Browser Profile (Data Lokal)")
├── dist/             # Build output
└── package.json
```

## Perintah yang Didukung

Agent menerima perintah dari server lewat event `command`, di-route ke handler di `src/commands/handlers/` berdasarkan `CommandType` (`src/commands/CommandType.ts`):

| CommandType | Handler | Deskripsi |
|-------------|---------|-----------|
| `PLAY` | PlayHandler | Memutar video |
| `PAUSE` | PauseHandler | Jeda video |
| `STOP` | StopHandler | Stop video |
| `NEXT` | NextHandler | Video berikutnya di playlist |
| `PREVIOUS` | PreviousHandler | Video sebelumnya di playlist |
| `OPEN_VIDEO` | OpenVideoHandler | Buka/mainkan URL video YouTube tertentu |
| `SEEK` | SeekHandler | Lompat ke posisi waktu tertentu |
| `VOLUME` | VolumeHandler | Atur volume (0-100) |
| `MUTE` / `UNMUTE` | MuteHandler / UnmuteHandler | Bisukan/nyalakan suara |
| `FULLSCREEN` / `EXIT_FULLSCREEN` / `TOGGLE_FULLSCREEN` | FullscreenHandler dkk | Kontrol fullscreen |
| `ADD_PLAYLIST` | AddPlaylistHandler | Tambah item ke queue |
| `REMOVE_PLAYLIST` | RemovePlaylistHandler | Hapus item dari queue |
| `CLEAR_PLAYLIST` | ClearPlaylistHandler | Kosongkan queue |
| `PLAY_PLAYLIST_ITEM` | PlayPlaylistItemHandler | Mainkan item queue tertentu |
| `MOVE_PLAYLIST_ITEM` | MovePlaylistItemHandler | Geser posisi item queue naik/turun (`{ id, direction: "up" \| "down" }`) |
| `SHUFFLE_PLAYLIST` | ShufflePlaylistHandler | Acak urutan queue |
| `REPEAT_OFF` / `REPEAT_ONE` / `REPEAT_ALL` | RepeatModeHandler | Atur mode repeat |
| `SKIP_AD` | SkipAdHandler | Skip iklan YouTube yang sedang tampil |
| `SET_AUTO_SKIP_ADS` | SetAutoSkipAdsHandler | Toggle auto-skip iklan |

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

Log menggunakan Pino (dengan `pino-pretty` untuk output berwarna) dengan level yang bisa dikonfigurasi lewat `LOG_LEVEL`:

- `trace` - Semua log
- `debug` - Debug info
- `info` - Info umum (default)
- `warn` - Warning
- `error` - Error

Log hanya ditulis ke console (stdout) - saat ini `LoggerService` tidak punya file transport, jadi tidak ada file `logs/agent.log`. Kalau butuh persist log, redirect stdout secara manual (mis. lewat systemd/PM2 log file) atau tambahkan transport file di `src/services/LoggerService.ts`.

## Troubleshooting

### Browser tidak terbuka
- Pastikan display tersedia atau gunakan `BROWSER_HEADLESS=true`
- Cek browser installation

### Tidak terhubung ke server
- Cek `SERVER_IP` dan `SERVER_PORT` di .env
- Cek firewall/network

### Video tidak autoplay
- Beberapa browser memblokir autoplay dengan audio
- Coba gunakan headless mode untuk testing

### Memory leak
- Browser profile bisa accumulate
- Gunakan `BROWSER_HEADLESS=true` untuk production
