const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const MONTHLY_PRICE_UZS = 50_000;
const PLANS = {
  monthly: { months: 1, priceUzs: 50_000, label: "1 oy" },
  quarterly: { months: 3, priceUzs: 135_000, label: "3 oy" },
  yearly: { months: 12, priceUzs: 480_000, label: "12 oy" },
};
const PROMO_CODES = { LEARNUP10: 10, START20: 20 };

function ensureSubscription(userId) {
  let subscription = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(userId);
  if (!subscription) {
    const user = db.prepare("SELECT created_at FROM users WHERE id = ?").get(userId);
    db.prepare("INSERT INTO subscriptions (user_id, trial_ends_at) VALUES (?, datetime(?, '+30 days'))").run(userId, user.created_at);
    subscription = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(userId);
  }
  const now = new Date();
  const expiresAt = subscription.status === "trialing" ? subscription.trial_ends_at : subscription.current_period_end;
  if (["trialing", "active"].includes(subscription.status) && expiresAt && new Date(expiresAt) <= now) {
    db.prepare("UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?").run(subscription.id);
    subscription = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(subscription.id);
  }
  return subscription;
}

function serialize(subscription, exempt = false) {
  return { plan: "pro", priceUzs: MONTHLY_PRICE_UZS, plans: Object.entries(PLANS).map(([id, p]) => ({ id, ...p })), status: exempt ? "active" : subscription.status, trialEndsAt: subscription?.trial_ends_at, currentPeriodEnd: subscription?.current_period_end, exempt };
}

function requireActiveSubscription(req, res, next) {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
  if (["admin", "teacher"].includes(user.role)) return next();
  const subscription = ensureSubscription(req.userId);
  if (["trialing", "active"].includes(subscription.status)) return next();
  return res.status(402).json({ error: "Pro obuna muddati tugagan", code: "SUBSCRIPTION_REQUIRED", subscription: serialize(subscription) });
}

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.userId);
  if (["admin", "teacher"].includes(user.role)) return res.json({ subscription: serialize(null, true) });
  res.json({ subscription: serialize(ensureSubscription(req.userId)) });
});

router.post("/promo/validate", requireAuth, (req, res) => {
  const code = String(req.body?.code || "").trim().toUpperCase();
  const percent = PROMO_CODES[code];
  if (!percent) return res.status(404).json({ error: "Promo-kod topilmadi yoki muddati tugagan" });
  res.json({ code, percent });
});

// Payment gateway ulanmaguncha invoice xavfsiz ravishda pending qoladi.
router.post("/payments", requireAuth, (req, res) => {
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(req.userId);
  if (["admin", "teacher"].includes(user.role)) return res.status(400).json({ error: "Bu akkaunt uchun obuna talab qilinmaydi" });
  const subscription = ensureSubscription(req.userId);
  const selectedPlan = PLANS[req.body?.planId] || PLANS.monthly;
  const promoCode = String(req.body?.promoCode || "").trim().toUpperCase();
  const discountPercent = PROMO_CODES[promoCode] || 0;
  const provider = ["click", "payme", "manual"].includes(req.body?.provider) ? req.body.provider : "manual";
  if ((req.body?.provider === "click" && !process.env.CLICK_SERVICE_ID) || (req.body?.provider === "payme" && !process.env.PAYME_MERCHANT_ID)) return res.status(400).json({ error: "Tanlangan to'lov provayderi hali sozlanmagan" });
  const existing = db.prepare("SELECT * FROM subscription_payments WHERE subscription_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(subscription.id);
  if (existing) return res.json({ payment: existing, paymentRequired: true });
  const providerRef = `LU-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
  const amount = Math.round(selectedPlan.priceUzs * (100 - discountPercent) / 100);
  const info = db.prepare("INSERT INTO subscription_payments (subscription_id, amount_uzs, provider, provider_ref, period_months) VALUES (?, ?, ?, ?, ?)").run(subscription.id, amount, provider, providerRef, selectedPlan.months);
  const payment = db.prepare("SELECT * FROM subscription_payments WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ payment: { ...payment, planId: req.body?.planId || "monthly", months: selectedPlan.months, discountPercent }, paymentRequired: true });
});

// Bu endpoint keyinchalik Click/Payme webhook bilan almashtiriladi. Hozir faqat admin tasdiqlaydi.
router.post("/payments/:id/mark-paid", requireAuth, requireAdmin, (req, res) => {
  const paymentId = Number(req.params.id);
  if (!Number.isInteger(paymentId) || paymentId < 1) return res.status(400).json({ error: "Payment ID noto'g'ri" });
  const payment = db.prepare("SELECT * FROM subscription_payments WHERE id = ?").get(paymentId);
  if (!payment) return res.status(404).json({ error: "To'lov topilmadi" });
  if (payment.status === "paid") return res.json({ success: true });
  db.transaction(() => {
    db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(payment.id);
    db.prepare("UPDATE subscriptions SET status = 'active', current_period_end = datetime('now', '+' || ? || ' months'), updated_at = datetime('now') WHERE id = ?").run(payment.period_months || 1, payment.subscription_id);
  })();
  res.json({ success: true });
});

// Click/Payme adapterlari ushbu yakuniy callback'ga server tomondan kelgan tasdiqni yuboradi.
router.post("/webhooks/:provider", (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || req.get("x-learnup-webhook-secret") !== secret) return res.status(401).json({ error: "Webhook imzosi noto'g'ri" });
  const provider = req.params.provider;
  if (!["click", "payme"].includes(provider)) return res.status(404).json({ error: "Provayder topilmadi" });
  const reference = String(req.body?.provider_ref || "");
  const payment = db.prepare("SELECT * FROM subscription_payments WHERE provider_ref = ? AND provider = ?").get(reference, provider);
  if (!payment) return res.status(404).json({ error: "To'lov topilmadi" });
  if (payment.status !== "paid") db.transaction(() => { db.prepare("UPDATE subscription_payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(payment.id); db.prepare("UPDATE subscriptions SET status = 'active', current_period_end = datetime('now', '+' || ? || ' months'), updated_at = datetime('now') WHERE id = ?").run(payment.period_months || 1, payment.subscription_id); })();
  res.json({ ok: true });
});

module.exports = { router, requireActiveSubscription, ensureSubscription };
