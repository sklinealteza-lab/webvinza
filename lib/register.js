// Logika bersama: validasi data pendaftaran + kirim ke Discord webhook.
// Dipakai oleh Vercel (api/register.js) dan Netlify (netlify/functions/register.js).

const ROLES = ["Gold Lane", "EXP Lane", "Mid Lane", "Jungler", "Roamer", "Flex"];
const MIN_PLAYERS = 5;
const MAX_PLAYERS = 6; // 5 inti + 1 cadangan

function clean(value, max = 100) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

// Escape markdown Discord. (Mention @everyone diblok oleh allowed_mentions.)
function esc(text) {
  return String(text).replace(/([*_`~|>\\])/g, "\\$1");
}

function validate(raw) {
  const errors = [];
  const data = raw && typeof raw === "object" ? raw : {};

  const team = {
    teamName: clean(data.teamName, 40),
    teamTag: clean(data.teamTag, 6).toUpperCase(),
    captainName: clean(data.captainName, 50),
    whatsapp: clean(data.whatsapp, 20).replace(/[\s-]/g, ""),
    email: clean(data.email, 100).toLowerCase(),
    discord: clean(data.discord, 40),
    city: clean(data.city, 40),
    notes: clean(data.notes, 300),
    players: [],
  };

  if (team.teamName.length < 3) errors.push("Nama tim minimal 3 karakter.");
  if (team.teamTag && !/^[A-Z0-9]{2,6}$/.test(team.teamTag))
    errors.push("Tag tim harus 2–6 huruf/angka.");
  if (team.captainName.length < 3) errors.push("Nama kapten minimal 3 karakter.");
  if (!/^(\+62|62|0)8\d{7,12}$/.test(team.whatsapp))
    errors.push("Nomor WhatsApp tidak valid (contoh: 081234567890).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(team.email))
    errors.push("Email tidak valid.");

  const players = Array.isArray(data.players) ? data.players.slice(0, MAX_PLAYERS) : [];
  const seenIds = new Set();

  players.forEach((p, i) => {
    const player = {
      nickname: clean(p?.nickname, 30),
      gameId: clean(p?.gameId, 12),
      serverId: clean(p?.serverId, 6),
      role: clean(p?.role, 20),
      substitute: i >= MIN_PLAYERS,
    };
    const label = player.substitute ? "Pemain cadangan" : `Pemain ${i + 1}`;
    const empty = !player.nickname && !player.gameId && !player.serverId;

    // Cadangan boleh dikosongkan
    if (player.substitute && empty) return;

    if (player.nickname.length < 2) errors.push(`${label}: nickname wajib diisi.`);
    if (!/^\d{5,12}$/.test(player.gameId)) errors.push(`${label}: ID game harus 5–12 digit angka.`);
    if (!/^\d{3,6}$/.test(player.serverId)) errors.push(`${label}: Server ID harus 3–6 digit angka.`);
    if (player.role && !ROLES.includes(player.role)) errors.push(`${label}: role tidak valid.`);

    const key = `${player.gameId}(${player.serverId})`;
    if (player.gameId && seenIds.has(key)) errors.push(`${label}: ID game duplikat dalam tim.`);
    seenIds.add(key);

    team.players.push(player);
  });

  if (team.players.filter((p) => !p.substitute).length < MIN_PLAYERS)
    errors.push(`Minimal ${MIN_PLAYERS} pemain inti wajib diisi.`);

  if (data.agree !== true) errors.push("Kamu harus menyetujui peraturan turnamen.");

  return { errors, team };
}

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MLT-${s}`;
}

function buildDiscordPayload(team, code) {
  const tournament = process.env.TOURNAMENT_NAME || "Turnamen Mobile Legends";
  const lines = team.players.map((p, i) => {
    const tag = p.substitute ? "🔄 Cadangan" : `#${i + 1}`;
    const role = p.role ? ` • ${esc(p.role)}` : "";
    return `**${tag}** ${esc(p.nickname)} — \`${p.gameId} (${p.serverId})\`${role}`;
  });

  const fields = [
    { name: "👑 Kapten", value: esc(team.captainName), inline: true },
    { name: "📱 WhatsApp", value: esc(team.whatsapp), inline: true },
    { name: "📧 Email", value: esc(team.email), inline: true },
  ];
  if (team.discord) fields.push({ name: "💬 Discord", value: esc(team.discord), inline: true });
  if (team.city) fields.push({ name: "📍 Kota", value: esc(team.city), inline: true });
  fields.push({ name: `🎮 Roster (${team.players.length} pemain)`, value: lines.join("\n").slice(0, 1024) });
  if (team.notes) fields.push({ name: "📝 Catatan", value: esc(team.notes).slice(0, 1024) });

  return {
    username: "sxcsyaefex",
    content: `📥 **Pendaftaran baru!** Kode: \`${code}\``,
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `🏆 ${esc(team.teamName)}${team.teamTag ? ` [${esc(team.teamTag)}]` : ""}`,
        description: tournament,
        color: 0xf5b301,
        fields,
        footer: { text: `Kode registrasi: ${code}` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Proses pendaftaran. Mengembalikan { status, body } agar bisa dipakai
 * di platform serverless apa pun.
 */
async function handleRegistration(raw) {
  // Honeypot anti-bot: field tersembunyi harus kosong
  if (raw && raw.website) {
    return { status: 200, body: { ok: true, code: makeCode() } };
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return { status: 500, body: { ok: false, errors: ["Server belum dikonfigurasi (DISCORD_WEBHOOK_URL kosong)."] } };
  }

  const { errors, team } = validate(raw);
  if (errors.length) return { status: 400, body: { ok: false, errors } };

  const code = makeCode();
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDiscordPayload(team, code)),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Discord error", res.status, txt);
      return { status: 502, body: { ok: false, errors: ["Gagal mengirim data ke panitia. Coba lagi sebentar."] } };
    }
  } catch (err) {
    console.error("Webhook fetch failed", err);
    return { status: 502, body: { ok: false, errors: ["Gagal terhubung ke server panitia."] } };
  }

  return { status: 200, body: { ok: true, code, teamName: team.teamName } };
}

module.exports = { handleRegistration, validate, ROLES };
