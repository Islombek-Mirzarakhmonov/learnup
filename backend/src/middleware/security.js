const crypto = require("crypto");

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'");
  }
  next();
}

function createRateLimiter({ windowMs, max, key = (req) => req.ip, message }) {
  const visits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    if (visits.size > 1000) {
      for (const [oldId, oldRecord] of visits) if (oldRecord.resetAt <= now) visits.delete(oldId);
    }
    const id = key(req);
    const record = visits.get(id);
    if (!record || record.resetAt <= now) {
      visits.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }
    record.count += 1;
    if (record.count > max) {
      res.setHeader("Retry-After", Math.ceil((record.resetAt - now) / 1000));
      return res.status(429).json({ error: message || "Juda ko'p so'rov yuborildi. Keyinroq urinib ko'ring." });
    }
    next();
  };
}

function requestId(req, res, next) {
  const id = crypto.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

module.exports = { securityHeaders, createRateLimiter, requestId };
