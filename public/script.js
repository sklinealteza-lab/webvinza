(() => {
  const MAIN = 5;
  const SUBS = 1;
  const form = document.getElementById("regForm");
  const playersEl = document.getElementById("players");
  const tpl = document.getElementById("playerTpl");
  const errorBox = document.getElementById("errorBox");
  const btn = document.getElementById("submitBtn");
  const modal = document.getElementById("successModal");

  document.getElementById("year").textContent = new Date().getFullYear();

  // Render kartu pemain
  for (let i = 0; i < MAIN + SUBS; i++) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const isSub = i >= MAIN;
    node.querySelector("legend").textContent = isSub ? "Cadangan (opsional)" : `Pemain ${i + 1}${i === 0 ? " • Kapten" : ""}`;
    if (isSub) node.classList.add("sub");
    playersEl.appendChild(node);
  }

  // Hanya angka untuk ID & server
  playersEl.addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (f === "gameId" || f === "serverId") e.target.value = e.target.value.replace(/\D/g, "");
    e.target.classList.remove("invalid");
  });
  form.addEventListener("input", (e) => e.target.classList.remove("invalid"));

  function collect() {
    const fd = new FormData(form);
    const players = [...playersEl.querySelectorAll(".player")].map((card) => {
      const p = {};
      card.querySelectorAll("[data-f]").forEach((el) => (p[el.dataset.f] = el.value.trim()));
      return p;
    });
    return {
      teamName: fd.get("teamName"),
      teamTag: fd.get("teamTag"),
      captainName: fd.get("captainName"),
      whatsapp: fd.get("whatsapp"),
      email: fd.get("email"),
      discord: fd.get("discord"),
      city: fd.get("city"),
      notes: fd.get("notes"),
      agree: form.agree.checked,
      website: fd.get("website"),
      players,
    };
  }

  // Validasi sisi klien (server tetap memvalidasi ulang)
  function validate(data) {
    const errs = [];
    const mark = (el) => el && el.classList.add("invalid");

    if ((data.teamName || "").trim().length < 3) { errs.push("Nama tim minimal 3 karakter."); mark(form.teamName); }
    if ((data.captainName || "").trim().length < 3) { errs.push("Nama kapten minimal 3 karakter."); mark(form.captainName); }
    if (!/^(\+62|62|0)8\d{7,12}$/.test((data.whatsapp || "").replace(/[\s-]/g, ""))) { errs.push("Nomor WhatsApp tidak valid."); mark(form.whatsapp); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email || "")) { errs.push("Email tidak valid."); mark(form.email); }

    const cards = playersEl.querySelectorAll(".player");
    data.players.forEach((p, i) => {
      const isSub = i >= MAIN;
      if (isSub && !p.nickname && !p.gameId && !p.serverId) return;
      const label = isSub ? "Cadangan" : `Pemain ${i + 1}`;
      const q = (f) => cards[i].querySelector(`[data-f="${f}"]`);
      if (p.nickname.length < 2) { errs.push(`${label}: nickname wajib diisi.`); mark(q("nickname")); }
      if (!/^\d{5,12}$/.test(p.gameId)) { errs.push(`${label}: ID game 5–12 digit.`); mark(q("gameId")); }
      if (!/^\d{3,6}$/.test(p.serverId)) { errs.push(`${label}: Server 3–6 digit.`); mark(q("serverId")); }
    });

    if (!data.agree) errs.push("Centang persetujuan peraturan turnamen.");
    return errs;
  }

  function showErrors(errs) {
    if (!errs.length) { errorBox.hidden = true; return; }
    errorBox.innerHTML = "<strong>Periksa kembali data berikut:</strong><ul>" +
      errs.map((e) => `<li>${e.replace(/</g, "&lt;")}</li>`).join("") + "</ul>";
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setLoading(on) {
    btn.disabled = on;
    btn.querySelector(".spinner").hidden = !on;
    btn.querySelector(".btn-text").textContent = on ? "Mengirim..." : "Daftarkan Tim";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = collect();
    const errs = validate(data);
    showErrors(errs);
    if (errs.length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) {
        showErrors(out.errors || [`Terjadi kesalahan (${res.status}). Coba lagi.`]);
        return;
      }
      document.getElementById("okTeam").textContent = data.teamName;
      document.getElementById("okCode").textContent = out.code;
      modal.hidden = false;
      form.reset();
    } catch {
      showErrors(["Tidak dapat terhubung ke server. Periksa koneksi internet kamu."]);
    } finally {
      setLoading(false);
    }
  });

  document.getElementById("closeModal").addEventListener("click", () => (modal.hidden = true));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
})();
