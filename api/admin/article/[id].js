// api/admin/article/[id].js
// GET    /api/admin/article/123 — récupérer un article
// PUT    /api/admin/article/123 — modifier un article
// DELETE /api/admin/article/123 — supprimer un article

const { neon } = require("@neondatabase/serverless");
const { verifyAuth } = require("../_auth");
const { getClientIp, isJsonRequest, rateLimit, setSecurityHeaders } = require("../_security");

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

  const user = verifyAuth(req);
  if (!user) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  const { id } = req.query;
  const sql = neon(process.env.DATABASE_URL);

  // ── GET : récupérer un article avec sa galerie ──
  if (req.method === "GET") {
    try {
      const articles = await sql`
        SELECT * FROM articles WHERE id = ${id}
      `;
      if (articles.length === 0) {
        return res.status(404).json({ error: "Article non trouvé" });
      }

      const images = await sql`
        SELECT image_path, sort_order FROM article_images 
        WHERE article_id = ${id} 
        ORDER BY sort_order ASC
      `;

      return res.status(200).json({
        ...articles[0],
        gallery: images.map((img) => img.image_path),
      });
    } catch (error) {
      console.error("Error fetching article:", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  // ── PUT : modifier un article ──
  if (req.method === "PUT") {
    if (!isJsonRequest(req)) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }

    const { title, slug, description, content, cover_image, video_url, status, gallery } = req.body;

    try {
      await sql`
        UPDATE articles 
        SET title = ${title}, slug = ${slug}, description = ${description || ""},
            content = ${content || ""}, cover_image = ${cover_image || ""},
            video_url = ${video_url || null}, status = ${status || "draft"},
            updated_at = NOW()
        WHERE id = ${id}
      `;

      // Remplacer la galerie
      await sql`DELETE FROM article_images WHERE article_id = ${id}`;
      if (gallery && gallery.length > 0) {
        for (let i = 0; i < gallery.length; i++) {
          if (gallery[i].trim()) {
            await sql`
              INSERT INTO article_images (article_id, image_path, sort_order)
              VALUES (${id}, ${gallery[i].trim()}, ${i})
            `;
          }
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating article:", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  // ── DELETE : supprimer un article ──
  if (req.method === "DELETE") {
    try {
      // Les images sont supprimées automatiquement grâce au ON DELETE CASCADE
      await sql`DELETE FROM articles WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting article:", error);
      return res.status(500).json({ error: "Erreur serveur" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
