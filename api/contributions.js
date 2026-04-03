// api/contributions.js
// POST /api/contributions — soumettre une contribution publique (sans authentification)
//
// Migration SQL requise (à exécuter une fois sur la base Neon) :
// ─────────────────────────────────────────────────────────────────
// CREATE TABLE IF NOT EXISTS contributions (
//   id          SERIAL PRIMARY KEY,
//   title       TEXT        NOT NULL,
//   description TEXT        NOT NULL DEFAULT '',
//   content     TEXT        NOT NULL,
//   cover_image TEXT        NOT NULL DEFAULT '',
//   author_name TEXT        NOT NULL DEFAULT '',
//   email       TEXT        NOT NULL DEFAULT '',
//   status      TEXT        NOT NULL DEFAULT 'pending',
//   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// ─────────────────────────────────────────────────────────────────

const { neon } = require("@neondatabase/serverless");
const {
  getClientIp,
  rateLimit,
  setSecurityHeaders,
  isJsonRequest,
} = require("./admin/_security");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isJsonRequest(req)) {
    return res.status(415).json({ error: "Content-Type doit être application/json" });
  }

  // 3 contributions par heure par IP (in-memory, best-effort sur serverless)
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `contrib:${ip}`, limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: "Trop de soumissions, réessayez dans une heure." });
  }

  const { title, description, content, cover_image, author_name, email } = req.body || {};

  // Validation
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "Titre requis" });
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Contenu requis" });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: "Titre trop long (max 200 caractères)" });
  }
  if (description && typeof description === "string" && description.length > 500) {
    return res.status(400).json({ error: "Résumé trop long (max 500 caractères)" });
  }
  if (content.length > 100_000) {
    return res.status(400).json({ error: "Contenu trop long" });
  }
  if (email && typeof email === "string" && email.trim()) {
    if (!EMAIL_RE.test(email.trim()) || email.length > 254) {
      return res.status(400).json({ error: "Adresse e-mail invalide" });
    }
  }
  // Image : data URL base64 — ~4 Mo encodé ≈ 5,5 Mo en base64
  if (cover_image) {
    if (typeof cover_image !== "string") {
      return res.status(400).json({ error: "Format d'image invalide" });
    }
    if (cover_image.length > 6_000_000) {
      return res.status(400).json({ error: "Image trop volumineuse (max 4 Mo)" });
    }
    if (!cover_image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Format d'image invalide" });
    }
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    await sql`
      INSERT INTO contributions (title, description, content, cover_image, author_name, email)
      VALUES (
        ${title.trim()},
        ${(typeof description === "string" ? description : "").trim()},
        ${content.trim()},
        ${cover_image || ""},
        ${(typeof author_name === "string" ? author_name : "").trim().slice(0, 80)},
        ${(typeof email === "string" ? email : "").trim().slice(0, 254)}
      )
    `;
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("Contribution error:", err);
    return res.status(500).json({ error: "Erreur serveur, réessayez plus tard." });
  }
};
