-- LearnUp backend — SQLite schema

CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  ism               TEXT NOT NULL,
  familiya          TEXT NOT NULL DEFAULT '',
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  sinf              TEXT NOT NULL DEFAULT '',
  maktab            TEXT NOT NULL DEFAULT '',
  universitet       TEXT NOT NULL DEFAULT '',
  yosh              INTEGER NOT NULL DEFAULT 0,

  daraja            INTEGER NOT NULL DEFAULT 1,
  xp                INTEGER NOT NULL DEFAULT 0,
  xp_max            INTEGER NOT NULL DEFAULT 1000,
  coin              INTEGER NOT NULL DEFAULT 0,
  ketma_ket         INTEGER NOT NULL DEFAULT 0,
  umumiy_xp         INTEGER NOT NULL DEFAULT 0,
  umumiy_vazifalar  INTEGER NOT NULL DEFAULT 0,
  rating            INTEGER NOT NULL DEFAULT 0,

  notif             INTEGER NOT NULL DEFAULT 1,
  dark              INTEGER NOT NULL DEFAULT 0,
  setup_done        INTEGER NOT NULL DEFAULT 0,
  role              TEXT NOT NULL DEFAULT 'student', -- student | parent | teacher | admin
  avatar_url        TEXT,
  last_active_date  TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nom    TEXT NOT NULL UNIQUE,
  emoji  TEXT NOT NULL DEFAULT '📘',
  rang   TEXT NOT NULL DEFAULT '#0F766E'
);

CREATE TABLE IF NOT EXISTS user_subjects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  foiz       INTEGER NOT NULL DEFAULT 0,
  baho       INTEGER NOT NULL DEFAULT 3,
  xp         INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, subject_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id   INTEGER REFERENCES subjects(id),
  fan_nomi     TEXT NOT NULL,
  nom          TEXT NOT NULL,
  tavsif       TEXT,
  muddat       TEXT,               -- ISO date, real due date used for sorting/tur
  sana_matni   TEXT NOT NULL,      -- "Bugun, 23:59" kabi matn
  holat        TEXT NOT NULL DEFAULT 'bajarilmagan', -- bajarilmagan | jarayonda | bajarilgan
  xp           INTEGER NOT NULL DEFAULT 20,
  muhim        INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sana       TEXT NOT NULL,  -- ISO date
  turi       TEXT NOT NULL DEFAULT 'Vazifa',
  label      TEXT NOT NULL,
  rang       TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS friendships (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'accepted', -- pending | accepted | rejected
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ota-ona va farzand orasidagi bog'lanish. Bir ota-onada bir nechta farzand bo'lishi mumkin.
CREATE TABLE IF NOT EXISTS parent_children (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(parent_id, child_id),
  CHECK(parent_id != child_id)
);

CREATE TABLE IF NOT EXISTS parent_link_requests (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(parent_id, child_id)
);

-- Ota-onadan yuborilgan eslatmalar va tizim concern bildirishnomalari.
CREATE TABLE IF NOT EXISTS parent_notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  child_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'reminder', -- reminder | concern | weekly_report
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan               TEXT NOT NULL DEFAULT 'pro',
  status             TEXT NOT NULL DEFAULT 'trialing', -- trialing | active | expired | cancelled
  trial_ends_at      TEXT,
  current_period_end TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount_uzs      INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | cancelled
  provider        TEXT NOT NULL DEFAULT 'manual',
  provider_ref    TEXT UNIQUE,
  period_months   INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at         TEXT
);

CREATE TABLE IF NOT EXISTS subscription_reminders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  days_left       INTEGER NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(subscription_id, days_left)
);

CREATE TABLE IF NOT EXISTS challenges (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined | completed
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS typing_texts (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  matn TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS typing_results (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode       TEXT NOT NULL DEFAULT 'mashq', -- mashq | 1v1 | dost
  wpm        INTEGER NOT NULL,
  accuracy   INTEGER NOT NULL,
  duration   INTEGER NOT NULL DEFAULT 60,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  key   TEXT NOT NULL UNIQUE,
  nom   TEXT NOT NULL,
  desc  TEXT NOT NULL,
  emoji TEXT NOT NULL,
  goal  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned         INTEGER NOT NULL DEFAULT 0,
  progress       INTEGER NOT NULL DEFAULT 0,
  earned_at      TEXT,
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS universities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT NOT NULL,
  shahar      TEXT NOT NULL DEFAULT '',
  turi        TEXT NOT NULL DEFAULT 'davlat', -- davlat | xususiy | xorijiy filial
  yonalishlar TEXT NOT NULL DEFAULT '',        -- vergul bilan ajratilgan yo'nalishlar
  vebsayt     TEXT,
  tavsif      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── EXAM PREP MODE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nom          TEXT NOT NULL,
  fan_id       INTEGER REFERENCES subjects(id),
  fan_nomi     TEXT NOT NULL,
  tavsif       TEXT,
  muddat       INTEGER NOT NULL DEFAULT 60,  -- minut
  savollar_soni INTEGER NOT NULL DEFAULT 10,
  difficulty   TEXT NOT NULL DEFAULT 'medium', -- easy | medium | hard
  creator_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id     INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  savol_matn  TEXT NOT NULL,
  savol_turi  TEXT NOT NULL DEFAULT 'single', -- single | multiple | text
  variantlar  TEXT NOT NULL,  -- JSON array
  togri_javob TEXT NOT NULL,  -- JSON (single: string, multiple: [strings], text: string)
  izoh        TEXT,
  ball        INTEGER NOT NULL DEFAULT 1,
  tartib      INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exam_results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id       INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  jami_ball     INTEGER NOT NULL DEFAULT 0,
  maksimal_ball INTEGER NOT NULL DEFAULT 100,
  foiz          INTEGER NOT NULL DEFAULT 0,
  vaqt_otkani   INTEGER NOT NULL DEFAULT 0,  -- sekund
  status        TEXT NOT NULL DEFAULT 'started', -- started | submitted | graded
  javoblar      TEXT NOT NULL,  -- JSON {question_id: user_answer}
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at  TEXT,
  UNIQUE(user_id, exam_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_child ON parent_children(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_link_requests_child ON parent_link_requests(child_id, status);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_child ON parent_notifications(child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id, status);
CREATE INDEX IF NOT EXISTS idx_typing_user ON typing_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_fan ON exams(fan_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_user ON typing_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_fan ON exams(fan_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON exam_results(user_id);
