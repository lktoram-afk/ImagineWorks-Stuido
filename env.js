/*
 * Konfigurasi publik ImagineWorks Studio.
 * Nilai di berkas ini dapat dilihat oleh siapa pun yang membuka website.
 * Jangan pernah menaruh Midtrans Server Key, Supabase service_role/secret key,
 * PIN pepper, atau kunci enkripsi di sini.
 */
window.IMAGINEWORKS_CONFIG = Object.freeze({
  // Isi dari Supabase Dashboard > Project Settings > API.
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY",

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
  BOOKING_WHATSAPP: ""
});

// PAYMENT_API_KEY / Midtrans Server Key sengaja tidak disediakan sebagai nilai frontend.
// Simpan sebagai secret bernama MIDTRANS_SERVER_KEY di Supabase Edge Functions.
