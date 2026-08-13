const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function friendCardFromUser(row) {
  return { id: row.id, ism: `${row.ism} ${row.familiya || ""}`.trim(), sinf: row.sinf, xp: row.xp, daraja: row.daraja, faoliyat: `${row.umumiy_vazifalar || 0} ta vazifa bajardi`, vaqt: row.updated_at };
}

function parseUserId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function areFriends(userId, otherId) {
  return !!db.prepare("SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'accepted'").get(userId, otherId);
}

function requireFriend(req, res, next) {
  const friendId = parseUserId(req.params.id);
  if (!friendId || !areFriends(req.userId, friendId)) return res.status(403).json({ error: "Bu foydalanuvchi bilan do'stlik tasdiqlanmagan" });
  req.friendId = friendId;
  next();
}

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT u.* FROM friendships f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND f.status = 'accepted' ORDER BY u.xp DESC`).all(req.userId);
  res.json({ friends: rows.map(friendCardFromUser) });
});

router.get("/search", requireAuth, (req, res) => {
  const search = String(req.query.q || "").trim().slice(0, 80);
  if (search.length < 2) return res.json({ results: [] });
  const q = `%${search}%`;
  const rows = db.prepare(`SELECT id, ism, familiya, sinf, daraja, xp FROM users WHERE id != ? AND role = 'student' AND (ism LIKE ? OR familiya LIKE ?) LIMIT 20`).all(req.userId, q, q);
  res.json({ results: rows });
});

router.post("/", requireAuth, (req, res) => {
  const { friendId, email } = req.body || {};
  let targetId = friendId;
  if (!targetId && email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
    if (!user) return res.status(404).json({ error: "Bunday foydalanuvchi topilmadi" });
    targetId = user.id;
  }
  targetId = parseUserId(targetId);
  if (!targetId) return res.status(400).json({ error: "friendId yoki email kerak" });
  if (targetId === req.userId) return res.status(400).json({ error: "O'zingizni qo'sha olmaysiz" });
  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(targetId);
  if (!target || target.role !== "student") return res.status(404).json({ error: "O'quvchi topilmadi" });
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted') ON CONFLICT(user_id, friend_id) DO NOTHING`).run(req.userId, targetId);
    db.prepare(`INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted') ON CONFLICT(user_id, friend_id) DO NOTHING`).run(targetId, req.userId);
  });
  tx();
  res.status(201).json({ success: true });
});

// Parametrli /:id route'dan oldin joylashgan bo'lishi shart.
router.get("/challenges/incoming", requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT c.*, u.ism AS sender_ism, u.familiya AS sender_familiya FROM challenges c JOIN users u ON u.id = c.sender_id WHERE c.receiver_id = ? ORDER BY c.created_at DESC`).all(req.userId);
  res.json({ challenges: rows });
});

router.get("/:id/messages", requireAuth, requireFriend, (req, res) => {
  const messages = db.prepare(`SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY created_at ASC`).all(req.userId, req.friendId, req.friendId, req.userId);
  res.json({ messages });
});

router.post("/:id/messages", requireAuth, requireFriend, (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text || text.length > 2000) return res.status(400).json({ error: "Xabar 1–2000 belgidan iborat bo'lishi kerak" });
  const info = db.prepare("INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)").run(req.userId, req.friendId, text);
  res.status(201).json({ message: db.prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid) });
});

router.post("/:id/challenge", requireAuth, requireFriend, (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text || text.length > 500) return res.status(400).json({ error: "Challenge 1–500 belgidan iborat bo'lishi kerak" });
  const info = db.prepare("INSERT INTO challenges (sender_id, receiver_id, text) VALUES (?, ?, ?)").run(req.userId, req.friendId, text);
  res.status(201).json({ challenge: db.prepare("SELECT * FROM challenges WHERE id = ?").get(info.lastInsertRowid) });
});

router.get("/:id", requireAuth, requireFriend, (req, res) => {
  const friend = db.prepare("SELECT * FROM users WHERE id = ?").get(req.friendId);
  if (!friend) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
  res.json({ friend: friendCardFromUser(friend), isFriend: true });
});

module.exports = router;
