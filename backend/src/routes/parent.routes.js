const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

function roleGuard(role) {
  return (req, res, next) => {
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.userId);
    if (!user || user.role !== role) return res.status(403).json({ error: "Bu amal uchun ruxsat yo'q" });
    next();
  };
}
function validId(value) { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; }
function childCard(row) { return { id: row.id, ism: row.ism, familiya: row.familiya, sinf: row.sinf, maktab: row.maktab, avatarUrl: row.avatar_url || null }; }
function isLinked(parentId, childId) { return !!db.prepare("SELECT 1 FROM parent_children WHERE parent_id = ? AND child_id = ?").get(parentId, childId); }

function dashboard(childId) {
  const child = db.prepare("SELECT id, ism, familiya, sinf, maktab, avatar_url FROM users WHERE id = ? AND role = 'student'").get(childId);
  const subjects = db.prepare(`SELECT s.nom AS name, us.foiz AS progress, us.baho AS grade FROM user_subjects us JOIN subjects s ON s.id = us.subject_id WHERE us.user_id = ? ORDER BY s.nom`).all(childId);
  const taskStats = db.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN holat = 'bajarilgan' THEN 1 ELSE 0 END) AS completed FROM tasks WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-6 days')`).get(childId);
  const study = db.prepare(`SELECT COALESCE(SUM(duration), 0) AS seconds FROM typing_results WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-6 days')`).get(childId);
  const average = subjects.length ? subjects.reduce((sum, subject) => sum + subject.grade, 0) / subjects.length : 0;
  const concerns = db.prepare(`SELECT id, fan_nomi AS subject, nom AS task, muddat AS dueDate FROM tasks WHERE user_id = ? AND holat != 'bajarilgan' AND muddat IS NOT NULL AND datetime(muddat) < datetime('now') ORDER BY datetime(muddat) ASC LIMIT 5`).all(childId);
  const total = taskStats.total || 0, completed = taskStats.completed || 0;
  return { child: childCard(child), updatedAt: new Date().toISOString(), summary: { weeklyActivity: total ? Math.round(completed / total * 100) : 0, completedTasks: completed, totalTasks: total, studyMinutes: Math.round((study.seconds || 0) / 60), averageGrade: Number(average.toFixed(1)) }, subjects, weeklyReport: { attendance: 100, homeworkCompletion: total ? Math.round(completed / total * 100) : 0, averageGrade: Number(average.toFixed(1)) }, concerns };
}

// O'quvchi farzand bog'lash so'rovini o'zi tasdiqlaydi yoki rad etadi.
router.get("/link-requests/incoming", requireAuth, roleGuard("student"), (req, res) => {
  const requests = db.prepare(`SELECT r.id, r.created_at, p.ism, p.familiya, p.email FROM parent_link_requests r JOIN users p ON p.id = r.parent_id WHERE r.child_id = ? AND r.status = 'pending' ORDER BY r.created_at DESC`).all(req.userId);
  res.json({ requests });
});
router.patch("/link-requests/:id", requireAuth, roleGuard("student"), (req, res) => {
  const requestId = validId(req.params.id), status = req.body?.status;
  if (!requestId || !["accepted", "rejected"].includes(status)) return res.status(400).json({ error: "status accepted yoki rejected bo'lishi kerak" });
  const request = db.prepare("SELECT * FROM parent_link_requests WHERE id = ? AND child_id = ? AND status = 'pending'").get(requestId, req.userId);
  if (!request) return res.status(404).json({ error: "So'rov topilmadi" });
  db.transaction(() => { db.prepare("UPDATE parent_link_requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, requestId); if (status === "accepted") db.prepare("INSERT INTO parent_children (parent_id, child_id) VALUES (?, ?) ON CONFLICT(parent_id, child_id) DO NOTHING").run(request.parent_id, request.child_id); })();
  res.json({ success: true, status });
});

router.use(requireAuth, roleGuard("parent"));
router.get("/children", (req, res) => {
  const children = db.prepare(`SELECT u.* FROM parent_children pc JOIN users u ON u.id = pc.child_id WHERE pc.parent_id = ? ORDER BY u.ism, u.familiya`).all(req.userId).map(childCard);
  res.json({ children });
});
router.post("/children", (req, res) => {
  const email = String(req.body?.childEmail || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return res.status(400).json({ error: "Farzandning email manzili noto'g'ri" });
  const child = db.prepare("SELECT * FROM users WHERE lower(email) = ? AND role = 'student'").get(email);
  if (!child) return res.status(404).json({ error: "Bu email bilan o'quvchi topilmadi" });
  if (isLinked(req.userId, child.id)) return res.json({ child: childCard(child), linked: true });
  db.prepare(`INSERT INTO parent_link_requests (parent_id, child_id, status, updated_at) VALUES (?, ?, 'pending', datetime('now')) ON CONFLICT(parent_id, child_id) DO UPDATE SET status = 'pending', updated_at = datetime('now')`).run(req.userId, child.id);
  res.status(202).json({ pending: true, message: "Tasdiqlash so'rovi o'quvchi akkauntiga yuborildi" });
});
router.get("/children/:childId/dashboard", (req, res) => {
  const childId = validId(req.params.childId);
  if (!childId || !isLinked(req.userId, childId)) return res.status(404).json({ error: "Farzand bog'lanishi topilmadi" });
  res.json(dashboard(childId));
});
router.post("/children/:childId/notifications", (req, res) => {
  const childId = validId(req.params.childId), { title, body, type = "reminder" } = req.body || {};
  if (!childId || !isLinked(req.userId, childId)) return res.status(404).json({ error: "Farzand bog'lanishi topilmadi" });
  if (!String(title || "").trim() || String(title).length > 160 || String(body || "").length > 2000 || !["reminder", "concern", "weekly_report"].includes(type)) return res.status(400).json({ error: "Bildirishnoma ma'lumotlari noto'g'ri" });
  const info = db.prepare("INSERT INTO parent_notifications (parent_id, child_id, type, title, body) VALUES (?, ?, ?, ?, ?)").run(req.userId, childId, type, String(title).trim(), String(body || "").trim());
  res.status(201).json({ notification: db.prepare("SELECT * FROM parent_notifications WHERE id = ?").get(info.lastInsertRowid) });
});
router.get("/teachers", (req, res) => res.json({ teachers: db.prepare("SELECT id, ism, familiya, maktab FROM users WHERE role = 'teacher' ORDER BY ism, familiya").all() }));
router.get("/teachers/:teacherId/messages", (req, res) => {
  const teacherId = validId(req.params.teacherId), teacher = teacherId && db.prepare("SELECT id FROM users WHERE id = ? AND role = 'teacher'").get(teacherId);
  if (!teacher) return res.status(404).json({ error: "O'qituvchi topilmadi" });
  res.json({ messages: db.prepare(`SELECT m.id, m.sender_id, m.receiver_id, m.text, m.created_at, sender.ism AS sender_ism, sender.familiya AS sender_familiya FROM messages m JOIN users sender ON sender.id = m.sender_id WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?) ORDER BY datetime(m.created_at) ASC`).all(req.userId, teacherId, teacherId, req.userId) });
});
router.post("/teachers/:teacherId/messages", (req, res) => {
  const teacherId = validId(req.params.teacherId), text = String(req.body?.text || "").trim(), teacher = teacherId && db.prepare("SELECT id FROM users WHERE id = ? AND role = 'teacher'").get(teacherId);
  if (!teacher) return res.status(404).json({ error: "O'qituvchi topilmadi" });
  if (!text || text.length > 2000) return res.status(400).json({ error: "Xabar 1–2000 belgidan iborat bo'lishi kerak" });
  const info = db.prepare("INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)").run(req.userId, teacherId, text);
  res.status(201).json({ message: db.prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid) });
});
module.exports = router;
