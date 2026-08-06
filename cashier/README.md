# Cashier Application

Aplikasi kasir untuk mengatur timer dan billing ruangan karaoke. Aplikasi ini terhubung ke server pusat dan menampilkan status semua ruangan yang aktif.

## Fitur

- **Monitoring Ruangan**: Menampilkan semua ruangan karaoke yang terhubung
- **Billing Otomatis**: Menghitung biaya berdasarkan durasi penggunaan dan harga per jam per ruangan
- **Status Ruangan**: Menampilkan status real-time ruangan (OFFLINE, AKTIF, UNPAID, PAID, BERSIHKAN, SUDAH DIBERSIHKAN, ONLINE)
- **Status Real-time**: Menampilkan status pemutaran video (playing/paused/idle)
- **Total Pendapatan**: Menampilkan ringkasan pendapatan semua ruangan
- **Konfigurasi Fleksibel**: Setiap ruangan bisa memiliki tarif berbeda (`pricePerHour`)
- **Full Page Loading**: Setiap proses menampilkan loading screen dengan estimasi waktu
- **Pindah Ruangan**: Memindahkan billing dari satu ruangan ke ruangan lain saat customer ingin pindah

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

## Konfigurasi Environment

Buat file `.env` di root folder cashier:

```bash
# Mengaktifkan fitur billing
VITE_BILLING_ENABLED=true

# Konfigurasi ruangan (JSON array)
# Setiap ruangan: name, ip server agent, port, dan harga per jam
VITE_ROOMS=[{"name":"Room 1","ip":"192.168.1.10","port":53331,"pricePerHour":50000},{"name":"Room 2","ip":"192.168.1.11","port":53331,"pricePerHour":60000},{"name":"Room 3","ip":"192.168.1.12","port":53331,"pricePerHour":45000}]
```

### Konfigurasi Room

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `name` | string | Nama ruangan (ditampilkan di UI) |
| `ip` | string | IP address dimana agent berjalan |
| `port` | number | Port server (default: 53331) |
| `pricePerHour` | number | Tarif per jam dalam Rupiah (default: 50000) |

## Konfigurasi Port

- Development: `http://localhost:5174`
- Production Preview: `http://localhost:4173`

## Endpoint Server

Aplikasi ini terhubung ke server yang berjalan di port `53331` secara default.

## Dashboard Statistik

Halaman utama menampilkan statistik:
- **Ruangan**: Total ruangan yang dikonfigurasi
- **Aktif**: Jumlah ruangan yang sedang digunakan
- **Online**: Jumlah ruangan yang terhubung ke server

## Struktur Project

```
cashier/
├── src/
│   ├── components/     # UI components (Button, Card, dll)
│   ├── config/        # Konfigurasi aplikasi
│   ├── layouts/       # Layout components
│   ├── pages/         # Halaman (Home, RoomDetail, dll)
│   ├── services/      # Socket service
│   ├── store/        # Zustand state management
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── dist/              # Build output
└── package.json
```

## Cara Install di PC Kasir

1. Konfigurasi file `.env` sesuai kebutuhan
2. Build aplikasi: `npm run build`
3. Copy folder `dist` ke PC kasir
4. Jalankan dengan web server (nginx, apache, atau python http.server)

### Contoh dengan Python:

```bash
# Di PC kasir, setelah copy folder dist
cd dist
python -m http.server 8080
```

## Koneksi

- Cashier connect ke server di `localhost:53331` (development) atau IP server (production)
- Server broadcast `agents:update` ke semua client yang terhubung
- Setiap ruangan menampilkan status: Aktif/Non-aktif, Sedang Memutar/Jeda/Idle, dan biaya

## Status Ruangan

| Status | Deskripsi |
|--------|-----------|
| OFFLINE | Ruangan tidak terhubung ke server |
| AKTIF | Ruangan sedang digunakan |
| UNPAID | Transaksi belum lunas (belum dibayar) |
| PAID | Transaksi sudah lunas, belum memasuki fase pembersihan |
| BERSIHKAN | Transaksi sudah lunas, memasuki fase pembersihan (3 menit) |
| SUDAH DIBERSIHKAN | Fase pembersihan selesai, ruangan siap digunakan |
| ONLINE | Ruangan terhubung tapi tidak aktif |

### Transisi Status Otomatis
- **PAID → BERSIHKAN**: Secara otomatis setelah 3 menit
- **BERSIHKAN → SUDAH DIBERSIHKAN**: Secara otomatis setelah 1 menit
- **SUDAH DIBERSIHKAN → ONLINE**: Ruangan siap diaktifkan kembali

### Fitur Cleaning Manual
- Tombol "Sudah Bersih" untuk mempercepat transisi dari BERSIHKAN ke SUDAH DIBERSIHKAN
- Ruangan dengan status BERSIHKAN tidak bisa diaktifkan
