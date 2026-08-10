# Web Application

Aplikasi web untuk mengontrol pemutaran video di ruangan karaoke. Aplikasi ini terhubung ke server pusat dan dapat mengontrol semua ruangan yang aktif.

## Fitur

- **Monitoring Ruangan**: Melihat status semua ruangan secara real-time
- **Kontrol Video**: Play, pause, stop, next, previous untuk setiap ruangan
- **Playlist Management**: Menambah dan mengelola queue video
- **Dashboard**: Tampilan ringkasan semua ruangan
- **Responsif**: Tampilan yang bisa diakses dari berbagai device

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

Buat file `.env` di root folder web:

```bash
# Server Configuration
VITE_SERVER_URL=http://localhost:53331

# App Configuration
VITE_APP_TITLE=Video Controller
```

## Konfigurasi Port

- Development: `http://localhost:5173`
- Production Preview: `http://localhost:4173`

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
│   ├── manifest.json  # PWA manifest
│   └── sw.js          # Service worker
├── dist/              # Build output
└── package.json
```

## Fitur Utama

### Dashboard
- Tampilan semua ruangan dengan status real-time
- Quick actions untuk kontrol langsung

### Room Control
- Kontrol video per ruangan
- Kelola playlist/queue
- Atur volume

### Playlist Management
- Tambah video ke queue
- Urutkan ulang
- Hapus dari queue

## Koneksi Socket

Web app terhubung ke server via Socket.io:

```typescript
import { io } from 'socket.io-client';

const socket = io(SERVER_URL);

// Events yang perlu di-listen:
// - 'agents:update' - Update status semua agent
// - 'command:result' - Result dari perintah yang dikirim
```

## Perintah yang Dikirim

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

## PWA Support

Aplikasi ini mendukung Progressive Web App:

- Installable di desktop dan mobile
- Offline support (basic)
- Service worker untuk caching

## Cara Install

### Development
```bash
npm run dev
# Buka http://localhost:5173
```

### Production
```bash
npm run build
npm run preview:host
# Buka http://localhost:4173
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
- Cek `VITE_SERVER_URL` di .env
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
