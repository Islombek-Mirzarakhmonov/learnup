const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { serializeEvent } = require("../utils/helpers");

const router = express.Router();

// GET /api/calendar?year=2026&month=8  — shu oydagi barcha hodisalar
router.get("/", requireAuth, (req, res) => {
  const { year, month } = req.query;
  let rows;
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    rows = db
      .prepare("SELECT * FROM calendar_events WHERE user_id = ? AND sana LIKE ? ORDER BY sana")
      .all(req.userId, `${prefix}%`);
  } else {
    rows = db.prepare("SELECT * FROM calendar_events WHERE user_id = ? ORDER BY sana").all(req.userId);
  }
  res.json({ events: rows.map(serializeEvent) });
});

// POST /api/calendar  { sana, turi, label, rang }
router.post("/", requireAuth, (req, res) => {
  const { sana, turi, label, rang } = req.body || {};
  if (!sana || !label) return res.status(400).json({ error: "sana va label majburiy" });

  const info = db
    .prepare(`INSERT INTO calendar_events (user_id, sana, turi, label, rang) VALUES (?, ?, ?, ?, ?)`)
    .run(req.userId, sana, turi || "Vazifa", label, rang || "#3B82F6");

  const event = db.prepare("SELECT * FROM calendar_events WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ event: serializeEvent(event) });
});

// DELETE /api/calendar/:id
router.delete("/:id", requireAuth, (req, res) => {
  const info = db
    .prepare("DELETE FROM calendar_events WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: "Hodisa topilmadi" });
  res.json({ success: true });
});

module.exports = router;
