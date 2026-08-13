// Bazadagi (snake_case) user qatorini frontenddagi UserData shakliga o'tkazadi
function serializeUser(row, fanlar = []) {
  if (!row) return null;
  return {
    id: row.id,
    ism: row.ism,
    familiya: row.familiya,
    email: row.email,
    sinf: row.sinf,
    maktab: row.maktab,
    universitet: row.universitet,
    yosh: row.yosh,
    daraja: row.daraja,
    xp: row.xp,
    xpMax: row.xp_max,
    coin: row.coin,
    ketmaKet: row.ketma_ket,
    umumiyXP: row.umumiy_xp,
    umumiyVazifalar: row.umumiy_vazifalar,
    rating: row.rating,
    notif: !!row.notif,
    dark: !!row.dark,
    setupDone: !!row.setup_done,
    role: row.role || "student",
    avatarUrl: row.avatar_url || null,
    fanlar,
    createdAt: row.created_at,
  };
}

function serializeTask(row) {
  return {
    id: row.id,
    fan: row.fan_nomi,
    nom: row.nom,
    tavsif: row.tavsif || null,
    sana: row.sana_matni,
    muddat: row.muddat,
    holat: row.holat,
    xp: row.xp,
    muhim: !!row.muhim,
    tur: computeTur(row),
  };
}

// Vazifa qaysi tabga tegishli ekanini frontend mantig'iga mos hisoblaydi
function computeTur(row) {
  if (row.holat === "bajarilgan") return "bajarilgan";
  if (!row.muddat) return "kelgusi";
  const due = new Date(row.muddat);
  const now = new Date();
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  return sameDay ? "bugungi" : "kelgusi";
}

function serializeEvent(row) {
  return {
    id: row.id,
    sana: row.sana,
    turi: row.turi,
    label: row.label,
    rang: row.rang,
  };
}

// XP qo'shadi va kerak bo'lsa darajani oshiradi. Yangilangan {daraja, xp, xpMax} qaytaradi.
function applyXpGain(user, xpGain) {
  let { daraja, xp, xp_max: xpMax } = user;
  xp += xpGain;
  while (xp >= xpMax) {
    xp -= xpMax;
    daraja += 1;
    xpMax += 500; // har darajada talab ortadi
  }
  return { daraja, xp, xpMax };
}

// Foydalanuvchi tanlagan fanlar nomlari ro'yxatini qaytaradi
function getUserFanlar(db, userId) {
  return db
    .prepare(
      `SELECT s.nom FROM user_subjects us JOIN subjects s ON s.id = us.subject_id WHERE us.user_id = ?`
    )
    .all(userId)
    .map((r) => r.nom);
}

module.exports = { serializeUser, serializeTask, serializeEvent, computeTur, applyXpGain, getUserFanlar };
