const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { serializeUser } = require("../utils/helpers");

const router = express.Router();

router.use(requireAuth, requireAdmin);

// GET /api/admin/stats — umumiy statistika
router.get("/stats", (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'student'").get().c;
  const totalTasksDone = db.prepare("SELECT COUNT(*) c FROM tasks WHERE holat = 'bajarilgan'").get().c;
  const totalTasks = db.prepare("SELECT COUNT(*) c FROM tasks").get().c;
  const totalUniversities = db.prepare("SELECT COUNT(*) c FROM universities").get().c;
  const activeToday = db
    .prepare("SELECT COUNT(*) c FROM users WHERE date(updated_at) = date('now') AND role = 'student'")
    .get().c;

  const topStudents = db
    .prepare(
      `SELECT id, ism, familiya, daraja, umumiy_xp FROM users WHERE role = 'student' ORDER BY umumiy_xp DESC LIMIT 10`
    )
    .all();

  const recentUsers = db
    .prepare(
      `SELECT id, ism, familiya, email, sinf, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC LIMIT 10`
    )
    .all();

  res.json({
    totalUsers,
    totalTasksDone,
    totalTasks,
    totalUniversities,
    activeToday,
    topStudents,
    recentUsers,
  });
});

// GET /api/admin/users — barcha o'quvchilar ro'yxati (qidiruv bilan)
router.get("/users", (req, res) => {
  const q = `%${req.query.q || ""}%`;
  const rows = db
    .prepare(
      `SELECT id, ism, familiya, email, sinf, maktab, daraja, umumiy_xp, umumiy_vazifalar, created_at
         FROM users WHERE role = 'student' AND (ism LIKE ? OR familiya LIKE ? OR email LIKE ?)
        ORDER BY created_at DESC LIMIT 100`
    )
    .all(q, q, q);
  res.json({ users: rows });
});

module.exports = router;
