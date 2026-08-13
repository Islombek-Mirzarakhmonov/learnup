const jwt = require("jsonwebtoken");
const db = require("../db");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET kamida 32 belgidan iborat bo'lishi kerak");
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "8h", issuer: "learnup-api", audience: "learnup-web" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Avtorizatsiya talab qilinadi (token topilmadi)" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: "learnup-api", audience: "learnup-web" });
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token yaroqsiz yoki muddati o'tgan" });
  }
}

// Faqat admin roli uchun — requireAuth dan keyin ishlatiladi
function requireAdmin(req, res, next) {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Bu bo'lim faqat administratorlar uchun" });
  }
  next();
}

module.exports = { signToken, requireAuth, requireAdmin, JWT_SECRET };
