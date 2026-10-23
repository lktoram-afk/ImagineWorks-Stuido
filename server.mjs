import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
function normalizeSupabaseUrl(raw) {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && url.hostname.endsWith(".supabase.co")) return `${url.protocol}//${url.host}`;
  } catch { /* validation is reported as a backend configuration error below */ }
  return raw.replace(/\/+$/, "");
}
const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL || "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const MAX_BODY_BYTES = 9 * 1024 * 1024;

const FUNCTIONS = new Map([
  ["gallery", "gallery"],
  ["verify-pin", "verify-pin"],
  ["media", "media"],
  ["auth", "auth"],
  ["admin", "admin"],
  ["quote", "quote"],
  ["checkout", "checkout"],
  ["booking", "booking"],
  ["check-order", "check-order"],
  ["my-photos", "my-photos"],
  ["running-text", "running-text"],
]);

const PAGES = new Set([
  "index.html",
  "booking.html",
  "admin.html",
  "foto-saya.html",
  "cek-pesanan.html",
  "success.html",
  "manus-routes.json",
  "favicon.svg",
  "assets/css/styles.css",
  "assets/brand-mark.svg",
  "assets/images/imagineworks-logo.png",
]);
const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function send(res, status, contentType, body) {
  res.writeHead(status, { "Content-Type": contentType, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("request_body_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function forwardedHeaders(req) {
  const headers = new Headers({ apikey: SUPABASE_ANON_KEY });
  const allow = ["authorization", "cookie", "origin", "content-type", "range", "user-agent", "hx-request", "hx-current-url", "hx-target", "x-requested-with"];
  for (const name of allow) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }
  // Never trust a client-supplied X-Forwarded-For value for security/rate-limit decisions.
  headers.set("x-forwarded-for", String(req.socket.remoteAddress || "unknown").slice(0, 128));
  return headers;
}

async function proxyFunction(req, res, requestUrl, functionName) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return send(res, 503, "text/html; charset=utf-8", `<div class="result-error" role="status">Backend Supabase belum dikonfigurasi. Ikuti README, jalankan migrasi, lalu isi secret server.</div>`);
  }
  if (!["GET", "POST", "HEAD"].includes(req.method || "GET")) return send(res, 405, "text/plain; charset=utf-8", "Method not allowed");
  try {
    const body = req.method === "POST" ? await readBody(req) : undefined;
    const target = `${SUPABASE_URL}/functions/v1/${functionName}${requestUrl.search}`;
    const upstream = await fetch(target, {
      method: req.method,
      headers: forwardedHeaders(req),
      body,
      redirect: "manual",
    });
    const responseHeaders = {};
    const allowed = ["content-type", "cache-control", "content-disposition", "content-range", "accept-ranges", "etag", "last-modified", "retry-after", "x-content-type-options", "hx-redirect", "hx-refresh", "hx-push-url"];
    for (const name of allowed) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders[name] = value;
    }
    const getSetCookie = upstream.headers.getSetCookie?.bind(upstream.headers);
    const cookies = getSetCookie ? getSetCookie() : [];
    if (cookies.length) responseHeaders["set-cookie"] = cookies;
    res.writeHead(upstream.status, responseHeaders);
    if (req.method === "HEAD" || !upstream.body) return res.end();
    for await (const chunk of upstream.body) res.write(chunk);
    res.end();
  } catch (error) {
    const status = error?.message === "request_body_too_large" ? 413 : 502;
    return send(res, status, "text/html; charset=utf-8", `<div class="result-error" role="status">Proxy Supabase tidak dapat menyelesaikan permintaan. Periksa URL Edge Function dan jaringan.</div>`);
  }
}

async function serveStatic(res, pathname, method) {
  let name;
  try { name = decodeURIComponent(pathname).replace(/^\/+/, ""); } catch { return send(res, 400, "text/plain; charset=utf-8", "Bad request"); }
  if (!name) name = "index.html";
  if (!PAGES.has(name)) return send(res, 404, "text/plain; charset=utf-8", "Not found");
  const filePath = path.resolve(ROOT, name);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) return send(res, 404, "text/plain; charset=utf-8", "Not found");
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return send(res, 404, "text/plain; charset=utf-8", "Not found");
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME.get(path.extname(filePath)) || "application/octet-stream",
      "Content-Length": data.length,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": path.extname(filePath) === ".html" ? "no-cache" : "public, max-age=300",
    });
    res.end(method === "HEAD" ? undefined : data);
  } catch {
    send(res, 404, "text/plain; charset=utf-8", "Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/_app/health") return send(res, 200, "application/json; charset=utf-8", JSON.stringify({ ok: true }));
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    const match = url.pathname.match(/^\/api\/([a-z0-9-]+)$/);
    if (!match || !FUNCTIONS.has(match[1])) return send(res, 404, "text/plain; charset=utf-8", "Unknown API route");
    return proxyFunction(req, res, url, FUNCTIONS.get(match[1]));
  }
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "text/plain; charset=utf-8", "Method not allowed");
  return serveStatic(res, url.pathname, req.method);
});

server.listen(PORT, "0.0.0.0", () => console.log(`ImagineWorks server listening on 0.0.0.0:${PORT}`));
