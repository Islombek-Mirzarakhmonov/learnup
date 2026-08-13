const db = require("../db");

function sendSubscriptionReminders() {
  const rows = db.prepare(`SELECT s.id, s.user_id, s.status, COALESCE(s.current_period_end, s.trial_ends_at) AS ends_at
    FROM subscriptions s WHERE s.status IN ('trialing', 'active') AND COALESCE(s.current_period_end, s.trial_ends_at) IS NOT NULL`).all();
  const insertReminder = db.prepare("INSERT OR IGNORE INTO subscription_reminders (subscription_id, days_left) VALUES (?, ?)");
  const insertNotification = db.prepare("INSERT INTO parent_notifications (parent_id, child_id, title, body, type) VALUES (NULL, ?, ?, ?, 'subscription')");
  for (const subscription of rows) {
    const daysLeft = Math.ceil((new Date(subscription.ends_at).getTime() - Date.now()) / 86400000);
    if (![1, 3, 7].includes(daysLeft)) continue;
    const created = insertReminder.run(subscription.id, daysLeft);
    if (created.changes) insertNotification.run(subscription.user_id, "Pro obuna muddati yaqinlashmoqda", `Pro obunangiz ${daysLeft} kundan keyin tugaydi. Davom etish uchun tarifni yangilang.`);
  }
}

function startSubscriptionReminders() {
  sendSubscriptionReminders();
  return setInterval(sendSubscriptionReminders, 12 * 60 * 60 * 1000);
}

module.exports = { sendSubscriptionReminders, startSubscriptionReminders };
