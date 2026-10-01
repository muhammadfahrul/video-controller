# Changelog

Semua perubahan penting di project ini dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan versi mengikuti [Semantic Versioning](https://semver.org/lang/id/):
`MAJOR` untuk perubahan yang tidak kompatibel (misal protokol socket
server↔agent berubah), `MINOR` untuk fitur baru, `PATCH` untuk perbaikan bug.

Satu versi berlaku untuk semua komponen (server, agent, web, cashier).
Tambahkan catatan ke bagian **Unreleased** setiap ada perubahan, lalu ganti
judulnya jadi nomor versi saat rilis.

## [Unreleased]

## [1.0.0] - 2026-09-29

Rilis pertama yang diberi versi. Mencakup semua pengembangan sejak
2026-08-10.

### Added

- **Versioning aplikasi**: satu versi di `package.json` root, disinkronkan ke
  semua komponen; versi tampil di `/health` (server + per agent), halaman
  Settings web, dan footer kasir.
- **Update ke versi tertentu**: `install.sh update v1.2.0` /
  `install.ps1 -Mode update -Version v1.2.0`, termasuk rollback; image Docker
  diberi tag `video-controller-<service>:<versi>`.
- Script rilis satu perintah: `npm run release:<patch|minor|major>` menaikkan
  versi, menyinkronkan ke semua komponen, membuat commit dan tag.
- Menu Update di `install.sh` / `install.ps1` menanyakan versi yang mau
  dipasang: menampilkan versi terpasang dan 5 rilis terbaru, bisa pilih nomor
  atau ketik versi; default ke rilis terbaru (fallback ke `main` kalau
  offline).
- Dashboard kasir menampilkan versi agent di setiap kartu ruangan; berwarna
  kuning kalau berbeda dengan versi kasir (tanda PC ruangan perlu di-update).
- `CHANGELOG.md`.
- **Billing ruangan**: aktivasi ruangan dari kasir, tarif per jam dari
  `PRICE_PER_HOUR` server, paket harga tetap (`PACKAGES`), riwayat transaksi
  dan cetak nota, status "bersihkan" setelah sesi selesai.
- **Move Room**: pindah ruangan dengan sisa waktu dan data customer terbawa.
- **Playlist & player**: pindah urutan item playlist, `playOrAdd` dengan
  metadata, auto-skip iklan, kontrol volume dan mute/unmute, menonaktifkan
  autoplay YouTube agar tidak mengganggu playlist.
- **Sinkronisasi waktu**: countdown dan masa berlaku sesi disinkronkan ke jam
  server untuk mengoreksi selisih jam antar PC.
- **Instalasi & deploy**: `install.sh` / `install.ps1` dengan menu interaktif,
  auto-install Node.js dan Docker, mode auto-start (systemd / Startup folder
  tersembunyi), mode Update dan Update + Restart, deploy via Docker Compose.
- **PWA** untuk web dan kasir (manifest, ikon).
- Tombol refresh untuk ruangan yang terputus di dashboard.
- Diagnostik video dan recovery otomatis saat playback YouTube bermasalah.
- Panduan setup browser profile untuk agent Windows.

### Changed

- Perhitungan total harga dipindah ke server; kasir tidak lagi mengirim
  `totalPrice` sendiri.
- State management web diganti dari Zustand ke `AppStateService`.
- Istilah "Agent" di UI diganti menjadi "Ruangan".

### Fixed

- Durasi yang ditagih ikut bertambah oleh jeda saat Move Room (overbilling
  satu jam ekstra).
- Agent yang reconnect menghapus data sesi aktif (waktu habis, customer).
- Crash "Player is navigating" karena operasi YouTubePlayer berjalan
  bersamaan; sekarang diantrikan.
- Playlist tertahan dalam keadaan pause saat item yang sedang diputar dibuka
  ulang.
- Healthcheck Docker server salah path, agent Docker tanpa izin X11 dan tanpa
  audio.
- Beberapa instance SocketService terbuat bersamaan di web.

[Unreleased]: https://github.com/muhammadfahrul/video-controller/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/muhammadfahrul/video-controller/releases/tag/v1.0.0
