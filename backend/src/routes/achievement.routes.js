const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/achievements — MukofotlarPage uchun to'liq ro'yxat + foydalanuvchi progressi
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.id, a.key, a.nom, a.desc, a.emoji, a.goal,
              COALESCE(ua.earned, 0) AS earned,
              COALESCE(ua.progress, 0) AS progress
         FROM achievements a
         LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
        ORDER BY a.id`
    )
    .all(req.userId);

  const achievements = rows.map((r) => ({
    id: r.id,
    nom: r.nom,
    desc: r.desc,
    emoji: r.emoji,
    earned: !!r.earned,
    progress: r.goal > 0 ? Math.round((r.progress / r.goal) * 100) : 0,
  }));
  res.json({ achievements });
});

module.exports = router;
