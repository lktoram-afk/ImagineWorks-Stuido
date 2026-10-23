# ImagineWorks Studio

Portal fotografi multi-halaman dengan HTML5, Tailwind CDN, HTMX, CSS editorial, Supabase PostgreSQL/Auth/RLS/Edge Functions, dan Google Drive read-only. File foto master tetap di Google Drive; Supabase Storage hanya menampung bukti pembayaran yang privat.

> **Status integrasi:** migration kompatibilitas additive `20261020040000_compat_existing_project.sql` telah diterapkan ke project Supabase ImagineWorks setelah dry-run hanya menunjukkan migration tersebut. Verifikasi metadata read-only mengonfirmasi migration tercatat, tabel/kolom dan RLS tersedia, bucket bukti bayar tetap private dengan WEBP, dan grant publik sensitif telah dicabut. Frontend statis pernah dipublikasikan lewat GitHub Pages, tetapi host itu tidak menjalankan API. Edge Functions, hosting Render, OAuth Google Drive, email, dan Cron perlu dikonfigurasi sebelum fitur backend aktif.

## 1. Schema existing dan migration

Project Supabase yang terhubung sudah memiliki `events_album`, `order_items`, `profiles`, `running_texts`, `settings`, dan `transactions`; RLS serta role enum sudah ada. Remote migration history kosong. Untuk project ini gunakan hanya:

```text
supabase/migrations/20261020040000_compat_existing_project.sql
```

Migration yang tercantum sudah diterapkan pada project existing ImagineWorks; dry-run berikutnya melaporkan database up to date. Jangan jalankan migration fresh-install `0001`–`0003` pada project ini. File lama tersebut dipindahkan ke `supabase/fresh-install/migrations/`; arsip itu bukan instruksi untuk project existing dan belum menjadi jalur blank-project yang tervalidasi. Jangan mengirim password di chat atau menyimpannya di Git/`.env`.

Migration kompatibilitas tidak menjalankan `DROP`, `RENAME`, `TRUNCATE`, atau menulis ulang baris transaksi/album yang lama. Migration menambah kolom metadata, `album_photos`, `bookings`, tabel rate-limit, kolom relasi order dan approval. `category` album lama tetap `NULL` sampai admin memilih kategori; galeri publik tidak menampilkan album yang belum diklasifikasikan. Kolom `is_private` baru mendapat default aman `false`, dan policy album publik mensyaratkan status `published` serta bukan private. Nilai Settings lama tidak dibaca atau ditimpa oleh migration.

Migration juga mencabut privilege client yang tidak diperlukan (`TRUNCATE`, `TRIGGER`, `REFERENCES`), mengganti SELECT penuh `events_album` dengan daftar kolom aman tanpa folder Drive/hash PIN, dan tidak mengubah default ACL global. Ini dapat memengaruhi client lama yang membaca tabel langsung; project ini telah dikonfirmasi khusus ImagineWorks. Bucket `payment-proofs` tetap private dengan batas 5 MiB; migration hanya menambahkan `image/webp` ke MIME yang diizinkan.

### Struktur kompatibilitas

| Area | Kolom/nama existing yang digunakan aplikasi |
|---|---|
| Album | `events_album.status` memakai enum `album_status` yang sudah ada; kategori, deskripsi, private/PIN, publish metadata ditambahkan secara additive. Kategori legacy tidak ditebak. |
| Order | Transaksi memakai `transaction_code`, `customer_name/email/phone`, `amount`, `proof_path`, `purchase_date`, `expires_at`, dan `download_token_expires_at`; `retention_expires_at` baru memisahkan status retensi dari link guest. Item lama mempertahankan `drive_file_id` dan `unit_price`; item baru menambah relasi `album_photo_id` dan `title_snapshot`. |
| Harga/QRIS | Settings memakai key kompatibel `photo_standard_price`, `photo_bulk_minimum`, `photo_bulk_price`, dan `dana_qr_image_url`. Retensi member disimpan server-side dengan key `download.member_retention_days`. |
| Role | User diverifikasi lewat Supabase Auth; Edge Function membaca `profiles.role` di server. Custom JWT hook tidak dibutuhkan untuk pemeriksaan super admin. |
| Running text | Batas existing 240 karakter dipertahankan; kolom jendela tayang dan audit ditambahkan. |

Super admin harus sudah ada di Supabase Auth dan memiliki `profiles.role = 'super_admin'`. Jika perlu, pemilik project dapat menetapkan role dengan SQL Editor:

```sql
update public.profiles
set role = 'super_admin'
where id = '<AUTH_USER_UUID>';
```

Tidak perlu mengandalkan `user_metadata` atau claim JWT yang dapat diedit pengguna. Endpoint admin memanggil Auth untuk memvalidasi user lalu memeriksa role profile server-side; database RLS tetap diaktifkan.

## 2. Secrets dan layanan eksternal

Gunakan Supabase Edge Function Secrets untuk semua kredensial backend. Jangan menaruh secret, service-role key, raw PIN, token media, atau kode pelanggan pada HTML, browser, Git, atau log. Kunci yang perlu disiapkan:

```text
MEDIA_SIGNING_SECRET       # acak, minimal 32 karakter
ORDER_CODE_PEPPER          # acak, minimal 32 karakter dan berbeda
PIN_RATE_LIMIT_SECRET      # acak, minimal 32 karakter dan berbeda
CRON_SECRET                # acak, minimal 32 karakter dan berbeda
ALLOWED_ORIGINS            # origin Preview + domain situs, dipisahkan koma
SITE_ORIGIN                # origin publik untuk tautan email
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
RESEND_API_KEY
EMAIL_FROM
STUDIO_NOTIFY_EMAIL        # opsional, notifikasi booking ke admin
```

`SUPABASE_URL`, publishable/anon key, dan `SUPABASE_SERVICE_ROLE_KEY` tersedia pada Supabase Edge Runtime. Proxy web lokal memakai hanya `SUPABASE_URL` dan `SUPABASE_ANON_KEY`; jangan menyalin `SUPABASE_SERVICE_ROLE_KEY` ke server frontend. Password database dan `SUPABASE_ACCESS_TOKEN` untuk CLI tidak perlu ditulis ke file proyek.

Google Drive memakai scope OAuth read-only `https://www.googleapis.com/auth/drive.readonly`. Kode hanya memakai API `GET` untuk daftar metadata dan stream file; tidak ada fungsi untuk membuat, mengubah, memindahkan, atau menghapus file Drive. Email transaksi baru dikirim setelah admin menyetujui pembayaran. Link guest aktif maksimal 48 jam, sedangkan status transaksi menjadi EXPIRED setelah retensi yang tersimpan (default 60 hari sejak `purchase_date`); kedua batas itu terpisah. Member menerima pemberitahuan dan mengunduh melalui Foto Saya selama masa retensi.

## 3. Edge Functions

Setelah migration berhasil diterapkan dan secrets dikonfigurasi, deploy fungsi dari folder proyek dengan Supabase CLI:

```sh
supabase link --project-ref <PROJECT_REF>
supabase functions deploy gallery
supabase functions deploy verify-pin
supabase functions deploy media
supabase functions deploy auth
supabase functions deploy admin
supabase functions deploy quote
supabase functions deploy checkout
supabase functions deploy booking
supabase functions deploy check-order
supabase functions deploy my-photos
supabase functions deploy running-text
supabase functions deploy retention
```

Gateway JWT dimatikan per fungsi di `supabase/config.toml` karena form HTML menggunakan cookie, bukan bearer JWT dari JavaScript. Ini bukan akses admin terbuka: fungsi sensitif memvalidasi Auth cookie di server; admin memeriksa `profiles.role`; state-changing request memerlukan `Origin` yang di-allowlist; fungsi `retention` memerlukan `x-cron-secret` yang dibandingkan constant-time. Fungsi memakai service role hanya setelah validasi input/otorisasi yang sesuai.

## 4. Jadwalkan retensi harian

Setelah fungsi `retention` ter-deploy dan `CRON_SECRET` disetel, aktifkan `pg_cron`, `pg_net`, dan Vault sesuai paket Supabase. Simpan project URL, publishable key, dan nilai CRON secret di Vault, bukan di migration/commit. Pola cron resmi Supabase:

```sql
select cron.schedule(
  'imagineworks-daily-retention',
  '15 2 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'imagineworks_project_url') || '/functions/v1/retention',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'imagineworks_publishable_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'imagineworks_cron_secret')
    ),
    body := '{"source":"pg_cron"}'::jsonb
  );
  $$
);
```

Jadwal berjalan harian pukul 02:15 UTC. Fungsi menandai transaksi `pending` maupun `paid` sebagai `expired` setelah `retention_expires_at` (default 60 hari sejak `purchase_date`); transaksi lama tanpa snapshot memakai nilai retensi aktif/default 60 hari. Link unduh guest berumur terpisah maksimal 48 jam. Fungsi juga menghapus telemetry PIN/lookup yang lebih tua dari tujuh hari dan tidak menghapus file Drive.

## 5. Jalankan situs

`server.mjs` melayani HTML/CSS dan meneruskan rute allowlist `/api/*` ke Edge Functions. Isi environment server, lalu:

```sh
node server.mjs
```

Untuk lokal, salin `.env.example` menjadi `.env` dan isi hanya `SUPABASE_URL` serta `SUPABASE_ANON_KEY`. File `.env` diabaikan Git. Untuk Preview HTTPS, atur nilai melalui environment proyek; cookie Auth memakai `HttpOnly; Secure; SameSite=None` untuk konteks iframe lintas situs. Isi `ALLOWED_ORIGINS` dengan origin Preview persis dan origin situs produksi.

Halaman yang tersedia: `/`, `/admin.html`, `/booking.html`, `/foto-saya.html`, `/cek-pesanan.html`, dan `/success.html`. Success Page meminta email+kode transaksi, menampilkan status PENDING atau tautan setelah PAID, tanpa menaruh identitas/kode pada URL. Daftarnya tercantum di `manus-routes.json`; API dan aset tidak disertakan sebagai rute halaman.

### Deploy ke Render

GitHub Pages hanya menyajikan file statis dan tidak menjalankan `/api/*`; karena itu login dan panel admin tidak dapat berfungsi di URL `*.github.io`. Repository ini menyertakan `render.yaml` untuk menjalankan `server.mjs` dalam Docker. Server menyajikan HTML/aset dan meneruskan `/api/*` ke Supabase Edge Functions pada origin situs yang sama, sehingga sesi admin tetap memakai cookie `HttpOnly` dan pemeriksaan role server-side.

1. Push perubahan ke GitHub, lalu di Render pilih **New → Blueprint** dan hubungkan repository. Render akan membaca `render.yaml` dan meminta `SUPABASE_URL` serta `SUPABASE_ANON_KEY`. Isi dari Supabase Project Settings → API; gunakan publishable/anon key, bukan service-role key.
2. Deploy layanan dan tunggu health check `/_app/health` berhasil. Render akan memberikan URL HTTPS seperti `https://imagineworks-studio.onrender.com`.
3. Setelah URL Render tersedia, dari root repo jalankan `supabase secrets set --project-ref <PROJECT_REF> ALLOWED_ORIGINS=https://imagineworks-studio.onrender.com SITE_ORIGIN=https://imagineworks-studio.onrender.com`, ganti URL dengan origin aktual. Tambahkan secrets lain yang diperlukan menurut bagian 2 melalui Supabase Edge Function Secrets, lalu deploy Edge Functions sesuai bagian 3.
4. Pastikan user sudah ada di Supabase Auth dan profilnya memiliki `role = 'super_admin'`, lalu buka `https://imagineworks-studio.onrender.com/admin.html`.

Setelah deployment, jika login gagal, periksa browser Network: `/api/auth` dengan status `503` biasanya berarti environment variables atau Edge Function belum tersedia; pesan akses ditolak berarti akun belum memiliki role super admin. Bila memakai custom domain, perbarui `ALLOWED_ORIGINS` dan `SITE_ORIGIN` ke origin custom domain tersebut. GitHub tetap menjadi tempat source code; gunakan URL Render untuk situs aktif, bukan GitHub Pages.

## 6. Alur operasional

Super admin memasukkan ID atau URL HTTPS folder Google Drive, judul, tanggal, lokasi, kategori, status Publish/Draft, dan visibilitas Public/Private. Album sesi pribadi selalu private dan harus memiliki PIN 4–6 digit; PIN di-hash PBKDF2-SHA256 dengan salt unik. Admin dapat mengklasifikasikan album lama tanpa mengganti title/tanggal/folder; kategori legacy yang belum dipilih tidak muncul di galeri publik. Setelah album siap, tekan “Sinkron metadata foto”; yang disimpan hanya metadata dan Drive ID, bukan file foto.

Galeri menyaring Sports/Lari, Events/Acara, dan Sesi Foto Pribadi. Watermark preview digambar melalui CSS. Album private menampilkan prompt “Album Ini Dilindungi PIN. Silakan masukkan PIN akses Anda”; foto baru dimuat setelah verifikasi server. Percobaan PIN dibatasi 5 kali per sumber dan 20 per album selama 15 menit.

Checkout menghitung ulang harga di server: Rp3.000/foto dan Rp2.500/foto mulai lima foto, dengan nilai yang dapat diubah admin. Guest mengisi nama/email/nomor WA dan mengunggah bukti DANA/QRIS; status awal PENDING. Tidak ada email atau link unduh sebelum approval. Sesudah admin mengubah transaksi ke PAID, Success Page dan email menampilkan link guest; pengguna dapat meminta ulang lewat email + kode transaksi `#TRX-XXXX`. Member login ke Foto Saya. Booking mencatat tanggal, jenis sesi, lokasi, dan catatan. Panel admin mengelola album, approval, booking, harga, QRIS, running text, email ulang, serta retensi.

### Pemesanan lama

Baris lama tidak dihapus. Aplikasi mencoba mengaitkan order item lama melalui `drive_file_id` jika metadata Drive album tersebut telah disinkronkan. Jika tidak ada atau ID cocok dengan lebih dari satu album, fungsi tidak menebak file dan meminta sinkronisasi/admin. Nilai `download_token` lama tidak dihapus/diubah, tetapi format/validitasnya belum dapat dipastikan dari metadata saja; tautan lama mungkin memerlukan bantuan admin untuk diterbitkan ulang.

## 7. Publikasi WebDev (opsional)

Publikasi menggunakan pendekatan hybrid: `sh scripts/build-static.sh` menghasilkan `dist/` dari keenam halaman HTML, manifest rute, ikon, dan aset lokal tanpa package manager. `Dockerfile` menjalankan server Node untuk health endpoint `/_app/health` dan proxy `/api/*`; halaman serta aset statis disajikan dari output build. Fitur Webdev Server telah diaktifkan (satu arah), sedangkan `features.database=false` dipertahankan karena database aplikasi berada di Supabase eksternal. `auto_publish` tetap nonaktif; penerbitan dilakukan melalui aksi publish eksplisit.

## File penting

- Skrip build statis hybrid: `scripts/build-static.sh` (output `dist/`).

- Migration kompatibilitas existing: `supabase/migrations/20261020040000_compat_existing_project.sql`.
- Arsip fresh-install yang belum tervalidasi: `supabase/fresh-install/migrations/`.
- Supabase Edge Functions dan helper schema/order: `supabase/functions/`.
- Proxy, health check, dan routing: `server.mjs`.
- Keputusan desain, metadata audit, dan batasan migrasi: `plan.md` dan `supabase/REFERENCE_NOTES.md`.
- Daftar kriteria produk: `TODO.md`.

## Referensi Supabase

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Row Level Security"
[2]: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook "Custom Access Token Hook"
[3]: https://supabase.com/docs/guides/auth/jwt-fields "JWT Claims Reference"
[4]: https://supabase.com/docs/guides/functions/auth "Edge Function Authentication"
[5]: https://supabase.com/docs/guides/functions/schedule-functions "Schedule Edge Functions"
