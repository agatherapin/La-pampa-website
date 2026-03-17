// api/admin/_auth.js
// Helper partagé pour vérifier l'authentification
// Le underscore _ dans le nom empêche Vercel de le traiter comme une route

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function verifyAuth(req) {
  // Cherche le token dans le cookie ou le header Authorization
  const cookie = req.headers.cookie || "";
  const tokenFromCookie = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="));

  const token = tokenFromCookie
    ? tokenFromCookie.split("=")[1]
    : req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { verifyAuth };
