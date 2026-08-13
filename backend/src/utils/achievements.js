const db = require("../db");

/**
 * Foydalanuvchining berilgan achievement bo'yicha progressini yangilaydi.
 * Agar progress >= goal bo'lsa, avtomatik "earned" deb belgilanadi.
 */
function bumpAchievementProgress(userId, achievementKey, newProgress, forceEarned = false) {
  const achievement = db.prepare("SELECT * FROM achievements WHERE key = ?").get(achievementKey);
  if (!achievement) return;

  const existing = db
    .prepare("SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?")
    .get(userId, achievement.id);

  const earned = forceEarned || newProgress >= achievement.goal;
  const progress = Math.min(newProgress, achievement.goal);

  if (!existing) {
    db.prepare(
      `INSERT INTO user_achievements (user_id, achievement_id, earned, progress, earned_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(userId, achievement.id, earned ? 1 : 0, progress, earned ? new Date().toISOString() : null);
  } else if (!existing.earned) {
    db.prepare(
      `UPDATE user_achievements SET progress = ?, earned = ?, earned_at = ?
       WHERE id = ?`
    ).run(progress, earned ? 1 : 0, earned ? new Date().toISOString() : null, existing.id);
  }
}

module.exports = { bumpAchievementProgress };
