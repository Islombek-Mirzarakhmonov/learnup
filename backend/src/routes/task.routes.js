const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { serializeTask, applyXpGain } = require("../utils/helpers");
const { bumpAchievementProgress } = require("../utils/achievements");

const router = express.Router();

// GET /api/tasks?tur=bugungi|kelgusi|bajarilgan
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.userId);
  let tasks = rows.map(serializeTask);
  if (req.query.tur) {
    tasks = tasks.filter((t) => t.tur === req.query.tur);
  }
  res.json({ tasks });
});

// POST /api/tasks  { fan, nom, muddat, sana, xp, muhim, tavsif }
router.post("/", requireAuth, (req, res) => {
  const { fan, nom, muddat, sana, xp, muhim, tavsif } = req.body || {};
  if (!nom || !fan) return res.status(400).json({ error: "nom va fan majburiy" });

  const subject = db.prepare("SELECT id FROM subjects WHERE nom = ?").get(fan);
  const sanaMatni = sana || (muddat ? new Date(muddat).toLocaleString("uz-UZ") : "Muddatsiz");

  const info = db
    .prepare(
      `INSERT INTO tasks (user_id, subject_id, fan_nomi, nom, tavsif, muddat, sana_matni, xp, muhim)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.userId, subject ? subject.id : null, fan, nom, tavsif || null, muddat || null, sanaMatni, xp || 20, muhim ? 1 : 0);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ task: serializeTask(task) });
});

// PATCH /api/tasks/:id  { holat, nom, muhim, ... } — umumiy yangilash
router.patch("/:id", requireAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Vazifa topilmadi" });

  const { nom, tavsif, holat, muhim } = req.body || {};
  db.prepare(
    `UPDATE tasks SET nom = COALESCE(?, nom), tavsif = COALESCE(?, tavsif),
       holat = COALESCE(?, holat), muhim = COALESCE(?, muhim)
     WHERE id = ?`
  ).run(nom ?? null, tavsif ?? null, holat ?? null, muhim === undefined ? null : muhim ? 1 : 0, task.id);

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
  res.json({ task: serializeTask(updated) });
});

// PATCH /api/tasks/:id/complete — "✓ Bajarilgan deb belgilash" tugmasi
router.patch("/:id/complete", requireAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Vazifa topilmadi" });
  if (task.holat === "bajarilgan") return res.json({ task: serializeTask(task) });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  const { daraja, xp, xpMax } = applyXpGain(user, task.xp);

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE tasks SET holat = 'bajarilgan', completed_at = datetime('now') WHERE id = ?`
    ).run(task.id);

    db.prepare(
      `UPDATE users SET daraja = ?, xp = ?, xp_max = ?, coin = coin + ?,
         umumiy_xp = umumiy_xp + ?, umumiy_vazifalar = umumiy_vazifalar + 1,
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(daraja, xp, xpMax, Math.round(task.xp / 5), task.xp, req.userId);
    db.prepare("INSERT INTO parent_notifications (parent_id, child_id, type, title, body) VALUES (NULL, ?, 'reward', ?, ?)")
      .run(req.userId, "XP va coin qo'shildi", `“${task.nom}” vazifasi uchun +${task.xp} XP va +${Math.round(task.xp / 5)} coin oldingiz.`);

    bumpAchievementProgress(req.userId, "birinchi-qadam", 1, true);
    const doneCount = db
      .prepare("SELECT COUNT(*) c FROM tasks WHERE user_id = ? AND holat = 'bajarilgan'")
      .get(req.userId).c;
    bumpAchievementProgress(req.userId, "50-vazifa", doneCount);
  });
  tx();

  const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
  const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({
    task: serializeTask(updatedTask),
    xpGained: task.xp,
    user: {
      daraja: updatedUser.daraja,
      xp: updatedUser.xp,
      xpMax: updatedUser.xp_max,
      coin: updatedUser.coin,
    },
  });
});

// DELETE /api/tasks/:id
router.delete("/:id", requireAuth, (req, res) => {
  const info = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: "Vazifa topilmadi" });
  res.json({ success: true });
});

module.exports = router;
