// api/admin/me.js
// GET /api/admin/me — vérifier si l'utilisateur est connecté
// POST /api/admin/me — déconnexion (logout)

const { verifyAuth } = require("./_auth");

module.exports = async function handler(req, res) {
  // GET : vérifier l'auth
  if (req.method === "GET") {
    const user = verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: "Non autorisé" });
    }
    return res.status(200).json({ user });
  }

  // DELETE : logout (supprimer le cookie)
  if (req.method === "DELETE") {
    res.setHeader(
      "Set-Cookie",
      `token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0;`
    );
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
