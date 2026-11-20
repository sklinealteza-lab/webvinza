// Server lokal sederhana untuk testing tanpa Vercel/Netlify CLI.
// Jalankan:  npm run dev   (baca DISCORD_WEBHOOK_URL dari file .env)
const http = require("http");
const fs = require("fs");
const path = require("path");

// Muat .env sederhana
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { handleRegistration } = require("./lib/register");
const PUBLIC = path.join(__dirname, "public");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const PORT = process.env.PORT || 3000;

http
  .createServer(async (req, res) => {
    if (req.url === "/api/register") {
      if (req.method !== "POST") { res.writeHead(405); return res.end(); }
      let raw = "";
      for await (const chunk of req) raw += chunk;
      let body;
      try { body = JSON.parse(raw || "{}"); } catch { body = null; }
      const result = body
        ? await handleRegistration(body)
        : { status: 400, body: { ok: false, errors: ["Body JSON tidak valid."] } };
      res.writeHead(result.status, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(result.body));
    }

    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(PUBLIC, urlPath === "/" ? "index.html" : urlPath);
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`▶ http://localhost:${PORT}`));
