// api/admin/articles.js
// GET  /api/admin/articles — lister tous les articles (admin)
// POST /api/admin/articles — créer un nouvel article

const { neon } = require("@neondatabase/serverless");
const { verifyAuth } = require("./_auth");
const { getClientIp, isJsonRequest, rateLimit, setSecurityHeaders } = require("./_security");

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);

  // Best-effort rate limit for admin API usage.
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `admin_api:${ip}`, limit: 120, windowMs: 60_000 });
  res.setHeader("X-RateLimit-Limit", "120");
  res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.floor(rl.resetAt / 1000)));
  if (!rl.allowed) {
    return res.status(429).json({ error: "Trop de requêtes, réessaie plus tard" });
  }

  // Vérifier l'authentification
  const user = verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const sql = neon(process.env.DATABASE_URL);

  // ── GET : lister tous les articles ──
  if (req.method === "GET") {
    try {
      const articles = await sql`
        SELECT id, title, slug, description, cover_image, status, created_at, updated_at
        FROM articles
        ORDER BY created_at DESC
      `;
      return res.status(200).json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  // ── POST : créer un article ──
  if (req.method === "POST") {
    if (!isJsonRequest(req)) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }

    const { title, slug, description, content, cover_image, video_url, status, gallery } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: "Titre et slug requis" });
    }

    try {
      // Insérer l'article
      const result = await sql`
        INSERT INTO articles (title, slug, description, content, cover_image, video_url, status, author_id)
        VALUES (${title}, ${slug}, ${description || ""}, ${content || ""}, ${cover_image || ""}, ${video_url || null}, ${status || "draft"}, ${user.id})
        RETURNING id
      `;

      const articleId = result[0].id;

      // Insérer les images de galerie
      if (gallery && gallery.length > 0) {
        for (let i = 0; i < gallery.length; i++) {
          if (gallery[i].trim()) {
            await sql`
              INSERT INTO article_images (article_id, image_path, sort_order)
              VALUES (${articleId}, ${gallery[i].trim()}, ${i})
            `;
          }
        }
      }

      return res.status(201).json({ success: true, id: articleId });
    } catch (error) {
      console.error("Error creating article:", error);
      if (error.message?.includes("unique")) {
        return res.status(400).json({ error: "Ce slug existe déjà" });
      }
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
