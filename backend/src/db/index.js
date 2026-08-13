const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const Database = (() => {
  try {
    return require("better-sqlite3");
  } catch (error) {
    return DatabaseSync;
  }
})();

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "..", "data", "learnup.db");

// data papkasi mavjud bo'lishini ta'minlaymiz
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
if (typeof db.pragma !== "function") {
  db.pragma = (sql) => {
    const normalized = /^(\s*PRAGMA\s+)/i.test(sql) ? sql : `PRAGMA ${sql}`;
    db.exec(normalized.trim() + ";");
    return db;
  };
}
if (typeof db.transaction !== "function") {
  db.transaction = (callback) => {
    return (...args) => {
      db.exec("BEGIN;");
      try {
        const result = callback(...args);
        db.exec("COMMIT;");
        return result;
      } catch (error) {
        try {
          db.exec("ROLLBACK;");
        } catch (rollbackError) {
          console.error("SQLite rollback failed:", rollbackError);
        }
        throw error;
      }
    };
  };
}
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Sxemani ishga tushirishda avtomatik qo'llaymiz (migratsiya kerak emas)
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// Eski (yangilanishdan oldingi) bazalar uchun yengil migratsiya:
// agar users jadvalida `role` ustuni bo'lmasa, qo'shib qo'yamiz.
try {
  const cols = db.prepare("PRAGMA table_info(users)").all();
  const hasRole = cols.some((c) => c.name === "role");
  if (!hasRole) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");
  }
} catch (e) {
  console.error("Migratsiya xatosi (role):", e.message);
}

try {
  const paymentCols = db.prepare("PRAGMA table_info(subscription_payments)").all();
  if (!paymentCols.some((c) => c.name === "period_months")) db.exec("ALTER TABLE subscription_payments ADD COLUMN period_months INTEGER NOT NULL DEFAULT 1");
} catch (e) {
  console.error("Migratsiya xatosi (subscription payments):", e.message);
}

module.exports = db;
