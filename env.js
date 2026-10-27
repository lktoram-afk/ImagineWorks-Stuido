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

  // Merchant ID boleh ditampilkan publik, tetapi aplikasi tidak memerlukannya
  // untuk membuat charge. Kunci server Midtrans disimpan sebagai Edge Function secret.
  PAYMENT_PROVIDER: "midtrans",
  PAYMENT_MERCHANT_CODE: "YOUR_MIDTRANS_MERCHANT_ID",
  MIDTRANS_ENV: "sandbox", // ganti ke "production" setelah akun live disiapkan

  // Boleh dikosongkan untuk membentuk URL dari SUPABASE_URL.
  FUNCTIONS_BASE_URL: "",

  // URL project-managed untuk preview/published; fallback untuk ZIP yang dijalankan lokal.
  HERO_IMAGE_URL: "/manus-storage/imagineworks-hero_4da0169e.jpg",
  HERO_IMAGE_FALLBACK: "./assets/imagineworks-hero.jpg",

  // Nomor WhatsApp internasional tanpa tanda +. Kosongkan sampai nomor studio tersedia.
  BOOKING_WHATSAPP: "085349991313"
});

// PAYMENT_API_KEY / Midtrans Server Key sengaja tidak disediakan sebagai nilai frontend.
// Simpan sebagai secret bernama MIDTRANS_SERVER_KEY di Supabase Edge Functions.
