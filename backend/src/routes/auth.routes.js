const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signToken, requireAuth } = require("../middleware/auth");
const { serializeUser, getUserFanlar } = require("../utils/helpers");

const router = express.Router();

// POST /api/auth/register  { ism, familiya, email, password }
router.post("/register", (req, res) => {
  const { ism, familiya, email, password, role = "student" } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const cleanIsm = String(ism || "").trim();
  const cleanFamiliya = String(familiya || "").trim();
  if (!cleanIsm || !normalizedEmail || !password) {
    return res.status(400).json({ error: "ism, email va password majburiy" });
  }
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 254 || cleanIsm.length > 80 || cleanFamiliya.length > 80) {
    return res.status(400).json({ error: "Kiritilgan ma'lumotlar noto'g'ri" });
  }
  if (String(password).length < 8 || String(password).length > 128) {
    return res.status(400).json({ error: "Parol 8–128 belgidan iborat bo'lishi kerak" });
  }
  if (!["student", "parent"].includes(role)) {
    return res.status(400).json({ error: "Faqat student yoki parent hisobini ochish mumkin" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (ism, familiya, email, password_hash, role, setup_done) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(cleanIsm, cleanFamiliya, normalizedEmail, passwordHash, role, role === "student" ? 0 : 1);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  db.prepare("INSERT INTO subscriptions (user_id, trial_ends_at) VALUES (?, datetime('now', '+30 days'))").run(user.id);
  const token = signToken(user.id);
  res.status(201).json({ token, user: serializeUser(user, getUserFanlar(db, user.id)) });
});

// POST /api/auth/login  { email, password }
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: "email va password majburiy" });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
  }
  const token = signToken(user.id);
  res.json({ token, user: serializeUser(user, getUserFanlar(db, user.id)) });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
  res.json({ user: serializeUser(user, getUserFanlar(db, user.id)) });
});

// POST /api/auth/setup  — ro'yxatdan o'tgandan keyingi SetupWizard qadami
// body: { yosh, sinf, maktab, fanlar: string[], universitet }
router.post("/setup", requireAuth, (req, res) => {
  const { yosh, sinf, maktab, fanlar, universitet } = req.body || {};

  db.prepare(
    `UPDATE users SET yosh = COALESCE(?, yosh), sinf = COALESCE(?, sinf),
       maktab = COALESCE(?, maktab), universitet = COALESCE(?, universitet),
       setup_done = 1, updated_at = datetime('now')
     WHERE id = ?`
  ).run(yosh ?? null, sinf ?? null, maktab ?? null, universitet ?? null, req.userId);

  if (Array.isArray(fanlar) && fanlar.length) {
    const getSubject = db.prepare("SELECT id FROM subjects WHERE nom = ?");
    const upsert = db.prepare(
      `INSERT INTO user_subjects (user_id, subject_id, foiz, baho, xp)
       VALUES (?, ?, 0, 3, 0)
       ON CONFLICT(user_id, subject_id) DO NOTHING`
    );
    fanlar.forEach((nom) => {
      const subj = getSubject.get(nom);
      if (subj) upsert.run(req.userId, subj.id);
    });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: serializeUser(user, getUserFanlar(db, user.id)) });
});

module.exports = router;
