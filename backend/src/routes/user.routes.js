const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { serializeUser, getUserFanlar } = require("../utils/helpers");

const router = express.Router();

// GET /api/users/me
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: serializeUser(user, getUserFanlar(db, user.id)) });
});

// GET /api/users/notifications — foydalanuvchi uchun tizim va ota-ona bildirishnomalari
router.get("/notifications", requireAuth, (req, res) => {
  const notifications = db.prepare(`SELECT id, title, body, type, read_at, created_at
    FROM parent_notifications WHERE child_id = ? ORDER BY created_at DESC LIMIT 30`).all(req.userId);
  res.json({ notifications, unreadCount: notifications.filter((n) => !n.read_at).length });
});

router.patch("/notifications/:id/read", requireAuth, (req, res) => {
  const info = db.prepare("UPDATE parent_notifications SET read_at = COALESCE(read_at, datetime('now')) WHERE id = ? AND child_id = ?").run(req.params.id, req.userId);
  if (!info.changes) return res.status(404).json({ error: "Bildirishnoma topilmadi" });
  res.json({ success: true });
});

// PUT /api/users/me — SozlamalarPage: ism, familiya, email, sinf, maktab, universitet, fanlar, notif, dark
router.put("/me", requireAuth, (req, res) => {
  const { ism, familiya, email, sinf, maktab, universitet, notif, dark, fanlar, password } = req.body || {};

  if (email) {
    const other = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, req.userId);
    if (other) return res.status(409).json({ error: "Bu email boshqa foydalanuvchida band" });
  }

  db.prepare(
    `UPDATE users SET
       ism = COALESCE(?, ism),
       familiya = COALESCE(?, familiya),
       email = COALESCE(?, email),
       sinf = COALESCE(?, sinf),
       maktab = COALESCE(?, maktab),
       universitet = COALESCE(?, universitet),
       notif = COALESCE(?, notif),
       dark = COALESCE(?, dark),
       updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    ism ?? null,
    familiya ?? null,
    email ?? null,
    sinf ?? null,
    maktab ?? null,
    universitet ?? null,
    notif === undefined ? null : notif ? 1 : 0,
    dark === undefined ? null : dark ? 1 : 0,
    req.userId
  );

  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.userId);
  }

  if (Array.isArray(fanlar)) {
    // Foydalanuvchi tanlagan fanlar to'plamini to'liq almashtiramiz
    db.prepare("DELETE FROM user_subjects WHERE user_id = ?").run(req.userId);
    const getSubject = db.prepare("SELECT id FROM subjects WHERE nom = ?");
    const insert = db.prepare(
      `INSERT INTO user_subjects (user_id, subject_id, foiz, baho, xp) VALUES (?, ?, 0, 3, 0)`
    );
    fanlar.forEach((nom) => {
      const subj = getSubject.get(nom);
      if (subj) insert.run(req.userId, subj.id);
    });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: serializeUser(user, getUserFanlar(db, user.id)) });
});

module.exports = router;
