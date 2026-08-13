const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/subjects — foydalanuvchining barcha fanlari + progress + shu fandagi vazifalar soni
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.id, s.nom, s.emoji, s.rang,
              COALESCE(us.foiz, 0) AS foiz,
              COALESCE(us.baho, 0) AS baho,
              COALESCE(us.xp, 0) AS xp,
              (SELECT COUNT(*) FROM tasks t WHERE t.user_id = ? AND t.subject_id = s.id AND t.holat != 'bajarilgan') AS vazifalar
         FROM subjects s
         LEFT JOIN user_subjects us ON us.subject_id = s.id AND us.user_id = ?
         ORDER BY s.id`
    )
    .all(req.userId, req.userId);
  res.json({ subjects: rows });
});

// GET /api/subjects/:id — bitta fan tafsilotlari + shu fandagi vazifalar
router.get("/:id", requireAuth, (req, res) => {
  const subject = db.prepare("SELECT * FROM subjects WHERE id = ?").get(req.params.id);
  if (!subject) return res.status(404).json({ error: "Fan topilmadi" });

  const progress = db
    .prepare("SELECT * FROM user_subjects WHERE user_id = ? AND subject_id = ?")
    .get(req.userId, subject.id);

  const tasks = db
    .prepare("SELECT * FROM tasks WHERE user_id = ? AND subject_id = ? ORDER BY created_at DESC")
    .all(req.userId, subject.id);

  res.json({
    subject: {
      id: subject.id,
      nom: subject.nom,
      emoji: subject.emoji,
      rang: subject.rang,
      foiz: progress?.foiz || 0,
      baho: progress?.baho || 0,
      xp: progress?.xp || 0,
    },
    tasks,
  });
});

module.exports = router;
