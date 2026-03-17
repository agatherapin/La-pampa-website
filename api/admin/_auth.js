// api/admin/_auth.js
// Helper partagé pour vérifier l'authentification
// Le underscore _ dans le nom empêche Vercel de le traiter comme une route

const jwt = require("jsonwebtoken");

const { parseCookies, requireStrongJwtSecret } = require("./_security");

function verifyAuth(req) {
  let JWT_SECRET;
  try {
    JWT_SECRET = requireStrongJwtSecret();
  } catch {
    return null;
  }

  // Cherche le token dans le cookie ou le header Authorization
  const cookies = parseCookies(req.headers.cookie || "");
  const tokenFromCookie = cookies["__Host-token"] || cookies.token;
  const tokenFromHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return null;
  }

  try {
    // Pin algorithms to avoid alg=none / confusion attacks.
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

module.exports = { verifyAuth };
