const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/universities?q=&shahar=&turi=
router.get("/", requireAuth, (req, res) => {
  const { q, shahar, turi } = req.query;
  let sql = "SELECT * FROM universities WHERE 1=1";
  const params = [];
  if (q) { sql += " AND (nom LIKE ? OR yonalishlar LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }
  if (shahar) { sql += " AND shahar = ?"; params.push(shahar); }
  if (turi) { sql += " AND turi = ?"; params.push(turi); }
  sql += " ORDER BY nom";
  const universities = db.prepare(sql).all(...params);
  res.json({ universities });
});

// GET /api/universities/:id
router.get("/:id", requireAuth, (req, res) => {
  const uni = db.prepare("SELECT * FROM universities WHERE id = ?").get(req.params.id);
  if (!uni) return res.status(404).json({ error: "Universitet topilmadi" });
  res.json({ university: uni });
});

// POST /api/universities — faqat admin
router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { nom, shahar, turi, yonalishlar, vebsayt, tavsif } = req.body || {};
  if (!nom) return res.status(400).json({ error: "nom majburiy" });
  const info = db
    .prepare(
      `INSERT INTO universities (nom, shahar, turi, yonalishlar, vebsayt, tavsif) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(nom, shahar || "", turi || "davlat", yonalishlar || "", vebsayt || null, tavsif || null);
  const uni = db.prepare("SELECT * FROM universities WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ university: uni });
});

// PATCH /api/universities/:id — faqat admin
router.patch("/:id", requireAuth, requireAdmin, (req, res) => {
  const uni = db.prepare("SELECT * FROM universities WHERE id = ?").get(req.params.id);
  if (!uni) return res.status(404).json({ error: "Universitet topilmadi" });
  const { nom, shahar, turi, yonalishlar, vebsayt, tavsif } = req.body || {};
  db.prepare(
    `UPDATE universities SET nom = COALESCE(?, nom), shahar = COALESCE(?, shahar),
       turi = COALESCE(?, turi), yonalishlar = COALESCE(?, yonalishlar),
       vebsayt = COALESCE(?, vebsayt), tavsif = COALESCE(?, tavsif)
     WHERE id = ?`
  ).run(nom ?? null, shahar ?? null, turi ?? null, yonalishlar ?? null, vebsayt ?? null, tavsif ?? null, uni.id);
  const updated = db.prepare("SELECT * FROM universities WHERE id = ?").get(uni.id);
  res.json({ university: updated });
});

// DELETE /api/universities/:id — faqat admin
router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare("DELETE FROM universities WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Universitet topilmadi" });
  res.json({ success: true });
});

module.exports = router;
