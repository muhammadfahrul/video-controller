# Video Controller — Product Requirements Document

| | |
|---|---|
| **Versi** | 1.0 — disusun dari analisis kode sumber |
| **Status** | Draft, reverse-engineered |
| **Tanggal** | 4 September 2026 |
| **Komponen** | Agent · Server · Web · Cashier |

Sistem manajemen playlist & billing karaoke real-time — kontrol video YouTube per ruangan, aktivasi sesi, dan kasir multi-ruangan.

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Masalah & Tujuan](#2-masalah--tujuan)
3. [Pengguna](#3-pengguna)
4. [Arsitektur](#4-arsitektur)
5. [Fitur Inti](#5-fitur-inti)
6. [Aturan Bisnis — Billing & Status](#6-aturan-bisnis--billing--status)
7. [Model Data](#7-model-data)
8. [API & Event](#8-api--event)
9. [Kebutuhan Non-Fungsional](#9-kebutuhan-non-fungsional)
10. [Isu Terbuka & Risiko Diketahui](#10-isu-terbuka--risiko-diketahui)
11. [Ruang Lingkup](#11-ruang-lingkup)
12. [Metrik Sukses](#12-metrik-sukses)
13. [Glosarium](#13-glosarium)

---

## 1. Ringkasan

Video Controller adalah sistem operasional untuk tempat karaoke berbasis ruangan: setiap ruangan punya PC sendiri yang menjalankan browser YouTube terkontrol jarak jauh, dan satu PC kasir memantau serta menagih semua ruangan sekaligus.

Tamu di dalam ruangan (atau operator di kasir) mencari dan memutar video YouTube, menyusun antrean lagu, dan mengendalikan pemutaran dari tablet/HP yang terhubung ke **Web**. Di belakang layar, **Agent** menggerakkan browser Chrome sungguhan lewat DOM YouTube, **Server** menyinkronkan state lewat Socket.IO dan menghitung tagihan, dan **Cashier** memberi staf kasir satu dashboard untuk mengaktifkan ruangan, menagih, dan memantau status kebersihan — semua ruangan sekaligus, dari satu layar.

Sistem ini sudah berjalan (bukan konsep) — dokumen ini menjabarkan kembali perilaku yang ada di kode sumber (`agent/`, `server/`, `web/`, `cashier/`) sebagai spesifikasi produk, sekaligus menandai celah dan keputusan desain yang masih terbuka.

## 2. Masalah & Tujuan

### Masalah

- **Kontrol manual di dalam ruangan tidak praktis.** Tamu karaoke perlu mencari & mengganti lagu tanpa harus menyentuh PC/TV ruangan langsung.
- **Billing manual rawan selisih.** Menghitung durasi pakai dan tarif per ruangan dengan cara manual (kertas/stopwatch) rentan salah hitung dan sulit diaudit.
- **Operator kasir butuh satu titik pantau.** Dengan banyak ruangan berjalan paralel, staf perlu tahu ruangan mana aktif, mana kosong, mana yang belum dibersihkan — tanpa mondar-mandir fisik.
- **Setiap ruangan harus tetap independen.** Kalau jaringan atau server pusat mati, ruangan lain tidak boleh ikut lumpuh.

### Tujuan Produk

1. Kontrol pemutaran YouTube penuh (search, queue, play/pause/seek/volume/fullscreen) dari perangkat mobile di dalam ruangan.
2. Billing otomatis dan akurat berbasis durasi aktual atau paket harga tetap, dengan aturan pembulatan yang konsisten dan tidak bisa dimanipulasi dari client.
3. Dashboard kasir tunggal yang mengelola N ruangan sekaligus secara real-time, termasuk siklus pembayaran dan status kebersihan ruangan.
4. Ketahanan operasional: tiap ruangan tetap berfungsi independen dari ruangan lain, dengan auto-recovery saat browser/koneksi bermasalah.

> **Non-tujuan:** Sistem ini secara sadar **tidak** menyediakan sinkronisasi transaksi lintas-PC/cloud, akun pengguna berjenjang, integrasi payment gateway, atau dukungan platform video selain YouTube. Lihat §11 untuk cakupan lengkap.

## 3. Pengguna

### Tamu Ruangan — Pengguna Web (in-room)
- **Perangkat:** Tablet/HP terpasang di ruangan, atau PWA yang di-install
- **Tujuan:** Cari lagu, atur antrean, kendalikan volume & playback tanpa menyentuh PC ruangan
- **Frustrasi kalau:** Ruangan belum diaktifkan kasir (overlay offline menutup UI), atau video macet tanpa kontrol pemulihan

### Staf Kasir — Operator Cashier
- **Perangkat:** PC Kasir, satu dashboard untuk semua ruangan
- **Tujuan:** Aktifkan/perpanjang ruangan, konfirmasi pembayaran, pantau status kebersihan, pindahkan tamu antar-ruangan
- **Frustrasi kalau:** Status ruangan ambigu, atau tagihan tidak sesuai dengan durasi/paket yang disepakati

### Pemilik / Manajer — Pemantau Bisnis
- **Perangkat:** Tidak langsung — bergantung pada laporan/riwayat transaksi kasir
- **Tujuan:** Tarif per ruangan benar, paket harga fleksibel per ruangan, riwayat transaksi bisa diaudit & dicetak
- **Frustrasi kalau:** Data transaksi hilang saat server restart, atau tarif bisa dimanipulasi dari sisi client

### Teknisi — Instalasi & Perawatan PC
- **Perangkat:** Akses langsung ke tiap PC ruangan / PC kasir
- **Tujuan:** Instalasi cepat (native atau Docker), konfigurasi `ROOM_ID`/tarif per PC, autostart saat boot
- **Frustrasi kalau:** Agent browser gagal tampil di layar (headless salah), atau `roomId` tidak cocok antar-PC

## 4. Arsitektur

Topologi inti: **satu ruangan = satu PC terisolasi**. Tidak ada server pusat — kasir yang menyambung keluar ke tiap ruangan.

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│   PC Ruangan 1        │   │   PC Ruangan 2        │   │   PC Ruangan N        │
│   ROOM_ID=room-001    │   │   ROOM_ID=room-002    │   │   ROOM_ID=room-00N    │
│                       │   │                       │   │                       │
│   Agent  (Playwright  │   │   Agent  (Playwright  │   │   Agent  (Playwright  │
│    + Browser YouTube) │   │    + Browser YouTube) │   │    + Browser YouTube) │
│   Server (Socket.IO + │   │   Server (Socket.IO + │   │   Server (Socket.IO + │
│    Express + SQLite,  │   │    Express + SQLite,  │   │    Express + SQLite,  │
│    :53331)            │   │    :53331)            │   │    :53331)            │
│   Web (React PWA —    │   │   Web (React PWA —    │   │   Web (React PWA —    │
│    kontrol in-room)   │   │    kontrol in-room)   │   │    kontrol in-room)   │
└──────────┬────────────┘   └──────────┬────────────┘   └──────────┬────────────┘
           │ socket.io :53331          │ socket.io :53331          │ socket.io :53331
           └───────────────────────────┼───────────────────────────┘
                                        ▼
                       ┌───────────────────────────────────┐
                       │  PC Kasir                          │
                       │  Cashier — billing & monitoring     │
                       │  :53334                             │
                       │  1 socket per ruangan               │
                       │  (MultiSocketService)               │
                       │  VITE_ROOMS = [{roomId, ip, port},…]│
                       └───────────────────────────────────┘
```

- **Tidak ada server pusat.** Setiap PC ruangan menjalankan server-nya sendiri; agent hanya terlihat oleh server di PC-nya sendiri.
- **Cashier terhubung keluar ke N server** lewat satu socket per ruangan (`MultiSocketService`), didefinisikan lewat env `VITE_ROOMS`.
- **Transaksi bersifat lokal per PC.** Setiap server ruangan menyimpan billing-nya sendiri di SQLite — tidak ada agregasi/sinkronisasi otomatis lintas-ruangan.
- **Pencocokan ruangan bersifat exact-match.** `roomId` di `agent/.env` harus identik karakter-per-karakter dengan entry `VITE_ROOMS` di kasir — tidak ada fuzzy matching atau normalisasi huruf besar/kecil.

### Komponen

| Komponen | Peran | Stack | Ditempatkan di |
|---|---|---|---|
| **Agent** | Menggerakkan browser Chrome nyata via DOM YouTube; menjalankan health check & auto-recovery | Node.js + Playwright | Tiap PC ruangan (tampil di layar, bukan headless) |
| **Server** | Sumber kebenaran state ruangan, billing engine, penyimpanan transaksi, jembatan Socket.IO ke web/kasir/agent | Node.js + Express + Socket.IO + SQLite | Tiap PC ruangan, port `53331` |
| **Web** | UI kontrol video & playlist untuk tamu di dalam ruangan; PWA yang bisa di-install | React + Vite + Workbox | Tiap PC ruangan, opsional di-install di tablet |
| **Cashier** | Dashboard multi-ruangan: aktivasi, billing, status kebersihan, pindah ruangan | React + Vite | PC Kasir, port `53334` (dev) / `53335` (preview) |

## 5. Fitur Inti

### 5.1 — Siklus Aktivasi Ruangan

Ruangan tidak bisa dipakai sampai diaktifkan dari Cashier (kecuali `BILLING_ENABLED=false`, di mana semua ruangan otomatis `ONLINE` tanpa aktivasi manual).

1. **Agent register** — Agent connect ke server → status `WAITING` (billing aktif) atau langsung `ONLINE` (billing nonaktif).
2. **Aktivasi dari Cashier** — Dengan atau tanpa durasi/paket. Tanpa durasi → sesi walk-in, `expiresAt: null`. Dengan durasi → `expiresAt` = sekarang + durasi.
3. **Countdown & peringatan** — Timer disinkronkan ke waktu server (koreksi clock-skew). Peringatan otomatis di 5 menit, 2 menit, 1 menit, dan 30 detik tersisa.
4. **Perpanjangan** — Staf kasir bisa menambah waktu — dihitung dari `expiresAt` saat ini, bukan dari waktu klik, sehingga tidak memotong sisa waktu berjalan.
5. **Berakhir** — Otomatis saat waktu habis, atau manual dari kasir. Server mencatat transaksi, menonaktifkan ruangan, dan mengosongkan player/playlist agent.

### 5.2 — Kontrol Pemutaran Video

Perintah dikirim dari Web atau Cashier ke server, diteruskan ke agent lewat Socket.IO, dieksekusi lewat DOM YouTube di browser Playwright, lalu state disiarkan kembali (`player:update`) ke semua client yang terhubung ke ruangan itu — real-time, multi-client.

| Perintah | Efek |
|---|---|
| `OPEN_VIDEO` | Buka & putar video YouTube tertentu |
| `PLAY` / `PAUSE` / `STOP` | Kendali dasar pemutaran |
| `SEEK` | Lompat ke posisi waktu tertentu |
| `VOLUME` / `MUTE` / `UNMUTE` | Kendali audio, tersinkron ke semua client |
| `FULLSCREEN` / `EXIT_FULLSCREEN` / `TOGGLE_FULLSCREEN` | Mode layar penuh di browser agent |
| `SKIP_AD` / `SET_AUTO_SKIP_ADS` | Lewati iklan manual atau otomatis begitu tombol skip YouTube muncul |

### 5.3 — Manajemen Playlist

Antrean bersama per ruangan — semua client melihat urutan yang sama, tersinkron via `playlist:update`.

- `ADD_PLAYLIST` / `REMOVE_PLAYLIST` / `CLEAR_PLAYLIST` — kelola isi antrean
- `PLAY_PLAYLIST_ITEM` / `MOVE_PLAYLIST_ITEM` — putar/urutkan ulang item tertentu
- `SHUFFLE_PLAYLIST` — acak urutan pemutaran
- `REPEAT_OFF` / `REPEAT_ONE` / `REPEAT_ALL` — tiga command terpisah, masing-masing mengunci mode repeat tetap (bukan satu command dengan parameter mode)
- State player & playlist dipulihkan otomatis ke Web setelah reload/reconnect (`player:state`, `playlist:state`)

### 5.4 — Pencarian YouTube

Web memanggil `GET /api/search?keyword=…` di server ruangannya sendiri, yang meneruskan ke YouTube Data API (`YOUTUBE_API_KEY`). Hasil bisa langsung diputar (`OPEN_VIDEO`) atau ditambahkan ke antrean (`ADD_PLAYLIST`). Kegagalan API (kuota habis/key invalid) tidak mempengaruhi kontrol video lain — pencarian sepenuhnya independen dari path pemutaran.

### 5.5 — Billing & Transaksi

Server adalah satu-satunya sumber kebenaran harga. Saat sesi berakhir, server menghitung `totalPrice` dan menyimpannya sebagai transaksi `paidAt: 0` (belum dibayar). Kasir mengonfirmasi pembayaran dengan metode `cash` / `transfer` / `other`. Lihat §6 untuk aturan perhitungan lengkap.

> **Keamanan billing:** Client tidak bisa mengubah harga. `transaction:save` dari client hanya diterima untuk field non-harga (nama/telepon/email/catatan pelanggan, metode bayar, `paidAt`, `cleanedAt`, catatan) — field `totalPrice` dikunci di server. Update ke `id` transaksi yang tidak ada di database diabaikan, bukan membuat baris baru.

### 5.6 — Paket Harga Tetap

Tiap ruangan bisa punya nol atau lebih paket (mis. "Paket 2 Jam" = Rp150.000), didefinisikan di `server/.env` (`PACKAGES`) dan dikirim ke kasir lewat data agent — kasir sendiri tidak menyimpan harga. Saat aktivasi, paket yang dipilih di-snapshot (`packagePrice`, `packageDurationMinutes`) supaya perubahan harga di masa depan tidak mempengaruhi sesi yang sedang berjalan. Kelebihan waktu di atas durasi paket tetap ditagih per jam sesuai `PRICE_PER_HOUR` ruangan itu. Paket **tidak ikut pindah** saat Move Room (§5.8) atau di sesi berikutnya — state paket (`activePackageId`/`packagePrice`/`packageDurationMinutes`) di-reset ke `null` di agent setiap kali sesi berakhir (deaktivasi manual, auto-expiry, maupun move), jadi ruangan tujuan/sesi baru default kembali ke billing hourly kecuali paket dipilih ulang secara eksplisit.

### 5.7 — Status Ruangan & Alur Kebersihan

Status dihitung sepenuhnya di client kasir (`roomStatus.ts`) dari kombinasi koneksi socket, status aktif, dan riwayat transaksi — bukan satu field tunggal dari server.

| Status | Arti |
|---|---|
| `OFFLINE` | Server/agent tidak terhubung |
| `AKTIF` | Sesi sedang berjalan |
| `UNPAID` | Sesi selesai, belum dibayar |
| `BERSIHKAN` | Dibayar/dipindah < 30 menit lalu |
| `SUDAH DIBERSIHKAN` | 30–60 menit sejak lunas/pindah, atau ditandai manual |
| `ONLINE` | Siap dipakai, > 60 menit sejak dibayar |

Prioritas evaluasi: `OFFLINE > AKTIF > UNPAID > BERSIHKAN/SUDAH DIBERSIHKAN > ONLINE`. Tidak ada status "PAID" terpisah — begitu lunas, ruangan langsung masuk siklus kebersihan. Tombol aktivasi di kasir dinonaktifkan (UI-level, bukan ditolak server) selama ruangan berstatus `UNPAID` (ada transaksi belum lunas) atau `BERSIHKAN` (masih dalam ambang 30 menit) — staf harus menunggu sampai `SUDAH DIBERSIHKAN`/`ONLINE`, atau menandai bersih manual.

### 5.8 — Pindah Ruangan (Move Room)

Memindahkan sesi tamu yang sedang berjalan dari satu ruangan ke ruangan lain tanpa menagih dua kali dan tanpa kehilangan waktu yang sudah terpakai.

1. **Nonaktifkan ruangan asal** — Dengan alasan `"move"` — tidak ada transaksi dicatat untuk ruangan asal. Ruangan asal ditandai `needsCleaning: true`.
2. **Aktifkan ruangan tujuan** — Dengan `originalStartTime` disalin dari waktu mulai sesi asli — bukan waktu pindah — sehingga durasi terus dihitung dari awal sesi.
3. **Sesi berakhir di ruangan tujuan** — Satu transaksi tercatat, di ruangan tujuan, dengan durasi total mencakup waktu yang terpakai di kedua ruangan.

Ruangan asal boleh langsung ditandai bersih lewat aksi khusus (`cashier:mark-room-cleaned`) tanpa menunggu ambang 30/60 menit, karena tidak ada transaksi berbayar yang menjadi acuan waktunya.

### 5.9 — Dashboard Kasir Multi-Ruangan

Satu layar menampilkan seluruh ruangan yang terdaftar di `VITE_ROOMS` sebagai kartu independen (`RoomCard`), dengan modal untuk konfirmasi pembayaran (`PaymentConfirmModal`), riwayat transaksi (`TransactionModal`), pindah ruangan (`MoveRoomModal`), dan cetak struk (`PrintReceipt`). Kegagalan koneksi di satu ruangan (server mati, IP salah) tidak mempengaruhi ruangan lain — tiap ruangan punya socket sendiri.

### 5.10 — Pemantauan Kesehatan & Auto-Recovery

Agent menjalankan health check berkala (`HEALTH_INTERVAL`, default 5 detik) di empat lapis: `BrowserHealthCheck`, `PageHealthCheck`, `PlayerHealthCheck`, `VideoHealthCheck`. Pemulihan berjalan dua tingkat, disengaja terpisah:

- **Level halaman (in-process):** kalau yang gagal adalah page/player/video (browser masih hidup), `RecoveryEngine` menjalankan `RELOAD_PAGE` — reload halaman lalu memulihkan video, posisi putar, pengaturan, dan playback dari snapshot terakhir — tanpa mematikan proses agent.
- **Level browser (process-level):** kalau browser sendiri yang tidak sehat/tidak bisa dipulihkan, agent **sengaja menghentikan proses-nya sendiri** (`process.exit(1)`) alih-alih mencoba relaunch browser di dalam proses yang sama — proses dianggap dalam state tak terdefinisi setelah fatal error. Relaunch penuh diserahkan ke **process supervisor eksternal** (systemd/PM2/NSSM, atau restart policy Docker); lihat §9 — `install.sh`/`install.ps1` men-generate service systemd dengan `Restart=on-failure` dan `RestartSec=10` persis untuk menutup siklus ini.
- Baik jalur reload maupun exit-proses hanya terpicu setelah **3 kegagalan health check beruntun** (`shouldRecover()`, ambang `consecutiveFailures >= 3` di `HealthService`) — bukan langsung di kegagalan pertama, supaya glitch sesaat tidak memicu recovery/restart yang tidak perlu.

Kedua jalur melaporkan `agent:error` ke server, yang disiarkan ke client. Kehilangan heartbeat (~15 detik) menandai agent `OFFLINE` di server tanpa perlu restart manual.

### 5.11 — Web PWA

Web bisa di-install sebagai Progressive Web App (manifest fullscreen, service worker Workbox dengan `autoUpdate`). Shell aplikasi tetap tampil dari cache saat koneksi terputus; data real-time (Socket.IO) menunggu koneksi kembali. Cocok untuk tablet ruangan yang dipasang permanen tanpa chrome browser terlihat.

## 6. Aturan Bisnis — Billing & Status

### Perhitungan Harga

| Skenario | Basis durasi | Formula |
|---|---|---|
| Sesi dengan durasi dipesan (mis. booking 2 jam) | Durasi **penuh yang dipesan** (`expiresAt`), meski dinonaktifkan lebih awal | `ceil(durasi_detik / 3600) × PRICE_PER_HOUR`, minimum 1 blok jam per sesi |
| Sesi walk-in tanpa durasi (`expiresAt: null`) | Waktu **aktual** terpakai (`startTime` → waktu nonaktif) | sama seperti di atas |
| Sesi dengan paket | Harga paket tetap (`packagePrice`) + kelebihan waktu di atas durasi paket | `packagePrice + ceil(kelebihan_detik / 3600) × PRICE_PER_HOUR` |

Konsekuensi: memesan 2 jam lalu keluar setelah 30 menit tetap ditagih penuh 2 jam. Ini disengaja (mencegah booking dibatalkan sepihak tanpa konsekuensi), bukan bug — lihat skenario `ROOM-06` di `TEST_SCENARIOS.md`.

### Integritas Transaksi

- Server memvalidasi `isActive` sebelum menerima command — ruangan nonaktif menolak semua command video dengan pesan eksplisit, bukan diam-diam diabaikan.
- Deaktivasi dobel (klik ganda / race dengan auto-expiry) tidak boleh mencatat transaksi dua kali — server memeriksa status *sebelum* aktif diubah, dan membalik flag `isActive` secara sinkron sebelum langkah async pertama.
- Status aktivasi ruangan disimpan **in-memory di server**, bukan di database — restart server mengembalikan semua ruangan ke `WAITING` (kalau billing aktif); transaksi yang sudah tercatat tetap aman di SQLite.

### Ambang Waktu Status Kebersihan

| Sejak dibayar / dipindah | Status |
|---|---|
| 0 – 30 menit | `BERSIHKAN` |
| 30 – 60 menit | `SUDAH DIBERSIHKAN` |
| > 60 menit | `ONLINE` |

Ambang waktu dihitung dari waktu server ruangan tersebut (bukan jam PC kasir) untuk menghindari selisih jam antar-PC.

## 7. Model Data

### AgentInfo — state ruangan lengkap

| Field | Tipe | Keterangan |
|---|---|---|
| `status` | `ONLINE·OFFLINE·PLAYING·PAUSED·WAITING` | `WAITING` = menunggu aktivasi kasir |
| `isActive` | boolean | Gerbang utama — command video ditolak kalau `false` |
| `startTime` / `expiresAt` | timestamp \| null | `expiresAt: null` = sesi tanpa durasi (walk-in) |
| `pricePerHour` | number | Sumber kebenaran ada di `server/.env` ruangan, bukan kasir |
| `packages` / `activePackageId` | Package[] / string | Daftar paket ruangan & paket yang sedang dipakai |
| `needsCleaning` / `lastTransactionEndTime` | boolean / timestamp | Dipakai khusus jalur Move Room (§5.8) |
| `customerName/Phone/Email/Note` | string | Data tamu untuk sesi berjalan |
| `player` / `playlist` | PlayerState / PlaylistSnapshot | State pemutaran & antrean saat ini |

### Transaction — catatan billing

| Field | Keterangan |
|---|---|
| `startTime` / `endTime` / `duration` | Rentang sesi aktual yang ditagih (detik) |
| `pricePerHour` / `totalPrice` | Snapshot tarif saat transaksi dibuat; `totalPrice` tidak bisa diubah client |
| `packageId` / `packageName` / `packagePrice` | Terisi kalau sesi memakai paket harga tetap |
| `paidAt` | `0` = belum dibayar; > 0 = timestamp konfirmasi bayar |
| `paymentMethod` | `cash` · `transfer` · `other` |
| `cleanedAt` | Penanda manual "sudah bersih", melewati ambang waktu otomatis |

### PlayerState & PlaylistSnapshot

`PlayerState`: `playing, currentTime, duration, volume, muted, fullscreen, title, videoId`. `PlaylistSnapshot`: daftar `items[]` (videoId, title, channel, duration, thumbnail) + `currentIndex, repeat, shuffle`. Keduanya disiarkan utuh setiap kali berubah — client tidak melakukan diffing sendiri.

## 8. API & Event

### REST API

| Endpoint | Guna |
|---|---|
| `GET /health` | Status lengkap: uptime, memory, daftar agent terkoneksi |
| `GET /health/live` | Liveness probe (plain `200 OK`) |
| `GET /health/ready` | Readiness probe — `{ ready, agents }` |
| `GET /api/agents` | Daftar agent yang terdaftar di server ini (bukan lintas-server) |
| `POST /api/command` | Kirim command video ke agent tertentu lewat REST (alternatif dari path socket langsung) |
| `GET /api/search?keyword=…` | Proksi ke YouTube Data API |

### Socket.IO Events

| Event | Arah | Guna |
|---|---|---|
| `agent:register` | Agent → Server | Registrasi awal, membawa `roomId`/`roomName` |
| `agent:heartbeat` | Agent → Server | Deteksi online/offline (~15 detik timeout) |
| `player:command` | Web/Kasir → Server → Agent | Semua perintah pemutaran & playlist (§5.2, §5.3) |
| `player:state` / `player:update` | Server ↔ Client | Snapshot penuh vs. delta perubahan player |
| `playlist:state` / `playlist:update` | Server ↔ Client | Snapshot penuh vs. delta perubahan antrean |
| `cashier:activate-room` | Kasir → Server | Aktivasi ruangan, opsional durasi/paket |
| `cashier:deactivate-room` | Kasir → Server | Nonaktifkan manual, memicu pencatatan transaksi |
| `cashier:extend-time` | Kasir → Server | Tambah waktu ke `expiresAt` berjalan |
| `cashier:mark-room-cleaned` | Kasir → Server | Tandai bersih manual (jalur Move Room maupun transaksi biasa) |
| `agent:clear-data` | Server → Agent | Kosongkan player/playlist saat sesi berakhir |
| `transaction:save / get / delete / clear` | Kasir ↔ Server | CRUD transaksi — `save` dibatasi field non-harga (§5.5) |
| `agent:error` | Agent → Server → Client | Laporan error/recovery untuk ditampilkan ke operator |
| `client:request-state` | Web → Server | Web minta ulang `agents:update` (mis. setelah reconnect) |
| `cashier:request-agents` | Kasir → Server | Kasir minta ulang `agents:update` |
| `agent:activation` | Server → Agent (privat, socket agent ybs) | Kasih tahu satu agent statusnya aktif/nonaktif — beda dari `room:activation` di bawah, ini hanya sampai ke agent tsb |
| `room:activation` | Server → semua Client | Broadcast perubahan status aktivasi ruangan ke seluruh client (web/kasir), bukan cuma agent-nya |

Selain daftar di atas, alur operasional juga bergantung pada broadcast turunan seperti `agents:update` dan `room:expiry-warning` (dengan `secondsRemaining` 300/120/60/30) yang dipicu server sebagai efek samping dari event-event di atas.

## 9. Kebutuhan Non-Fungsional

### Deployment

- **Native:** Node.js 18+, tiap komponen di-build & dijalankan terpisah (`npm run build` / `npm start`), dikoordinasikan lewat `install.sh` (Linux, bash) / `install.ps1` (Windows, PowerShell). Menu interaktif: `[1]` Room App, `[2]` Kasir, `[3]` Semua (native); `[A]`–`[C]` pasang autostart (systemd di Linux) untuk Room App/Kasir/Semua, `[D]`–`[F]` mencabutnya; `[G]`–`[J]` mode Docker. Systemd unit yang digenerate memakai `Restart=on-failure` + `RestartSec=10`, sehingga proses yang keluar (lihat §5.10) otomatis naik lagi dalam ~10 detik.
- **Docker:** tiap service (`agent`, `server`, `web`, `cashier`) punya Dockerfile sendiri; `docker-compose.yml` untuk Room App, `docker-compose.cashier.yml` untuk kasir. Build dilakukan satu service per satu (bukan paralel) khusus untuk `docker-room`/`docker-all`, karena build TypeScript paralel bisa kehabisan memori host.
- **Batasan platform agent:** agent butuh browser Chrome yang benar-benar tampil di layar (`BROWSER_HEADLESS=false`). Di Docker, ini hanya berjalan di **Linux** lewat X11 passthrough ke display host (`xhost +si:localuser:$(whoami)` sekali per sesi, container mem-mount `$DISPLAY`). Di **Windows** tidak ada padanan X11 — `install.ps1` mode `docker-room`/`docker-all` mencetak peringatan eksplisit dan hanya men-Docker-kan `server`+`web`; agent tetap wajib native di PC ruangan itu.

### Konfigurasi

| File | Variabel kunci |
|---|---|
| `server/.env` | `PORT, YOUTUBE_API_KEY, BILLING_ENABLED, PRICE_PER_HOUR, PACKAGES` |
| `agent/.env` | `ROOM_ID, ROOM_NAME, BILLING_ENABLED, SERVER_IP/PORT, BROWSER_HEADLESS, BROWSER_ARGS, HEALTH_INTERVAL` |
| `web/.env` | `VITE_SERVER_IP, VITE_SERVER_PORT, VITE_BILLING_ENABLED` |
| `cashier/.env` | `VITE_ROOMS` (JSON array roomId/name/ip/port), `VITE_BILLING_ENABLED` |

### Keandalan & Ketahanan

- Ruangan independen — kegagalan satu server/agent tidak menjatuhkan ruangan lain maupun kasir.
- Reconnect Socket.IO otomatis pada putus jaringan singkat; state dipulihkan dari server setelah reconnect (tidak perlu restart manual).
- Health check 4-lapis + recovery dua tingkat di agent (§5.10): reload halaman in-process untuk kegagalan page/player/video, exit proses + supervisor eksternal untuk kegagalan browser. **Prasyarat operasional:** deployment production wajib menjalankan agent di bawah process supervisor dengan auto-restart (systemd `Restart=on-failure` seperti digenerate `install.sh`, atau PM2/NSSM/Docker restart policy setara) — tanpa ini, agent yang exit karena browser unrecoverable tidak akan pernah kembali online secara mandiri.

### Keamanan

- Perhitungan harga sepenuhnya di server — client tidak pernah mengirim/menentukan `totalPrice`.
- CORS terbuka untuk semua origin (arsitektur LAN tertutup, bukan diekspos ke internet publik oleh desain).
- Tidak ada lapisan otentikasi pengguna eksplisit di REST/Socket.IO saat ini — keamanan bertumpu pada isolasi jaringan LAN per venue.

### State Management Frontend (Web & Cashier)

Web dan Cashier sama-sama tidak pakai Zustand/Redux — proyek ini sebelumnya memakai Zustand (jejaknya masih ada di komentar historis `web/src/context/LoadingContext.tsx`: "the old Zustand setProcessing reducer") sebelum bermigrasi ke kombinasi dua pola sesuai sumber datanya:

- **React Context** — untuk state murni UI yang hidup di dalam pohon komponen (mis. `LoadingContext` di web: flag loading/processing per aksi).
- **Singleton service dengan pub/sub** — untuk data yang didorong Socket.IO (agent/player/playlist state). `AppStateService` (web) dan `MultiSocketService` (cashier) sengaja menyimpan state ini **di luar** pohon React, karena data ditulis oleh listener socket biasa yang diinstansiasi/berjalan sebelum React sempat render — React Context sendiri tidak punya jalur tulis imperatif untuk pemanggil di luar komponen.

## 10. Isu Terbuka & Risiko Diketahui

> **Open — persistensi playlist:** Playlist tidak sepenuhnya bertahan lewat restart di database; berbeda dari isu "stuck paused" (item playlist yang sedang diputar dibuka ulang merusak state player YouTube) yang sudah diperbaiki dengan guard di `YouTubePlayer.doOpen()`, masalah persistensi DB playlist masih terbuka.

### Sudah diperbaiki (dicatat sebagai konteks, bukan tugas baru)

- Manipulasi harga dari client saat sesi cashier — server sekarang memegang penuh perhitungan billing dan menolak transaksi yang dipalsukan.
- Bug reset durasi saat Move Room — delay perpindahan sempat ikut tertagih dan membulatkan ke atas satu jam ekstra.
- Reconnect agent (`agent:register`) sempat menghapus state sesi aktif (`expiresAt`/`startTime`/data pelanggan) — sudah diperbaiki, reconnect tidak lagi menonaktifkan sesi berjalan.
- Race condition konkurensi `YouTubePlayer` yang menyebabkan crash fatal "Player is navigating" — method yang menyentuh halaman sekarang diserialisasi lewat antrean.
- Bug deploy Docker: health check server salah path, autentikasi X11 agent butuh root, agent tanpa audio, viewport kiosk-mode agent salah — seluruhnya sudah diperbaiki.

### Risiko arsitektural yang perlu disadari (bukan bug, tapi trade-off desain)

- **Status aktivasi in-memory:** restart server ruangan mengembalikan semua sesi aktif ke `WAITING` — tidak ada pemulihan sesi otomatis pasca-restart, staf harus mengaktifkan ulang manual.
- **Tidak ada agregasi transaksi lintas-ruangan:** laporan pendapatan gabungan semua ruangan (kalau dibutuhkan) harus dibangun sebagai fitur terpisah — saat ini data sepenuhnya silo per PC/SQLite.
- **Pencocokan `roomId` case-sensitive & exact:** kesalahan ketik kecil di konfigurasi (`Room-001` vs `room-001`) membuat ruangan tampak `OFFLINE` tanpa pesan error yang jelas ke staf.

## 11. Ruang Lingkup

**Dalam cakupan** — Kontrol video YouTube penuh, playlist bersama, billing per-jam & paket, dashboard kasir multi-ruangan, status kebersihan otomatis, pindah ruangan, PWA offline-shell, health monitoring & auto-recovery agent, deployment native maupun Docker (Linux/Windows dengan batasan agent).

**Di luar cakupan (saat ini)** — Sinkronisasi transaksi lintas-PC/cloud, integrasi payment gateway otomatis, akun/peran pengguna berjenjang (login staf individual), dukungan platform video selain YouTube, laporan analitik pendapatan gabungan, otentikasi API/socket berbasis token.

## 12. Metrik Sukses

| Metrik | Target operasional |
|---|---|
| Akurasi billing | 0 selisih antara durasi/paket yang disepakati dan `totalPrice` tercatat — tidak ada transaksi hasil manipulasi client yang lolos |
| Waktu deteksi ruangan offline | ≤ 15 detik sejak agent berhenti mengirim heartbeat |
| Ketahanan multi-ruangan | Kegagalan 1 ruangan (server/agent/network) tidak menurunkan ruangan lain di kasir yang sama |
| Zero double-billing | Deaktivasi ganda (klik dobel, race auto-expiry) tidak pernah menghasilkan 2 transaksi untuk 1 sesi |
| Waktu pulih otomatis | Crash browser/halaman di agent pulih tanpa intervensi manual staf, tercatat lewat `agent:error` |

## 13. Glosarium

| Istilah | Arti |
|---|---|
| `Agent` | Proses per ruangan yang menggerakkan browser Chrome untuk memutar YouTube |
| `Room` / Ruangan | Unit operasional 1 PC = 1 ruangan karaoke, diidentifikasi lewat `ROOM_ID` |
| `Walk-in` | Sesi tanpa durasi dipesan di muka — ditagih dari waktu aktual terpakai |
| `Paket` | Harga tetap untuk durasi tetap (mis. "Paket 2 Jam"), opsional per ruangan |
| `Move Room` / Pindah Ruangan | Memindahkan sesi berjalan ke ruangan lain tanpa menagih ulang dari nol |
| `BERSIHKAN` | Status ruangan: baru selesai dibayar/dipindah, menunggu dibersihkan (< 30 menit) |
| `SUDAH DIBERSIHKAN` | Status ruangan: jendela 30–60 menit sejak lunas/pindah, atau ditandai manual |
| `Kasir` / Cashier | PC & aplikasi tunggal yang memantau serta menagih semua ruangan |

---

*Video Controller — Product Requirements Document. Disusun dari analisis kode sumber pada 4 September 2026.*
