// api/admin/login.js
// POST /api/admin/login — authentification admin

const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  getClientIp,
  isJsonRequest,
  rateLimit,
  requireStrongJwtSecret,
  setSecurityHeaders,
} = require("./_security");

module.exports = async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isJsonRequest(req)) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  // Rate limit login attempts (best-effort in serverless).
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `admin_login:${ip}`, limit: 10, windowMs: 60_000 });
  res.setHeader("X-RateLimit-Limit", "10");
  res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.floor(rl.resetAt / 1000)));
  if (!rl.allowed) {
    return res.status(429).json({ error: "Trop de tentatives, réessaie plus tard" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  try {
    const JWT_SECRET = requireStrongJwtSecret();
    const sql = neon(process.env.DATABASE_URL);

    // Chercher l'admin par email
    const users = await sql`
      SELECT id, email, password_hash, name 
      FROM admin_users 
      WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    // Créer un token JWT (valable 7 jours)
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d", algorithm: "HS256" }
    );

    // Envoyer le token dans un cookie sécurisé
    const hostPrefix = "__Host-";
    const cookieName = `${hostPrefix}token`;
    const host = (req.headers.host || "").toString();
    const isLocal =
      host.includes("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("[::1]");
    const proto = (req.headers["x-forwarded-proto"] || "").toString();
    const isHttps = proto.includes("https") || (!isLocal && proto !== "http");

    res.setHeader(
      "Set-Cookie",
      `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${
        7 * 24 * 60 * 60
      }; ${isHttps ? "Secure; " : ""}`
    );

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
