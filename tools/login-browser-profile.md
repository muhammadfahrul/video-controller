Berikut langkah detailnya. Karena agent ini jalan sebagai Windows Agent (lihat agent/package.json:5 — "Windows Agent for Video Controller"), semua langkah di bawah saya sesuaikan untuk Windows.

1. Matikan agent dulu

Pastikan proses agent (video-controller) benar-benar berhenti — lewat Task Manager atau service manager-nya. Ini penting supaya folder profile tidak sedang di-lock oleh proses lain.

2. Temukan folder profile

Profile Chrome yang dipakai agent ada di:
<folder-instalasi-project>\agent\data\browser-profile
(sesuai BrowserProfile.ts:6-11, path-nya process.cwd()/data/browser-profile, dan process.cwd() = folder agent saat service dijalankan).

Buka File Explorer, masuk ke folder agent\data. Kalau browser-profile belum ada, buat folder kosong dengan nama itu. Salin full path-nya dari address bar (klik address bar → copy).

3. Tutup semua Chrome yang sedang jalan

Tutup semua window Chrome kamu (Chrome biasa, bukan yang dari agent) — supaya tidak bentrok saat membuka instance baru.

4. Buka Chrome asli menunjuk ke profile itu

Tekan Win + R, ketik cmd, Enter. Lalu jalankan (ganti <path> dengan path yang tadi disalin):

"C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="<path>"

Kalau Chrome ter-install di lokasi lain, cek dulu:
where chrome
atau coba C:\Program Files (x86)\Google\Chrome\Application\chrome.exe.

Chrome akan terbuka sebagai profile baru yang terpisah dari profile harian kamu — itu memang tujuannya, supaya isolated dan sama persis dengan yang dipakai agent nanti.

5. Login manual seperti biasa

Di window Chrome yang baru terbuka itu:
- Buka https://accounts.google.com, login dengan akun Google yang punya YouTube Premium (isi email, password, verifikasi 2FA kalau ada — normal saja, karena ini Chrome asli bukan otomatis, jadi tidak akan kena block bot).
- Setelah login, buka https://youtube.com, pastikan avatar akun muncul dan tidak ada iklan (tanda Premium aktif). Scroll-scroll / play satu video sebentar supaya sesi dianggap "trusted" oleh Google.

6. Tutup Chrome dengan benar

Tutup semua window Chrome dari profile ini (jangan cuma minimize) supaya cookie & session token ditulis ke disk. Tunggu beberapa detik sebelum lanjut.

7. Jalankan agent lagi seperti biasa

Start ulang agent (service/npm start). Playwright akan membuka profile data\browser-profile yang sama, dan karena sudah ada sesi login tersimpan di disk, seharusnya langsung masuk ke YouTube dalam keadaan sudah login Premium — tanpa pernah menyentuh halaman login Google lewat browser otomatis.

Catatan

- Kalau nanti folder data\browser-profile terhapus/reset (misal saat reinstall), ulangi proses ini sekali lagi.
- Jangan jalankan Chrome tanpa flag --user-data-dir di atas — kalau lupa, kamu akan login ke profile Chrome harian kamu sendiri, bukan ke profile yang dipakai agent.
- Kalau setelah langkah ini agent masih minta login lagi, cek .env di folder agent — pastikan BROWSER_CHANNEL=chrome (bukan chromium), supaya Playwright benar-benar pakai Chrome asli yang sudah kamu login-in, bukan Chromium bawaan yang profile-nya beda.