const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/leaderboard — MukofotlarPage "Reyting jadvali" bo'limi
// Foydalanuvchi + uning do'stlari orasida umumiy XP bo'yicha saralaydi
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.ism, u.familiya, u.daraja, u.umumiy_xp
         FROM users u
        WHERE u.id = ?
           OR u.id IN (SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted')
        ORDER BY u.umumiy_xp DESC`
    )
    .all(req.userId, req.userId);

  const leaderboard = rows.map((r, idx) => ({
    o: idx + 1,
    ism: `${r.ism} ${(r.familiya || "").charAt(0)}${r.familiya ? "." : ""}`.trim(),
    daraja: r.daraja,
    xp: r.umumiy_xp,
    me: r.id === req.userId,
  }));

  res.json({ leaderboard });
});

module.exports = router;
