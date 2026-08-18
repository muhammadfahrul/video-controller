# Skenario Test - Video Controller

Dokumen ini berisi skenario pengujian manual (QA) untuk sistem Video Controller (Agent + Server + Web + Cashier). Skenario disusun berdasarkan perilaku aktual di source code (bukan asumsi), supaya hasil pengujian bisa dipercaya.

Referensi arsitektur & protokol lengkap: lihat `README.md` (root), serta README masing-masing komponen (`agent/`, `server/`, `web/`, `cashier/`).

## Cara Pakai Dokumen Ini

- Setiap skenario punya ID, precondition, langkah, dan expected result.
- Jalankan sesuai urutan section untuk pengujian penuh (end-to-end), atau lompat ke section tertentu untuk regresi fitur spesifik.
- Kolom **Expected Result** mengacu ke perilaku nyata di kode (`server/src/socket/SocketServer.ts`, `cashier/src/utils/roomStatus.ts`, dll) - kalau hasil aktual berbeda, itu kemungkinan bug, bukan salah skenario.
- Status **PASS/FAIL** dan catatan bisa ditambahkan sendiri di kolom terakhir saat eksekusi.

## Prasyarat / Environment Setup

Minimal 1 PC ruangan (Agent + Server + Web jalan di PC yang sama) dan 1 PC/browser untuk Cashier. Untuk skenario multi-room, siapkan 2+ PC ruangan (atau 2+ instance server dengan port berbeda di 1 mesin untuk simulasi).

| # | Item | Nilai contoh |
|---|------|---------------|
| 1 | Server ruangan A | `PORT=53331`, `PRICE_PER_HOUR=50000`, `BILLING_ENABLED=true` |
| 2 | Agent ruangan A | `ROOM_ID=room-001`, `ROOM_NAME=Room 1`, `SERVER_IP=<ip PC A>`, `SERVER_PORT=53331` |
| 3 | Web ruangan A | `VITE_SERVER_IP=127.0.0.1`, `VITE_SERVER_PORT=53331` |
| 4 | Cashier | `VITE_ROOMS=[{"roomId":"room-001","name":"Room 1","ip":"<ip PC A>","port":53331}]` |

Pastikan `roomId` di cashier **persis sama** dengan `ROOM_ID` di agent - server hanya exact-match, tidak ada fuzzy matching.

---

## 1. Koneksi & Registrasi (SETUP)

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| SETUP-01 | Server ruangan A sudah running | Jalankan agent (`npm run dev` di `agent/`) | Browser Chrome terbuka otomatis ke YouTube. Console server menampilkan log `[CONNECT]` lalu `Agent register`. `GET /api/agents` di server A mengembalikan array berisi agent ini dengan `roomId: "room-001"` |
| SETUP-02 | Agent sudah register, `BILLING_ENABLED=true`, ruangan belum pernah diaktifkan sejak server start | Cek field `status` pada `GET /api/agents` | `status: "WAITING"`, `isActive: false` (agent menunggu aktivasi dari cashier) |
| SETUP-03 | `BILLING_ENABLED=false` di server | Jalankan agent | `status: "ONLINE"`, `isActive: true` langsung tanpa perlu aktivasi cashier (billing dimatikan = semua ruangan otomatis aktif) |
| SETUP-04 | Agent & server jalan | Buka Web (`http://localhost:53332` dev, atau via PWA yang sudah di-install) | Web berhasil connect ke server (bukan ke server lain). Jika `isActive: false`, overlay "Ruangan Offline / Silakan aktifkan ruangan dari cashier" muncul menutup UI |
| SETUP-05 | Server A & B (2 ruangan berbeda) jalan | Buka Cashier, isi `VITE_ROOMS` dengan 2 entry | Cashier membuka 2 socket connection paralel (1 per ruangan). Dashboard menampilkan stat "Ruangan: 2", "Online" bertambah sesuai jumlah yang berhasil connect |
| SETUP-06 | Cashier baru dibuka | Amati network/console | Cashier mengirim `cashier:request-agents` dan `transaction:get` ke tiap socket saat connect, lalu menerima `agents:update` dan `transaction:get` balasan |

---

## 2. Aktivasi & Deaktivasi Ruangan (ROOM)

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| ROOM-01 | Ruangan status WAITING (agent baru connect, belum aktif) | Di Cashier, aktifkan ruangan **tanpa** mengisi durasi | `isActive: true`, `expiresAt: null`, `startTime` = waktu aktivasi. Status di cashier berubah jadi **AKTIF**. Overlay offline di Web hilang, kontrol video jadi bisa dipakai |
| ROOM-02 | Ruangan tidak aktif | Aktifkan dengan durasi tertentu (mis. 60 menit) | `expiresAt` = now + 60 menit. Web & Cashier menerima `room:activation`/`agent:activation` berisi `expiresAt`. Timer countdown di UI berjalan mundur dari 60 menit |
| ROOM-03 | Ruangan aktif dengan durasi & sisa waktu mendekati 5 menit/2 menit/1 menit/30 detik | Tunggu sampai salah satu threshold tercapai | Event `room:expiry-warning` diterima dengan `secondsRemaining` sesuai threshold (300/120/60/30 detik). UI menampilkan peringatan waktu hampir habis |
| ROOM-04 | Ruangan aktif dengan durasi, waktu habis (`expiresAt` terlewati) | Tunggu sampai waktu habis tanpa aksi manual | Ruangan otomatis nonaktif (`isActive: false`, `expiresAt: null`). Transaksi baru tercatat dengan `paidAt: 0` (UNPAID). Player/playlist agent dikosongkan (`agent:clear-data`). Status cashier berubah ke **UNPAID** |
| ROOM-05 | Ruangan aktif dengan durasi tersisa | Klik "Perpanjang" (mis. tambah 60 menit) | `expiresAt` bertambah 60 menit dari waktu expiry saat ini (bukan dari sekarang). Timer warning & expiry di-reset mengikuti `expiresAt` baru |
| ROOM-06 | Ruangan aktif **dengan durasi** (mis. booking 2 jam), baru berjalan 30 menit | Cashier klik nonaktifkan manual (bukan lewat Move Room) | **Penting**: transaksi dicatat berdasarkan **durasi penuh yang dibooking** (`expiresAt`), bukan waktu aktual yang terpakai (30 menit) - jadi customer tetap ditagih untuk 2 jam penuh, bukan 30 menit. Verifikasi `totalPrice` transaksi = harga untuk 2 jam |
| ROOM-07 | Ruangan aktif **tanpa** durasi (walk-in, `expiresAt: null`) | Cashier klik nonaktifkan manual setelah beberapa saat | Transaksi dicatat berdasarkan **waktu aktual berjalan** (dari `startTime` sampai sekarang), dibulatkan ke atas per blok jam |
| ROOM-08 | Ruangan tidak aktif (`isActive: false`) | Kirim command video (mis. Play) dari Web/Cashier ke room ini | Command **ditolak** oleh server dengan pesan error "Agent is not active. Please activate from cashier first." Video di agent tidak berubah |
| ROOM-09 | Server baru saja di-restart (agent belum reconnect) | Cek status ruangan yang sebelumnya aktif | Status aktivasi (`activatedRooms`) disimpan **in-memory di server**, bukan di database - setelah restart server, ruangan yang tadinya aktif kembali ke default (WAITING kalau billing enabled). Perlu aktivasi ulang dari cashier |

---

## 3. Kontrol Video / Player (PLAYER)

Semua skenario di bawah butuh ruangan dalam status **AKTIF**.

| ID | Command | Langkah | Expected Result |
|----|---------|---------|------------------|
| PLAYER-01 | `OPEN_VIDEO` | Search video di Web/Cashier, klik play/putar | Video terbuka & mulai diputar di browser agent |
| PLAYER-02 | `PLAY` / `PAUSE` | Klik tombol play saat paused, lalu pause saat playing | State player (`playing: true/false`) berubah sesuai, tersinkron real-time ke semua client yang connect ke ruangan ini via `player:update` |
| PLAYER-03 | `STOP` | Klik stop saat video sedang diputar | Video berhenti, state player di-reset |
| PLAYER-04 | `NEXT` / `PREVIOUS` | Dengan playlist berisi 2+ item, klik next lalu previous | Video pindah ke item berikutnya/sebelumnya di playlist |
| PLAYER-05 | `SEEK` | Geser progress bar ke posisi tertentu | Video melompat ke `currentTime` yang diminta |
| PLAYER-06 | `VOLUME` | Ubah slider volume (0-100) | Volume video berubah sesuai, tersinkron ke semua client |
| PLAYER-07 | `MUTE` / `UNMUTE` | Klik ikon mute, lalu unmute | Audio video mati/nyala sesuai |
| PLAYER-08 | `FULLSCREEN` / `EXIT_FULLSCREEN` / `TOGGLE_FULLSCREEN` | Klik tombol fullscreen | Video masuk/keluar mode fullscreen di browser agent |
| PLAYER-09 | `SKIP_AD` | Saat iklan YouTube tampil, klik skip ad | Iklan di-skip (kalau tombol skip YouTube sudah tersedia) |
| PLAYER-10 | `SET_AUTO_SKIP_ADS` | Aktifkan toggle auto-skip ads, lalu putar video yang ada iklan | Iklan otomatis di-skip tanpa aksi manual begitu tombol skip muncul |

---

## 4. Manajemen Playlist (PLAYLIST)

| ID | Command | Langkah | Expected Result |
|----|---------|---------|------------------|
| PLAYLIST-01 | `ADD_PLAYLIST` | Tambahkan 3 video berbeda ke queue | Queue bertambah 3 item, urutan sesuai urutan penambahan, tersinkron via `playlist:update` |
| PLAYLIST-02 | `REMOVE_PLAYLIST` | Hapus 1 item dari tengah queue | Item terhapus, sisa item lain tetap urut |
| PLAYLIST-03 | `CLEAR_PLAYLIST` | Klik clear queue saat ada beberapa item | Queue kosong total (`items: []`, `currentIndex: -1`) |
| PLAYLIST-04 | `PLAY_PLAYLIST_ITEM` | Dengan 3+ item di queue, klik play pada item ke-3 | Video langsung pindah memutar item ke-3, `currentIndex` update sesuai |
| PLAYLIST-05 | `SHUFFLE_PLAYLIST` | Dengan 4+ item, aktifkan shuffle | Urutan playlist teracak, `shuffle: true` |
| PLAYLIST-06 | `REPEAT_OFF` / `REPEAT_ONE` / `REPEAT_ALL` | Set repeat one, biarkan video sampai selesai | Video yang sama diputar ulang (repeat one). Ulangi untuk repeat all (playlist looping) dan repeat off (berhenti di akhir) |
| PLAYLIST-07 | - | Reload halaman Web di tengah playlist berjalan | State playlist & player yang tersimpan di server (via `player:state`/`playlist:state`) di-restore ke Web setelah reconnect |

---

## 5. Pencarian YouTube (SEARCH)

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| SEARCH-01 | Server punya `YOUTUBE_API_KEY` valid | Ketik keyword di halaman Search (Web) | `GET /api/search?keyword=...` mengembalikan daftar video YouTube yang relevan |
| SEARCH-02 | `YOUTUBE_API_KEY` kosong/invalid | Lakukan pencarian | Response `500` dengan `{ message: "Search failed" }`, UI menampilkan error yang wajar (bukan crash) |
| SEARCH-03 | Hasil pencarian tampil | Klik salah satu hasil untuk dimainkan/ditambah ke queue | Video ter-trigger `OPEN_VIDEO` atau `ADD_PLAYLIST` sesuai aksi yang diklik |

---

## 6. Billing & Transaksi (BILLING)

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| BILLING-01 | `PRICE_PER_HOUR=50000` | Sesi berjalan tepat 60 menit lalu deactivate | `totalPrice = 50000` (1 blok jam penuh) |
| BILLING-02 | `PRICE_PER_HOUR=50000` | Sesi berjalan 61 menit (lewat 1 jam) lalu deactivate | `totalPrice = 100000` - dibulatkan **ke atas** ke blok jam berikutnya (`ceil(durationSeconds/3600) * pricePerHour`), bukan pro-rata |
| BILLING-03 | `PRICE_PER_HOUR=50000` | Sesi berjalan 5 menit lalu deactivate | `totalPrice = 50000` (minimum 1 jam per sesi) |
| BILLING-04 | Ada transaksi baru, `paidAt: 0` (UNPAID) | Konfirmasi pembayaran di Cashier (pilih metode: cash/transfer/other) | `paidAt` terisi timestamp sekarang, `paymentMethod` tersimpan. Status ruangan berubah dari UNPAID ke BERSIHKAN |
| BILLING-05 | Ada transaksi lunas | Coba edit `totalPrice` transaksi lewat client (mis. via devtools kirim `transaction:save` dengan `totalPrice` custom) | Server **mengabaikan** field harga - `totalPrice` tidak berubah, karena server hanya menerima update field: `customerName`, `customerPhone`, `customerEmail`, `customerNote`, `paymentMethod`, `paidAt`, `cleanedAt`, `notes` |
| BILLING-06 | Kirim `transaction:save` dengan `id` transaksi yang tidak ada di database | - | Update diabaikan (`Ignored transaction:save for unknown id`), tidak membuat transaksi baru |
| BILLING-07 | Ada beberapa transaksi di suatu ruangan | Hapus satu transaksi (`transaction:delete`) | Transaksi tsb hilang dari riwayat, transaksi lain tidak terpengaruh |
| BILLING-08 | Ada banyak transaksi lintas ruangan | Klik "Hapus semua transaksi" untuk 1 ruangan spesifik (`transaction:clear` dengan `roomId`) | Hanya transaksi ruangan tsb yang terhapus, ruangan lain tetap ada |
| BILLING-09 | - | Klik "Hapus semua transaksi" tanpa filter ruangan | Seluruh transaksi di server ini terhapus |
| BILLING-10 | `BILLING_ENABLED=false` di server & cashier | Coba akses fitur billing di cashier | Fitur billing disembunyikan/nonaktif total di UI cashier |

---

## 7. Status Ruangan & Transisi Waktu (STATUS)

Status dihitung di **client** (`cashier/src/utils/roomStatus.ts`), prioritas evaluasi: `OFFLINE > AKTIF > UNPAID > BERSIHKAN/SUDAH DIBERSIHKAN > ONLINE`. **Tidak ada status "PAID"** - begitu lunas langsung masuk BERSIHKAN.

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| STATUS-01 | Server ruangan mati / agent tidak connect | Buka Cashier | Status = **OFFLINE**, warna merah |
| STATUS-02 | Ruangan sedang dipakai (`isActive: true`) | - | Status = **AKTIF**, warna biru - prioritas tertinggi setelah OFFLINE (menutupi status transaksi apa pun) |
| STATUS-03 | Ruangan tidak aktif, ada transaksi `paidAt: 0` | - | Status = **UNPAID**, warna oranye |
| STATUS-04 | Transaksi baru saja dibayar (`paidAt` = sekarang) | Cek status segera setelah bayar | Status = **BERSIHKAN**, warna kuning |
| STATUS-05 | Transaksi dibayar 29 menit lalu, belum `cleanedAt` | Cek status | Masih **BERSIHKAN** (< 30 menit) |
| STATUS-06 | Transaksi dibayar 31 menit lalu, belum `cleanedAt` | Cek status | Berubah otomatis jadi **SUDAH DIBERSIHKAN**, warna cyan |
| STATUS-07 | Transaksi dibayar 61 menit lalu | Cek status | Berubah otomatis kembali ke **ONLINE**, warna abu-abu |
| STATUS-08 | Transaksi dibayar, masih dalam window 30 menit | Klik tombol "Sudah Bersih" di modal riwayat transaksi (set `cleanedAt` manual) | Status langsung berubah ke **SUDAH DIBERSIHKAN** tanpa menunggu 30 menit |
| STATUS-09 | Semua transaksi paid untuk ruangan ini sudah `cleanedAt` | Cek status | Status = **SUDAH DIBERSIHKAN** (bukan balik ke UNPAID walau lewat 60 menit dari transaksi lama) |
| STATUS-10 | Status ruangan = BERSIHKAN | Coba aktifkan ruangan dari cashier | **Ditolak/diblokir** - ruangan tidak bisa diaktifkan sampai status SUDAH DIBERSIHKAN |
| STATUS-11 | Status ruangan = SUDAH DIBERSIHKAN atau ONLINE | Coba aktifkan ruangan | Berhasil diaktifkan normal |

---

## 8. Pindah Ruangan / Move Room (MOVE)

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| MOVE-01 | Ruangan A aktif dengan durasi (misal booking 2 jam, sudah 30 menit berjalan), Ruangan B kosong & siap | Gunakan fitur "Pindah Ruangan" dari A ke B | Ruangan A dinonaktifkan dengan `reason: "move"` - **tidak ada transaksi baru dicatat untuk A**. Ruangan B diaktifkan dengan `originalStartTime` = `startTime` original dari A (bukan waktu sekarang), sehingga durasi dihitung dari awal sesi asli, bukan double-billing |
| MOVE-02 | Setelah MOVE-01 | Cek status Ruangan A | Ruangan A **tidak** masuk UNPAID (karena tidak ada transaksi), tapi `needsCleaning: true` dan `lastTransactionEndTime` terisi waktu pindah - status ditampilkan sebagai BERSIHKAN berdasarkan `needsCleaning`, bukan berdasarkan transaksi |
| MOVE-03 | Ruangan A hasil Move Room, status BERSIHKAN (< 30 menit sejak pindah) | Klik tombol tandai bersih khusus ruangan (bukan tombol di modal transaksi) - trigger `cashier:mark-room-cleaned` | `needsCleaning` di-clear jadi `false`, `lastTransactionEndTime` di-reset - status kembali ke ONLINE tanpa menunggu 30/60 menit |
| MOVE-04 | Setelah sesi akhirnya diakhiri di Ruangan B (deactivate normal) | Cek transaksi yang tercatat | Transaksi tercatat **hanya di Ruangan B**, dengan durasi terhitung dari `startTime` original di Ruangan A (total durasi sesi utuh, bukan cuma waktu di B) |

---

## 9. Multi-Room & Multi-Client (MULTI)

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| MULTI-01 | 3 server ruangan berbeda jalan, `VITE_ROOMS` cashier berisi 3 entry | Buka Cashier | Dashboard menampilkan stat "Ruangan: 3" dan status masing-masing independen (aktivasi 1 ruangan tidak mempengaruhi ruangan lain) |
| MULTI-02 | 3 ruangan seperti di atas | Matikan server salah satu ruangan (mis. Ruangan 2) | Hanya Ruangan 2 yang jadi OFFLINE di cashier, Ruangan 1 & 3 tetap normal (koneksi socket independen per ruangan) |
| MULTI-03 | 1 ruangan sama dibuka di 2 device Web berbeda (mis. tablet + laptop) sekaligus | Kirim command play dari device 1 | Kedua device menerima `player:update` yang sama secara real-time (state tersinkron di semua client) |
| MULTI-04 | 1 ruangan dibuka Cashier + Web bersamaan | Aktifkan/nonaktifkan dari Cashier | Web menerima `agent:activation` dan overlay offline muncul/hilang sesuai, tanpa perlu refresh manual |
| MULTI-05 | Transaksi di server Ruangan A tersimpan | Cek dari server Ruangan B (`GET /api/agents` atau transaksi B) | Transaksi Ruangan A **tidak muncul** di server B - data transaksi sepenuhnya lokal per PC ruangan, tidak ada sinkronisasi antar-server |

---

## 10. Disconnect / Recovery (RECOVERY)

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| RECOVERY-01 | Agent connect & aktif | Matikan proses agent paksa (kill) tanpa disconnect graceful | Dalam ~15 detik (setelah heartbeat tidak diterima), server menandai agent `status: "OFFLINE"` dan broadcast `agents:update` ke semua client |
| RECOVERY-02 | Setelah RECOVERY-01, agent OFFLINE | Nyalakan ulang agent | Agent register ulang. Jika ruangan sebelumnya sudah diaktifkan (`activatedRooms` masih ada di memori server, server tidak restart), agent langsung dapat `agent:activation isActive:true` tanpa perlu aktivasi ulang dari cashier |
| RECOVERY-03 | Web sedang terbuka, agent ruangan itu disconnect | Amati Web | `AgentOfflineOverlay` muncul otomatis dengan pesan "Ruangan Offline / Silakan aktifkan ruangan dari cashier" |
| RECOVERY-04 | Browser YouTube di agent crash (Playwright browser mati) | Amati agent | Auto-recovery agent mencoba relaunch browser (lihat `agent/src/recovery/`), agent mengirim `agent:error` ke server yang tersimpan & di-broadcast ke client |
| RECOVERY-05 | Koneksi network PC ruangan terputus sementara (unplug LAN) | Sambungkan kembali dalam < 15 detik | Socket.io client reconnect otomatis, tidak perlu restart agent/web manual |

---

## 11. PWA - Web Application (PWA)

| ID | Precondition | Langkah | Expected Result |
|----|---------------|---------|------------------|
| PWA-01 | Web sudah di-build (`npm run build`) dan dilayani via HTTPS atau localhost | Buka di Chrome/Edge desktop atau tablet | Browser menawarkan opsi "Install App" (manifest terbaca dari `public/manifest.json`) |
| PWA-02 | App sudah di-install sebagai PWA | Buka dari icon yang terinstall | Aplikasi terbuka fullscreen tanpa address bar browser (`"display": "fullscreen"` di manifest) |
| PWA-03 | App sudah pernah dibuka sekali (assets ter-cache oleh Workbox) | Putuskan koneksi internet/network, buka lagi | Shell aplikasi (JS/CSS/HTML statis) tetap termuat dari cache, walau data real-time (Socket.IO) tidak akan connect sampai network kembali |
| PWA-04 | Ada versi baru di-deploy ke server web | Buka ulang app yang sudah ter-install | Service worker (`registerType: 'autoUpdate'`) update otomatis di background, versi baru aktif setelah reload berikutnya |

---

## 12. REST API (API)

| ID | Endpoint | Langkah | Expected Result |
|----|----------|---------|------------------|
| API-01 | `GET /health` | Panggil endpoint | Response `200` berisi `status: "ok"`, uptime, info memory/system, dan daftar agent yang terkoneksi |
| API-02 | `GET /health/live` | Panggil endpoint | Response `200 OK` (plain text), untuk liveness probe |
| API-03 | `GET /health/ready` | Panggil endpoint | Response `200` berisi `{ ready: true, agents: <jumlah> }` |
| API-04 | `GET /api/agents` | Panggil dengan minimal 1 agent terkoneksi | Response array `AgentInfo[]` sesuai agent yang terdaftar di server ini saja |
| API-05 | `POST /api/command` | Body `{ agentId, command: { type: "PLAY" } }` dengan agent aktif | Response `{ success: true }`, command diteruskan ke agent via socket |
| API-06 | `POST /api/command` | Body dengan `agentId` yang tidak ada / tidak aktif | Server melempar error ("Agent offline" / "Agent is not active...") - pastikan endpoint tidak mengembalikan `success: true` palsu meski command gagal terkirim (cek behavior ini, berpotensi jadi bug kalau controller tidak menangkap exception) |
| API-07 | `GET /api/search?keyword=lagu` | Panggil dengan keyword valid | Response `200` berisi hasil pencarian YouTube |
| API-08 | CORS | Panggil endpoint apa pun dari origin berbeda (mis. dari Web di port lain) | Request berhasil (server mengaktifkan `cors()` untuk semua origin) |

---

## 13. Edge Case & Negative Test (NEG)

| ID | Skenario | Expected Result |
|----|----------|------------------|
| NEG-01 | `ROOM_ID` di agent berbeda huruf besar/kecil atau spasi dari `roomId` di `VITE_ROOMS` cashier (mis. `Room-001` vs `room-001`) | Server **tidak** mencocokkan (exact string match, case-sensitive) - ruangan tampil OFFLINE di cashier walau agent sebenarnya online |
| NEG-02 | Dua agent register dengan `roomId` yang sama (mis. 2 device pakai `.env` yang sama tanpa sengaja) | Registry mengganti agent lama dengan yang baru untuk `roomId` tsb (`Replacing existing agent for roomId`) - agent lama efektif "hilang" dari daftar |
| NEG-03 | Kirim `cashier:activate-room` untuk `roomId` yang belum pernah register (agent belum nyala) | Server log "Agent not found for room", tidak ada broadcast state agent (karena agent belum ada di registry), tapi `activatedRooms` tetap tercatat sehingga begitu agent connect nanti langsung aktif |
| NEG-04 | `cashier:deactivate-room` dikirim 2x berturut-turut dengan cepat (double-click) untuk ruangan yang sama | Transaksi **tidak boleh tercatat dua kali** untuk sesi yang sama (server mengecek `wasActive` sebelum overwrite) |
| NEG-05 | Timer auto-expiry ruangan tepat menyala bersamaan dengan cashier klik nonaktifkan manual (race condition) | Hanya salah satu yang berhasil mencatat transaksi, tidak double-billing (server flip `isActive=false` sebelum langkah async pertama) |
| NEG-06 | `VITE_ROOMS` di cashier berisi `ip`/`port` yang salah atau tidak reachable | Socket ke room tsb gagal connect terus-menerus, status ruangan OFFLINE, ruangan lain di cashier tidak terganggu |
| NEG-07 | `YOUTUBE_API_KEY` mencapai kuota harian | Pencarian YouTube gagal (`500 Search failed`), fitur kontrol video lain (play/pause/playlist) tetap berfungsi normal karena tidak bergantung pada YouTube Data API |
| NEG-08 | Kirim command dengan `type` yang tidak dikenal (bukan salah satu `CommandType`) | Agent tidak menemukan handler yang sesuai - pastikan tidak membuat agent crash, minimal ter-log sebagai error |

---

## Ringkasan Cakupan

| Area | Jumlah Skenario |
|------|-------------------|
| Koneksi & Registrasi | 6 |
| Aktivasi/Deaktivasi Ruangan | 9 |
| Kontrol Video | 10 |
| Playlist | 7 |
| Pencarian YouTube | 3 |
| Billing & Transaksi | 10 |
| Status Ruangan | 11 |
| Pindah Ruangan | 4 |
| Multi-Room/Client | 5 |
| Disconnect/Recovery | 5 |
| PWA | 4 |
| REST API | 8 |
| Edge Case/Negative | 8 |
| **Total** | **90** |
