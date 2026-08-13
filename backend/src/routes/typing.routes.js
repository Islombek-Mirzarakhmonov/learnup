const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { applyXpGain } = require("../utils/helpers");
const { bumpAchievementProgress } = require("../utils/achievements");

const router = express.Router();

// GET /api/typing/texts — mashq uchun matnlar
router.get("/texts", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM typing_texts").all();
  res.json({ texts: rows.map((r) => r.matn) });
});

// POST /api/typing/results  { mode, wpm, accuracy, duration }
router.post("/results", requireAuth, (req, res) => {
  const { mode, wpm, accuracy, duration } = req.body || {};
  if (wpm === undefined || accuracy === undefined) {
    return res.status(400).json({ error: "wpm va accuracy majburiy" });
  }

  const info = db
    .prepare(
      `INSERT INTO typing_results (user_id, mode, wpm, accuracy, duration) VALUES (?, ?, ?, ?, ?)`
    )
    .run(req.userId, mode || "mashq", wpm, accuracy, duration || 60);

  // Natijaga qarab XP beramiz va "Tez yozuvchi" yutug'ini yangilaymiz
  const xpGain = Math.round(wpm * 0.5);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  const { daraja, xp, xpMax } = applyXpGain(user, xpGain);

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE users SET daraja = ?, xp = ?, xp_max = ?, umumiy_xp = umumiy_xp + ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(daraja, xp, xpMax, xpGain, req.userId);
    bumpAchievementProgress(req.userId, "tez-yozuvchi", wpm);
  });
  tx();

  const result = db.prepare("SELECT * FROM typing_results WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ result, xpGained: xpGain });
});

// GET /api/typing/leaderboard — eng yaxshi WPM natijalari bo'yicha reyting
router.get("/leaderboard", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.ism, u.familiya, MAX(tr.wpm) AS best_wpm
         FROM typing_results tr JOIN users u ON u.id = tr.user_id
        GROUP BY u.id ORDER BY best_wpm DESC LIMIT 20`
    )
    .all();
  res.json({ leaderboard: rows });
});

// GET /api/typing/history — mening natijalarim tarixi
router.get("/history", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM typing_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(req.userId);
  res.json({ history: rows });
});

module.exports = router;
