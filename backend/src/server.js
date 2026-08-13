require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { securityHeaders, createRateLimiter, requestId } = require("./middleware/security");

require("./db"); // bazani va sxemani ishga tushiradi

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const subjectRoutes = require("./routes/subject.routes");
const taskRoutes = require("./routes/task.routes");
const calendarRoutes = require("./routes/calendar.routes");
const friendRoutes = require("./routes/friend.routes");
const typingRoutes = require("./routes/typing.routes");
const achievementRoutes = require("./routes/achievement.routes");
const leaderboardRoutes = require("./routes/leaderboard.routes");
const aiRoutes = require("./routes/ai.routes");
const universityRoutes = require("./routes/university.routes");
const adminRoutes = require("./routes/admin.routes");
const examRoutes = require("./routes/exam.routes");
const parentRoutes = require("./routes/parent.routes");
const { requireAuth } = require("./middleware/auth");
const { router: subscriptionRoutes, requireActiveSubscription } = require("./routes/subscription.routes");
const { startSubscriptionReminders } = require("./utils/subscription-reminders");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173,http://localhost:4000").split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  const error = new Error("Bu origin uchun CORS ruxsati yo'q");
  error.status = 403;
  return callback(error);
}, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"], maxAge: 600 }));
app.use(securityHeaders);
app.use(requestId);
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 600 }));
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: "Kirish/ro'yxatdan o'tish urinishlari ko'p. 15 daqiqadan so'ng qayta urinib ko'ring." }), authRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/users", requireAuth, requireActiveSubscription, userRoutes);
app.use("/api/subjects", requireAuth, requireActiveSubscription, subjectRoutes);
app.use("/api/tasks", requireAuth, requireActiveSubscription, taskRoutes);
app.use("/api/calendar", requireAuth, requireActiveSubscription, calendarRoutes);
app.use("/api/friends", requireAuth, requireActiveSubscription, friendRoutes);
app.use("/api/typing", requireAuth, requireActiveSubscription, typingRoutes);
app.use("/api/achievements", requireAuth, requireActiveSubscription, achievementRoutes);
app.use("/api/leaderboard", requireAuth, requireActiveSubscription, leaderboardRoutes);
app.use("/api/ai", requireAuth, requireActiveSubscription, createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: "AI so'rovlari limiti tugadi. Keyinroq urinib ko'ring." }), aiRoutes);
app.use("/api/universities", requireAuth, requireActiveSubscription, universityRoutes);
app.use("/api/admin", requireAuth, requireActiveSubscription, adminRoutes);
app.use("/api/exams", requireAuth, requireActiveSubscription, examRoutes);
app.use("/api/parent", requireAuth, requireActiveSubscription, parentRoutes);

// ─── Frontendni servis qilish (agar build qilingan bo'lsa) ──────────────────
const frontendDist = path.join(__dirname, "..", "public");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// 404 va xatoliklarni ushlash
app.use("/api", (req, res) => res.status(404).json({ error: "Endpoint topilmadi" }));
app.use((err, req, res, next) => {
  console.error(`[${req.requestId || "unknown"}]`, err.message);
  const status = err.status || (err.type === "entity.too.large" ? 413 : 500);
  res.status(status).json({ error: status === 413 ? "So'rov hajmi juda katta" : "Serverda kutilmagan xatolik yuz berdi", requestId: req.requestId });
});

const PORT = process.env.PORT || 4000;
startSubscriptionReminders();
app.listen(PORT, () => {
  console.log(`✅ LearnUp backend http://localhost:${PORT} portida ishlamoqda`);
});
