# Cashier Application

Aplikasi kasir untuk mengatur timer dan billing ruangan karaoke. Aplikasi ini terhubung ke server pusat dan menampilkan status semua ruangan yang aktif.

## Fitur

- **Monitoring Ruangan**: Menampilkan semua ruangan karaoke yang terhubung
- **Billing Otomatis**: Menghitung biaya berdasarkan durasi penggunaan
- **Status Real-time**: Menampilkan status pemutaran video (playing/paused/idle)
- **Total Pendapatan**: Menampilkan ringkasan pendapatan semua ruangan

## Cara Menjalankan

```bash
# Install dependencies
cd cashier
npm install

# Development
npm run dev

# Production
npm run build
npm run preview:host
```

## Konfigurasi Port

- Development: `http://localhost:5174`
- Production Preview: `http://localhost:4173`

## Endpoint Server

Aplikasi ini terhubung ke server yang berjalan di port `53331` secara default.

## Struktur Project

```
cashier/
├── src/
│   ├── components/     # UI components
│   ├── services/       # Socket service
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── dist/               # Build output
└── package.json
```

## Cara Install di PC Kasir

1. Build aplikasi: `npm run build`
2. Copy folder `dist` ke PC kasir
3. Jalankan dengan any web server (nginx, apache, atau python http.server)
