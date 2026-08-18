# Web Application

Aplikasi web (PWA) untuk mengontrol pemutaran video di **satu ruangan karaoke**. Web ini terinstall di PC ruangan itu sendiri (1 instance per PC, lihat topologi di README root) dan terhubung ke server lokal di PC yang sama - bukan dashboard multi-ruangan (itu tugas `cashier/`).

## Fitur

- **Kontrol Video**: Play, pause, stop, next, previous, seek, volume, mute, fullscreen untuk room ini
- **Playlist Management**: Menambah, memutar, menghapus, shuffle, dan mengatur repeat mode queue video
- **Pencarian YouTube**: Cari video langsung dari halaman Search
- **Status Real-time**: Melihat state player/playlist room ini secara real-time via Socket.IO
- **Offline Overlay**: Menampilkan overlay saat agent room ini terputus dari server
- **Responsif & Installable (PWA)**: Bisa di-install di desktop/tablet PC ruangan

## Cara Menjalankan

```bash
# Install dependencies
cd web
npm install

# Development
npm run dev

# Production
npm run build
npm run preview:host
```

## Konfigurasi Environment

Buat file `.env` di root folder web (atau copy dari `.env.example`). Karena web terinstall di PC ruangan itu sendiri, `VITE_SERVER_IP` harus menunjuk ke IP PC ruangan itu sendiri (server jalan di PC yang sama):

```bash
# Server Configuration
VITE_SERVER_IP=127.0.0.1
VITE_SERVER_PORT=53331

# Billing Configuration
VITE_BILLING_ENABLED=true
```

Jika `VITE_SERVER_PORT` dikosongkan, `getServerUrl()` (`src/utils/getServerUrl.ts`) fallback otomatis: kalau app diakses dari port dev (53332) atau preview (53333), API server diasumsikan di port 53331.

## Konfigurasi Port

- Development: `http://localhost:53332`
- Production Preview: `http://localhost:53333`

## Arsitektur

```
┌─────────────┐     Socket      ┌─────────────┐
│    Agent    │ ◄──────────────►│   Server    │
│  (Room 2)  │                 │  (port 53331)│
└─────────────┘                 └──────┬──────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
              ┌──────────┐       ┌──────────┐       ┌──────────┐
              │  Cashier │       │    Web   │       │   ...    │
              └──────────┘       └──────────┘       └──────────┘
```

## Struktur Project

```
web/
├── src/
│   ├── api/            # API calls
│   ├── assets/         # Static assets
│   ├── config/         # Configuration
│   ├── context/        # React Context (loading state)
│   ├── features/       # Feature modules
│   ├── hooks/         # Custom React hooks
│   ├── layouts/       # Layout components
│   ├── pages/         # Page components
│   ├── routes/        # Routing
│   ├── services/      # Services (socket, dll - juga pemilik agent/player/playlist state)
│   ├── shared/        # Shared components
│   ├── types/         # TypeScript types
│   ├── utils/         # Utilities
│   ├── App.tsx        # Main app component
│   └── main.tsx       # Entry point
├── public/             # Public assets
│   ├── manifest.json  # PWA manifest (custom, dipakai VitePWA)
│   └── icon-*.png     # PWA icons
├── dist/              # Build output
└── package.json
```

## Fitur Utama

### Home (Player)
- Kontrol video room ini: play, pause, stop, next, previous, seek, volume, mute, fullscreen
- Menampilkan state player real-time

### Playlist
- Tambah video ke queue, hapus, play item tertentu
- Shuffle dan repeat mode (off/one/all)

### Search
- Cari video YouTube dan mainkan/tambahkan langsung ke queue

### Settings
- Pengaturan aplikasi web (mis. toggle billing)

## Koneksi Socket

Web app terhubung ke server (di PC ruangan yang sama) via Socket.io (`src/services/socket/SocketService.ts`):

```typescript
import { io } from 'socket.io-client';

const socket = io(getServerUrl());

// Events utama yang di-listen:
// - 'agents:update'  - Update state semua agent (untuk resolve agent room ini)
// - 'player:update'  - Update state player
// - 'playlist:update'- Update state playlist

// Saat connect, web mengirim:
// - 'client:request-state' - minta ulang 'agents:update'
```

Selengkapnya lihat tabel Socket Events di README root.

## Perintah yang Dikirim

Web mengirim command lewat event `player:command`, dengan `type` sesuai `CommandType` di agent (`agent/src/commands/CommandType.ts`):

| Command | Deskripsi |
|---------|-----------|
| `PLAY` / `PAUSE` / `STOP` | Kontrol pemutaran |
| `NEXT` / `PREVIOUS` | Navigasi playlist |
| `OPEN_VIDEO` | Mainkan video/URL YouTube tertentu |
| `SEEK` | Lompat ke posisi tertentu |
| `VOLUME` | Atur volume (0-100) |
| `MUTE` / `UNMUTE` | Bisukan/nyalakan suara |
| `FULLSCREEN` / `EXIT_FULLSCREEN` / `TOGGLE_FULLSCREEN` | Kontrol fullscreen |
| `ADD_PLAYLIST` / `REMOVE_PLAYLIST` / `CLEAR_PLAYLIST` | Kelola queue |
| `PLAY_PLAYLIST_ITEM` | Mainkan item queue tertentu |
| `SHUFFLE_PLAYLIST` | Acak urutan queue |
| `REPEAT_OFF` / `REPEAT_ONE` / `REPEAT_ALL` | Atur mode repeat |
| `SKIP_AD` / `SET_AUTO_SKIP_ADS` | Kontrol iklan YouTube |

## PWA Support

Aplikasi ini mendukung Progressive Web App via `vite-plugin-pwa` (lihat `vite.config.ts`):

- Installable di desktop dan tablet (manifest custom di `public/manifest.json`)
- Service worker di-generate otomatis oleh Workbox (`registerType: 'autoUpdate'`) - bukan file `sw.js` manual
- Caching untuk font Google (`fonts.googleapis.com`/`fonts.gstatic.com`) dan static assets

## Cara Install

### Development
```bash
npm run dev
# Buka http://localhost:53332
```

### Production
```bash
npm run build
npm run preview:host
# Buka http://localhost:53333
```

### Deploy ke Server
```bash
# Build
npm run build

# Copy folder dist ke web server
# Contoh dengan nginx:
# cp -r dist/* /var/www/html/
```

## Teknologi yang Digunakan

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time communication
- **React Context + service singleton** - State management (tidak pakai Zustand, lihat PRD §9.4)
- **React Query** - Data fetching
- **React Router** - Routing
- **PWA** - Progressive Web App

## Troubleshooting

### Tidak terhubung ke server
- Cek `VITE_SERVER_IP` dan `VITE_SERVER_PORT` di .env
- Cek server sedang berjalan di port yang benar

### Socket connection failed
- Cek firewall/network
- Pastikan server mendukung CORS

### Build error
- Pastikan Node.js versi kompatibel
- Hapus folder node_modules dan reinstall

### PWA tidak works
- Pastikan HTTPS (di production)
- Cek service worker registration
