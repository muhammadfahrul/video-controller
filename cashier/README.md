# Cashier Application

Aplikasi kasir untuk mengatur timer dan billing ruangan karaoke. Aplikasi ini terhubung ke server pusat dan menampilkan status semua ruangan yang aktif.

## Fitur

- **Monitoring Ruangan**: Menampilkan semua ruangan karaoke yang terhubung
- **Billing Otomatis**: Menghitung biaya berdasarkan durasi penggunaan dan harga per jam per ruangan
- **Status Ruangan**: Menampilkan status real-time ruangan (OFFLINE, AKTIF, UNPAID, BERSIHKAN, SUDAH DIBERSIHKAN, ONLINE)
- **Status Real-time**: Menampilkan status pemutaran video (playing/paused/idle)
- **Total Pendapatan**: Menampilkan ringkasan pendapatan semua ruangan
- **Konfigurasi Fleksibel**: Setiap ruangan bisa memiliki tarif berbeda (`pricePerHour`, dikonfigurasi di `server/.env` PC ruangan tsb, bukan di cashier)
- **Paket Harga Tetap**: Kalau ruangan punya paket terkonfigurasi (`PACKAGES` di `server/.env` ruangan tsb), cashier bisa memilih paket saat aktivasi alih-alih mengisi durasi manual
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

## Topologi

PC Kasir terpisah dari PC ruangan. Tiap PC ruangan punya server-nya sendiri (lihat README root). Cashier konek ke **setiap server ruangan secara parallel** lewat `MultiSocketService` (1 socket per entry `VITE_ROOMS`).

## Konfigurasi Environment

Buat file `.env` di root folder cashier (atau copy dari `.env.example`):

```bash
# Mengaktifkan fitur billing (toggle global)
VITE_BILLING_ENABLED=true

# Konfigurasi ruangan (JSON array)
# Setiap ruangan = 1 PC server tersendiri. Isi 'ip' = IP PC ruangan tsb.
#
# Field WAJIB per entry:
#   - roomId: HARUS sama dengan ROOM_ID di agent/.env PC ruangan tersebut.
#   - name  : Nama tampilan di UI kasir.
#   - ip    : IP PC Ruangan (tempat server+agent jalan).
#   - port  : Port server ruangan (default 53331).
#
# Tarif per jam (pricePerHour) TIDAK diisi di sini - tiap PC ruangan mengirim
# tarifnya sendiri lewat env PRICE_PER_HOUR di server/.env ruangan tsb.

VITE_ROOMS=[
  {"roomId":"room-001","name":"Room 1","ip":"192.168.1.10","port":53331},
  {"roomId":"room-002","name":"Room 2","ip":"192.168.1.11","port":53331},
  {"roomId":"room-003","name":"Room 3","ip":"192.168.1.12","port":53331}
]
```

> **Penting**: `ip` adalah **IP PC Ruangan**, bukan IP PC Server terpusat. Karena tiap ruangan punya server sendiri.

### Konfigurasi Room

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `name` | string | Nama ruangan (ditampilkan di UI) |
| `ip` | string | IP address dimana agent berjalan |
| `port` | number | Port server (default: 53331) |

Tarif per jam (`pricePerHour`) dikonfigurasi lewat env `PRICE_PER_HOUR` di `server/.env` PC ruangan tersebut (default 50000), bukan lagi di cashier.

Paket harga tetap juga sepenuhnya dikonfigurasi di server (env `PACKAGES` di `server/.env` ruangan tsb), bukan di cashier - cashier hanya menampilkan daftar paket yang dikirim server (`AgentInfo.packages`) sebagai pilihan saat mengaktifkan ruangan. Kalau ruangan tidak punya `PACKAGES`, form aktivasi tetap seperti biasa (input menit manual).

## Konfigurasi Port

- Development: `http://localhost:53334`
- Production Preview: `http://localhost:53335`

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
│   ├── context/       # React Context (room config, loading state)
│   ├── layouts/       # Layout components
│   ├── pages/         # DashboardPage (halaman utama, satu-satunya page)
│   ├── services/      # Socket service (juga pemilik data transaksi)
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

Status dihitung di client (`src/utils/roomStatus.ts`), prioritas: OFFLINE > AKTIF > UNPAID > BERSIHKAN/SUDAH DIBERSIHKAN > ONLINE. Tidak ada status `PAID` tersendiri.

| Status | Deskripsi |
|--------|-----------|
| OFFLINE | Ruangan tidak terhubung ke server |
| AKTIF | Ruangan sedang digunakan |
| UNPAID | Ada transaksi belum lunas (`paidAt === 0`) |
| BERSIHKAN | Sudah dibayar, dalam 30 menit pertama setelah `paidAt` |
| SUDAH DIBERSIHKAN | 30-60 menit setelah `paidAt`, atau transaksi sudah ditandai `cleanedAt` |
| ONLINE | Terhubung, tidak aktif, dan lebih dari 60 menit sejak `paidAt` |

### Transisi Status Otomatis
- **UNPAID → BERSIHKAN**: Otomatis begitu transaksi ditandai lunas (`paidAt` terisi)
- **BERSIHKAN → SUDAH DIBERSIHKAN**: Otomatis 30 menit setelah `paidAt`
- **SUDAH DIBERSIHKAN → ONLINE**: Otomatis 60 menit setelah `paidAt`

### Fitur Cleaning Manual
- Tombol "Sudah Bersih" di modal riwayat transaksi menandai `cleanedAt` pada transaksi tsb, langsung memindahkan ke SUDAH DIBERSIHKAN tanpa menunggu 30 menit
- Tombol terpisah di kartu ruangan (`cashier:mark-room-cleaned`) khusus untuk ruangan yang di-vacate lewat fitur Pindah Ruangan (tidak ada transaksi baru untuk ruangan asal, jadi statusnya dilacak lewat `needsCleaning`/`lastTransactionEndTime`, bukan lewat transaksi)
- Ruangan dengan status BERSIHKAN tidak bisa diaktifkan
