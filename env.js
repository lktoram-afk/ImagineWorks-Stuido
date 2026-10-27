/*
 * Konfigurasi publik ImagineWorks Studio.
 * Nilai di berkas ini dapat dilihat oleh siapa pun yang membuka website.
 * Jangan pernah menaruh Midtrans Server Key, Supabase service_role/secret key,
 * PIN pepper, atau kunci enkripsi di sini.
 */
window.IMAGINEWORKS_CONFIG = Object.freeze({
  // Isi dari Supabase Dashboard > Project Settings > API.
  SUPABASE_URL: "https://gfhupmpyxjhgxklnuvqr.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaHVwbXB5eGpoZ3hrbG51dnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NzgyMTIsImV4cCI6MjEwODU1NDIxMn0.cUAuksVoDlVfCGq3ewCHW9diKHAbtMbwgclb4EDKE0g",

  // Mode aktif sekarang transfer manual; Midtrans belum dipakai.
  PAYMENT_MODE: "manual",
  PAYMENT_PROVIDER: "manual",
  PAYMENT_MERCHANT_CODE: "YOUR_MIDTRANS_MERCHANT_ID",
  MIDTRANS_ENV: "sandbox",

  // Detail rekening/e-wallet ini bersifat publik dan ditampilkan di halaman checkout.
  // Isi sebelum menerima pembayaran nyata.
  BANK_TRANSFER: Object.freeze({
    BANK_NAME: "",
    ACCOUNT_NUMBER: "",
    ACCOUNT_HOLDER: ""
  }),
  MANUAL_PAYMENT_NOTE: "Simpan ID pesanan ini dan transfer sesuai nominal di atas. Setelah transfer, kirim bukti kepada studio. PIN diterbitkan setelah admin memeriksa pembayaran.",

  // Boleh dikosongkan untuk membentuk URL dari SUPABASE_URL.
  FUNCTIONS_BASE_URL: "",

  // Path relatif berfungsi pada Preview maupun GitHub Pages di subfolder.
  HERO_IMAGE_URL: "./assets/imagineworks-hero.jpg",
  HERO_IMAGE_FALLBACK: "./assets/imagineworks-hero.jpg",

  // Nomor WhatsApp internasional tanpa tanda +. Kosongkan sampai nomor studio tersedia.
  BOOKING_WHATSAPP: "085349991313"
});

// PAYMENT_API_KEY / Midtrans Server Key sengaja tidak disediakan sebagai nilai frontend.
// Simpan sebagai secret bernama MIDTRANS_SERVER_KEY jika gateway diaktifkan kelak.
