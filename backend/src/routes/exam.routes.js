const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { applyXpGain } = require("../utils/helpers");
const { bumpAchievementProgress } = require("../utils/achievements");

const router = express.Router();

function canAccessExam(exam, userId) {
  return !!exam && (exam.is_public === 1 || exam.creator_id === userId);
}

// ─── GET /api/exams — Barcha imtihonlar (public + o'zimning) ─────────────
router.get("/", requireAuth, (req, res) => {
  const { fan_id, difficulty, q } = req.query;
  let sql = `SELECT e.*, COUNT(eq.id) AS savollar_hisob
             FROM exams e
             LEFT JOIN exam_questions eq ON eq.exam_id = e.id
             WHERE e.is_public = 1 OR e.creator_id = ?
             GROUP BY e.id`;
  const params = [req.userId];

  if (fan_id) {
    sql += " AND e.fan_id = ?";
    params.push(fan_id);
  }
  if (difficulty) {
    sql += " AND e.difficulty = ?";
    params.push(difficulty);
  }
  if (q) {
    sql += " AND (e.nom LIKE ? OR e.tavsif LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += " ORDER BY e.created_at DESC";
  const exams = db.prepare(sql).all(...params);
  res.json({ exams });
});

// ─── GET /api/exams/:id — Imtihon tafsilotlari va savollar ──────────────
router.get("/:id", requireAuth, (req, res) => {
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(req.params.id);
  if (!exam) return res.status(404).json({ error: "Imtihon topilmadi" });

  const isOwner = exam.creator_id === req.userId;
  if (!exam.is_public && !isOwner) {
    return res.status(403).json({ error: "Bunga kirish ruxsatiyog'i yo'q" });
  }

  const questions = db
    .prepare("SELECT id, savol_matn, savol_turi, variantlar, ball, tartib FROM exam_questions WHERE exam_id = ? ORDER BY tartib")
    .all(req.params.id);

  const variantlariParsed = questions.map((q) => ({
    ...q,
    variantlar: JSON.parse(q.variantlar || "[]"),
  }));

  res.json({
    exam,
    questions: isOwner ? variantlariParsed.map(q => ({...q, togri_javob: undefined})) : variantlariParsed.map(q => ({...q, togri_javob: undefined}))
  });
});

// ─── POST /api/exams — Yangi imtihon yaratish ────────────────────────────
router.post("/", requireAuth, (req, res) => {
  const { nom, fan_nomi, fan_id, tavsif, muddat, difficulty, is_public, questions } = req.body || {};

  if (!nom || !fan_nomi) {
    return res.status(400).json({ error: "nom va fan_nomi majburiy" });
  }

  const info = db
    .prepare(
      `INSERT INTO exams (nom, fan_id, fan_nomi, tavsif, muddat, difficulty, creator_id, is_public, savollar_soni)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(nom, fan_id || null, fan_nomi, tavsif || null, muddat || 60, difficulty || "medium", req.userId, is_public ? 1 : 0, Array.isArray(questions) ? questions.length : 0);

  const examId = info.lastInsertRowid;

  // Savollarni qo'shish
  if (Array.isArray(questions) && questions.length > 0) {
    const insertQuestion = db.prepare(
      `INSERT INTO exam_questions (exam_id, savol_matn, savol_turi, variantlar, togri_javob, izoh, ball, tartib)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    questions.forEach((q, idx) => {
      insertQuestion.run(
        examId,
        q.savol_matn || "",
        q.savol_turi || "single",
        JSON.stringify(q.variantlar || []),
        typeof q.togri_javob === "string" ? q.togri_javob : JSON.stringify(q.togri_javob || null),
        q.izoh || null,
        q.ball || 1,
        idx + 1
      );
    });
  }

  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId);
  res.status(201).json({ exam });
});

// ─── POST /api/exams/:id/start — Imtihonni boshlash (javoblar qo'shish) ────
router.post("/:id/start", requireAuth, (req, res) => {
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(req.params.id);
  if (!exam) return res.status(404).json({ error: "Imtihon topilmadi" });
  if (!canAccessExam(exam, req.userId)) return res.status(403).json({ error: "Bunga kirish ruxsati yo'q" });

  // Boshlanmagan natija yaratish
  const existing = db
    .prepare("SELECT id FROM exam_results WHERE user_id = ? AND exam_id = ?")
    .get(req.userId, req.params.id);

  if (!existing) {
    db.prepare(
      `INSERT INTO exam_results (user_id, exam_id, maksimal_ball, javoblar)
       VALUES (?, ?, 100, ?)`
    ).run(req.userId, req.params.id, JSON.stringify({}));
  }

  const result = db.prepare("SELECT * FROM exam_results WHERE user_id = ? AND exam_id = ?").get(req.userId, req.params.id);
  res.json({ result });
});

// ─── POST /api/exams/:id/submit — Imtihonni tugallash (jaroblarni saqlash) ─
router.post("/:id/submit", requireAuth, (req, res) => {
  const { javoblar } = req.body || {}; // {question_id: user_answer}
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(req.params.id);
  if (!exam) return res.status(404).json({ error: "Imtihon topilmadi" });
  if (!canAccessExam(exam, req.userId)) return res.status(403).json({ error: "Bunga kirish ruxsati yo'q" });

  const result = db.prepare("SELECT * FROM exam_results WHERE user_id = ? AND exam_id = ?").get(req.userId, req.params.id);
  if (!result) return res.status(404).json({ error: "Natija topilmadi" });

  const questions = db.prepare("SELECT * FROM exam_questions WHERE exam_id = ?").all(req.params.id);

  // Javoblarni tekshirish
  let jami_ball = 0;
  let maksimal_ball = 0;

  questions.forEach((q) => {
    maksimal_ball += q.ball || 1;
    const togri = JSON.parse(q.togri_javob || "null");
    const javob = javoblar?.[q.id];

    if (q.savol_turi === "single") {
      if (javob === togri) jami_ball += q.ball || 1;
    } else if (q.savol_turi === "multiple") {
      const togriArray = Array.isArray(togri) ? togri : [];
      const javabiArray = Array.isArray(javob) ? javob : [];
      if (JSON.stringify(togriArray.sort()) === JSON.stringify(javabiArray.sort())) {
        jami_ball += q.ball || 1;
      }
    } else if (q.savol_turi === "text") {
      // Text javoblar exakt match (case-insensitive)
      if (String(javob || "").toLowerCase().trim() === String(togri || "").toLowerCase().trim()) {
        jami_ball += q.ball || 1;
      }
    }
  });

  const foiz = maksimal_ball > 0 ? Math.round((jami_ball / maksimal_ball) * 100) : 0;

  // Natijani saqlash
  db.prepare(
    `UPDATE exam_results SET
       jami_ball = ?, maksimal_ball = ?, foiz = ?,
       javoblar = ?, status = 'submitted', submitted_at = datetime('now')
     WHERE user_id = ? AND exam_id = ?`
  ).run(jami_ball, maksimal_ball, foiz, JSON.stringify(javoblar || {}), req.userId, req.params.id);

  // XP faqat birinchi topshirishda beriladi; qayta yuborish XP farm qilmasligi kerak.
  const firstSubmission = result.status !== "submitted" && result.status !== "graded";
  if (foiz >= 70 && firstSubmission) {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
    const xpGain = Math.round(foiz / 10);
    const { daraja, xp, xpMax } = applyXpGain(user, xpGain);

    db.prepare(
      `UPDATE users SET daraja = ?, xp = ?, xp_max = ?, coin = coin + ?, umumiy_xp = umumiy_xp + ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(daraja, xp, xpMax, Math.max(1, Math.round(xpGain / 2)), xpGain, req.userId);
    db.prepare("INSERT INTO parent_notifications (parent_id, child_id, type, title, body) VALUES (NULL, ?, 'exam', ?, ?)")
      .run(req.userId, "Imtihon natijasi tayyor", `${foiz}% natija uchun +${xpGain} XP va +${Math.max(1, Math.round(xpGain / 2))} coin oldingiz.`);

    bumpAchievementProgress(req.userId, "imtihon-ustosi", 1, foiz >= 90);
  }

  const updatedResult = db.prepare("SELECT * FROM exam_results WHERE user_id = ? AND exam_id = ?").get(req.userId, req.params.id);
  res.json({
    result: updatedResult,
    xpGained: foiz >= 70 ? Math.round(foiz / 10) : 0,
  });
});

// ─── GET /api/exams/:id/results — Imtihon natijalarim ────────────────────
router.get("/:id/results", requireAuth, (req, res) => {
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(req.params.id);
  if (!exam) return res.status(404).json({ error: "Imtihon topilmadi" });
  if (!canAccessExam(exam, req.userId)) return res.status(403).json({ error: "Bunga kirish ruxsati yo'q" });
  const result = db.prepare("SELECT * FROM exam_results WHERE user_id = ? AND exam_id = ?").get(req.userId, req.params.id);
  if (!result) return res.status(404).json({ error: "Natija topilmadi" });

  const questions = db.prepare("SELECT * FROM exam_questions WHERE exam_id = ?").all(req.params.id);
  const javoblar = JSON.parse(result.javoblar || "{}");

  const detailedResults = questions.map((q) => {
    const togri = JSON.parse(q.togri_javob || "null");
    const javob = javoblar[q.id];
    let correctness = false;

    if (q.savol_turi === "single") {
      correctness = javob === togri;
    } else if (q.savol_turi === "multiple") {
      const togriArray = Array.isArray(togri) ? togri.sort() : [];
      const javabiArray = Array.isArray(javob) ? javob.sort() : [];
      correctness = JSON.stringify(togriArray) === JSON.stringify(javabiArray);
    } else if (q.savol_turi === "text") {
      correctness = String(javob || "").toLowerCase().trim() === String(togri || "").toLowerCase().trim();
    }

    return {
      id: q.id,
      savol_matn: q.savol_matn,
      savol_turi: q.savol_turi,
      variantlar: JSON.parse(q.variantlar || "[]"),
      togri_javob: togri,
      user_javob: javob,
      correct: correctness,
      izoh: q.izoh,
      ball: q.ball,
    };
  });

  res.json({
    result,
    detailedResults,
  });
});

// ─── GET /api/exams/stats/overview — Imtihon statistikasi ─────────────────
router.get("/stats/overview", requireAuth, (req, res) => {
  const stats = db
    .prepare(
      `SELECT
         COUNT(DISTINCT exam_id) AS tugallangan_imtihonlar,
         AVG(foiz) AS o_rtacha_foiz,
         MAX(foiz) AS eng_yuksak_foiz,
         COUNT(*) AS jami_harkatlar
       FROM exam_results WHERE user_id = ? AND status = 'submitted'`
    )
    .get(req.userId);

  const weakAreas = db
    .prepare(
      `SELECT e.fan_nomi, AVG(er.foiz) AS o_rtacha
       FROM exam_results er
       JOIN exams e ON e.id = er.exam_id
       WHERE er.user_id = ? AND er.status = 'submitted'
       GROUP BY e.fan_nomi
       ORDER BY o_rtacha ASC
       LIMIT 5`
    )
    .all(req.userId);

  res.json({
    tugallangan_imtihonlar: stats?.tugallangan_imtihonlar || 0,
    o_rtacha_foiz: Math.round(stats?.o_rtacha_foiz || 0),
    eng_yuksak_foiz: stats?.eng_yuksak_foiz || 0,
    jami_harkatlar: stats?.jami_harkatlar || 0,
    qiyin_fanlar: weakAreas,
  });
});

module.exports = router;
