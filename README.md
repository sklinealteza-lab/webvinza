# 🏆 Website Pendaftaran Turnamen Mobile Legends

Form pendaftaran tim MLBB (5 inti + 1 cadangan). Data yang masuk dikirim ke **Discord Webhook** sebagai embed.
Tanpa framework, tanpa dependency, dan bisa langsung di-deploy ke **Vercel** atau **Netlify**.

URL webhook disimpan sebagai **environment variable** di server (serverless function), jadi **tidak terlihat** di browser.

## Struktur

```
public/                 → frontend statis (HTML/CSS/JS)
lib/register.js         → validasi + kirim ke Discord (dipakai kedua platform)
api/register.js         → Vercel Function   (POST /api/register)
netlify/functions/      → Netlify Function  (/api/register di-redirect ke sini)
netlify.toml / vercel.json
dev-server.js           → server lokal untuk testing
```

## 1. Buat Discord Webhook
Di Discord, buka **Server Settings → Integrations → Webhooks → New Webhook**, pilih channel, lalu **Copy Webhook URL**.

## 2. Deploy

### Vercel
1. Push folder ini ke GitHub, lalu buka vercel.com → **Add New Project** → import repo.
2. Framework Preset: **Other** (biarkan build command kosong).
3. Di **Environment Variables**, tambahkan:
   - `DISCORD_WEBHOOK_URL` = URL webhook kamu
   - `TOURNAMENT_NAME` = nama turnamen (opsional)
4. Klik **Deploy**.

### Netlify
1. Push ke GitHub, lalu buka app.netlify.com → **Add new site → Import an existing project**.
2. Setting build otomatis terbaca dari `netlify.toml` (publish `public`, functions `netlify/functions`).
3. **Site configuration → Environment variables** → tambahkan `DISCORD_WEBHOOK_URL` (dan `TOURNAMENT_NAME` jika mau).
4. Deploy (atau **Trigger deploy** ulang setelah menambahkan env var).

> ⚠️ Netlify Drop (drag & drop folder) **tidak** menjalankan functions. Pakai Git atau `netlify deploy` dari CLI.

## 3. Testing lokal
```bash
copy .env.example .env     # lalu isi DISCORD_WEBHOOK_URL
npm run dev                # http://localhost:3000
```
Bisa juga pakai `npx vercel dev` atau `npx netlify dev`.

## Kustomisasi
- Teks hadiah, jadwal, format, dan peraturan → `public/index.html`
- Warna/tema → variabel CSS di atas `public/style.css`
- Jumlah pemain / aturan validasi → `lib/register.js` (dan `public/script.js`)

## Keamanan
- Validasi dilakukan di sisi klien **dan** server.
- `allowed_mentions: { parse: [] }` mencegah orang nge-ping `@everyone` lewat form.
- Ada honeypot field sederhana untuk menahan bot spam.
