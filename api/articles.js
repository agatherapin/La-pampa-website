// api/articles.js
// Serverless function Vercel — point d'entrée API pour récupérer les articles
// Accessible via : GET /api/articles

const { neon } = require("@neondatabase/serverless");

module.exports = async function handler(req, res) {
  // On autorise uniquement les requêtes GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Connexion à Neon via la variable d'environnement
    const sql = neon(process.env.DATABASE_URL);

    // Récupérer tous les articles publiés
    const articles = await sql`
      SELECT id, title, slug, description, content, cover_image, video_url
      FROM articles
      WHERE status = 'published'
      ORDER BY id ASC
    `;

    // Récupérer toutes les images de galerie
    const images = await sql`
      SELECT article_id, image_path, sort_order
      FROM article_images
      ORDER BY article_id, sort_order ASC
    `;

    // Regrouper les images par article
    const imagesByArticle = {};
    for (const img of images) {
      if (!imagesByArticle[img.article_id]) {
        imagesByArticle[img.article_id] = [];
      }
      imagesByArticle[img.article_id].push(img.image_path);
    }

    // Assembler le résultat final (même format que ton ancien articles.js)
    const result = articles.map((a) => ({
      title: a.title,
      description: a.description,
      image: a.cover_image,
      content: a.content,
      gallery: imagesByArticle[a.id] || [],
      video: a.video_url || null,
    }));

    // Renvoyer le JSON
    res.status(200).json(result);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
