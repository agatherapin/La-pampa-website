// api/admin/_security.js
// Small security helpers shared by admin routes.

function getClientIp(req) {
  // Vercel/Proxies often set x-forwarded-for. Use first IP.
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim();
  const xrip = req.headers["x-real-ip"];
  if (typeof xrip === "string" && xrip.trim()) return xrip.trim();
  // Node incoming message often has socket remoteAddress.
  return req.socket?.remoteAddress || "unknown";
}

function parseCookies(cookieHeader) {
  const out = Object.create(null);
  if (!cookieHeader || typeof cookieHeader !== "string") return out;

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (!k) continue;
    // If multiple cookies share the same name, keep the first one.
    if (out[k] === undefined) out[k] = v;
  }
  return out;
}

function setSecurityHeaders(res) {
  // Keep minimal and safe for JSON endpoints.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  // For admin APIs, avoid caching authenticated responses.
  res.setHeader("Cache-Control", "no-store");
}

function requireStrongJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== "string" || secret.length < 32) {
    // Fail closed: without a strong secret, admin auth cannot be trusted.
    const err = new Error(
      "JWT_SECRET is missing/weak (must be >= 32 chars). Refusing to start."
    );
    err.code = "WEAK_JWT_SECRET";
    throw err;
  }
  return secret;
}

// Very small in-memory rate limiter. Note: serverless instances are ephemeral,
// so this is best-effort; still useful to slow down brute force.
const _buckets = new Map();

function rateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const entry = _buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    _buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  const allowed = entry.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

function isJsonRequest(req) {
  const ct = req.headers["content-type"];
  if (!ct || typeof ct !== "string") return false;
  return ct.toLowerCase().includes("application/json");
}

module.exports = {
  getClientIp,
  parseCookies,
  setSecurityHeaders,
  requireStrongJwtSecret,
  rateLimit,
  isJsonRequest,
};

