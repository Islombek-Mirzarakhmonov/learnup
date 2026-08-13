/**
 * Boshlang'ich ma'lumotlarni bazaga yuklaydi:
 * - Fanlar ro'yxati (frontenddagi fanlarData bilan bir xil)
 * - Tez yozish uchun matnlar (typingTexts bilan bir xil)
 * - Yutuqlar ro'yxati (achievements bilan bir xil)
 * - Namuna foydalanuvchi (islom@mail.uz / password) + uning vazifalari, do'stlari va h.k.
 *
 * Ishga tushirish: npm run seed
 */
const bcrypt = require("bcryptjs");
const db = require("./index");

const subjects = [
  { nom: "Matematika", emoji: "📐", rang: "#3B82F6" },
  { nom: "Fizika", emoji: "⚛️", rang: "#8B5CF6" },
  { nom: "Kimyo", emoji: "🧪", rang: "#EC4899" },
  { nom: "Biologiya", emoji: "🌿", rang: "#22C55E" },
  { nom: "Ingliz tili", emoji: "🌍", rang: "#0F766E" },
  { nom: "Ona tili", emoji: "📖", rang: "#F97316" },
  { nom: "Rus tili", emoji: "📝", rang: "#EF4444" },
  { nom: "Informatika", emoji: "💻", rang: "#06B6D4" },
  { nom: "Tarix", emoji: "🏛️", rang: "#D97706" },
  { nom: "Geografiya", emoji: "🗺️", rang: "#10B981" },
];

const typingTexts = [
  "O'zbekiston Respublikasi Markaziy Osiyodagi eng yirik davlatlardan biridir va boy tarixi bilan mashhurdir.",
  "Bilim va ilm insonning eng yaxshi do'sti hisoblanadi. Har kuni o'rganish kelajakni yorqin qiladi.",
  "Toshkent shahri O'zbekistonning poytaxti bo'lib aholisi jihatidan mintaqadagi eng yirik shaharlardan biridir.",
  "Matematika fani barcha tabiiy fanlarning poydevori sifatida juda muhim ahamiyatga ega hisoblanadi.",
];

const achievements = [
  { key: "birinchi-qadam", nom: "Birinchi qadam", desc: "Birinchi vazifani bajaring", emoji: "👶", goal: 1 },
  { key: "ketma-ket-7", nom: "Ketma-ket 7 kun", desc: "7 kun ketma-ket o'rganing", emoji: "🔥", goal: 7 },
  { key: "fan-mutaxassisi", nom: "Fan mutaxassisi", desc: "Bitta fanda 90%+ ga erishing", emoji: "🎓", goal: 90 },
  { key: "tez-yozuvchi", nom: "Tez yozuvchi", desc: "75 WPM ga erishing", emoji: "⌨️", goal: 75 },
  { key: "50-vazifa", nom: "50 vazifa", desc: "50 ta vazifa bajaring", emoji: "✅", goal: 50 },
  { key: "ustoz", nom: "Ustoz", desc: "Do'stingizga yordam bering", emoji: "👨‍🏫", goal: 1 },
  { key: "olimpiadachi", nom: "Olimpiadachi", desc: "Musobaqada top 10 ga kiring", emoji: "🏆", goal: 1 },
  { key: "ketma-ket-30", nom: "Ketma-ket 30 kun", desc: "30 kun ketma-ket o'rganing", emoji: "💎", goal: 30 },
  { key: "imtihon-ustosi", nom: "Imtihon ustosi", desc: "Imtihonda 90%+ ball ol", emoji: "🎯", goal: 1 },
];

// O'zbekistondagi universitetlar (davlat, xususiy va xorijiy filiallar) — kengaytirilishi mumkin
const universities = [
  { nom: "O'zbekiston Milliy universiteti (ToshDU/NUUz)", shahar: "Toshkent", turi: "davlat", yonalishlar: "Matematika, Fizika, Kimyo, Biologiya, IT, Jurnalistika, Huquq", vebsayt: "nuu.uz" },
  { nom: "Toshkent axborot texnologiyalari universiteti (TATU)", shahar: "Toshkent", turi: "davlat", yonalishlar: "Dasturiy injiniring, Kompyuter injiniringi, Kiberxavfsizlik, Telekommunikatsiya", vebsayt: "tuit.uz" },
  { nom: "Toshkent davlat texnika universiteti (TDTU)", shahar: "Toshkent", turi: "davlat", yonalishlar: "Muhandislik, Energetika, Neft-gaz, Mashinasozlik", vebsayt: "tdtu.uz" },
  { nom: "Toshkent davlat iqtisodiyot universiteti (TDIU)", shahar: "Toshkent", turi: "davlat", yonalishlar: "Iqtisodiyot, Menejment, Moliya, Marketing", vebsayt: "tsue.uz" },
  { nom: "Toshkent moliya instituti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Moliya, Bank ishi, Soliq va soliqqa tortish", vebsayt: "tfi.uz" },
  { nom: "Toshkent tibbiyot akademiyasi", shahar: "Toshkent", turi: "davlat", yonalishlar: "Davolash ishi, Pediatriya, Stomatologiya, Farmatsiya", vebsayt: "tma.uz" },
  { nom: "2-Toshkent davlat tibbiyot instituti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Davolash ishi, Pediatriya, Tibbiy profilaktika", vebsayt: "" },
  { nom: "Toshkent davlat pedagogika universiteti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Pedagogika, Boshlang'ich ta'lim, Maktabgacha ta'lim, Defektologiya", vebsayt: "tdpu.uz" },
  { nom: "O'zbekiston jahon tillari universiteti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Xorijiy tillar, Tarjimonlik, Xalqaro munosabatlar", vebsayt: "uzswlu.uz" },
  { nom: "Toshkent davlat yuridik universiteti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Huquqshunoslik, Xalqaro huquq, Sud-prokuratura", vebsayt: "tsul.uz" },
  { nom: "Toshkent davlat agrar universiteti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Agronomiya, Veterinariya, Qishloq xo'jaligi iqtisodiyoti", vebsayt: "" },
  { nom: "Toshkent temir yo'l muhandislari instituti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Transport muhandisligi, Logistika, Temir yo'l qurilishi", vebsayt: "tashiit.uz" },
  { nom: "Toshkent arxitektura-qurilish universiteti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Arxitektura, Qurilish muhandisligi, Dizayn", vebsayt: "tace.uz" },
  { nom: "O'zbekiston davlat jismoniy tarbiya va sport universiteti", shahar: "Chirchiq", turi: "davlat", yonalishlar: "Jismoniy tarbiya, Sport, Trenerlik ishi", vebsayt: "" },
  { nom: "Milliy rassomlik va dizayn instituti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Dizayn, Rassomlik, Amaliy san'at", vebsayt: "" },
  { nom: "Toshkent davlat stomatologiya instituti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Stomatologiya", vebsayt: "" },
  { nom: "INHA University in Tashkent", shahar: "Toshkent", turi: "xorijiy filial", yonalishlar: "Kompyuter fanlari, IT muhandisligi, Logistika", vebsayt: "inha.uz" },
  { nom: "Turin politexnika universiteti Toshkent filiali", shahar: "Toshkent", turi: "xorijiy filial", yonalishlar: "Mexanika, Elektronika, Energetika muhandisligi", vebsayt: "polito.uz" },
  { nom: "Vestminster xalqaro universiteti Toshkentda", shahar: "Toshkent", turi: "xorijiy filial", yonalishlar: "Biznes, IT, Ijtimoiy fanlar, Huquq", vebsayt: "wiut.uz" },
  { nom: "Singapur menejmentni rivojlantirish instituti (MDIS)", shahar: "Toshkent", turi: "xorijiy filial", yonalishlar: "Biznes boshqaruvi, IT, Moliya", vebsayt: "mdis.uz" },
  { nom: "Amity University Toshkent", shahar: "Toshkent", turi: "xorijiy filial", yonalishlar: "Biznes, IT, Muhandislik", vebsayt: "amity.uz" },
  { nom: "Webster University in Tashkent", shahar: "Toshkent", turi: "xorijiy filial", yonalishlar: "Biznes boshqaruvi, Xalqaro munosabatlar, Media", vebsayt: "webster.uz" },
  { nom: "Nordic International University", shahar: "Toshkent", turi: "xususiy", yonalishlar: "IT, Biznes, Huquq", vebsayt: "niu.uz" },
  { nom: "Samarqand davlat universiteti", shahar: "Samarqand", turi: "davlat", yonalishlar: "Filologiya, Tarix, Matematika, Biologiya, IT", vebsayt: "samdu.uz" },
  { nom: "Samarqand davlat tibbiyot universiteti", shahar: "Samarqand", turi: "davlat", yonalishlar: "Davolash ishi, Pediatriya, Stomatologiya", vebsayt: "samdti.uz" },
  { nom: "Samarqand davlat arxitektura-qurilish instituti", shahar: "Samarqand", turi: "davlat", yonalishlar: "Arxitektura, Qurilish", vebsayt: "" },
  { nom: "Buxoro davlat universiteti", shahar: "Buxoro", turi: "davlat", yonalishlar: "Filologiya, Pedagogika, Iqtisodiyot, IT", vebsayt: "buxdu.uz" },
  { nom: "Buxoro davlat tibbiyot instituti", shahar: "Buxoro", turi: "davlat", yonalishlar: "Davolash ishi, Pediatriya", vebsayt: "" },
  { nom: "Farg'ona davlat universiteti", shahar: "Farg'ona", turi: "davlat", yonalishlar: "Filologiya, Matematika, IT, Pedagogika", vebsayt: "fdu.uz" },
  { nom: "Farg'ona politexnika instituti", shahar: "Farg'ona", turi: "davlat", yonalishlar: "Muhandislik, Neft-gaz, To'qimachilik", vebsayt: "" },
  { nom: "Namangan davlat universiteti", shahar: "Namangan", turi: "davlat", yonalishlar: "Pedagogika, Filologiya, IT, Iqtisodiyot", vebsayt: "namdu.uz" },
  { nom: "Namangan muhandislik-texnologiya instituti", shahar: "Namangan", turi: "davlat", yonalishlar: "To'qimachilik texnologiyasi, Muhandislik", vebsayt: "" },
  { nom: "Andijon davlat universiteti", shahar: "Andijon", turi: "davlat", yonalishlar: "Filologiya, Pedagogika, IT, Tabiiy fanlar", vebsayt: "adu.uz" },
  { nom: "Andijon davlat tibbiyot instituti", shahar: "Andijon", turi: "davlat", yonalishlar: "Davolash ishi, Pediatriya", vebsayt: "andmi.uz" },
  { nom: "Qarshi davlat universiteti", shahar: "Qarshi", turi: "davlat", yonalishlar: "Pedagogika, Filologiya, Agronomiya, IT", vebsayt: "qarshidu.uz" },
  { nom: "Termiz davlat universiteti", shahar: "Termiz", turi: "davlat", yonalishlar: "Pedagogika, Filologiya, Tabiiy fanlar", vebsayt: "tersu.uz" },
  { nom: "Urganch davlat universiteti", shahar: "Urganch", turi: "davlat", yonalishlar: "Pedagogika, Filologiya, IT, Iqtisodiyot", vebsayt: "urdu.uz" },
  { nom: "Guliston davlat universiteti", shahar: "Guliston", turi: "davlat", yonalishlar: "Pedagogika, Iqtisodiyot, Agronomiya", vebsayt: "gsu.uz" },
  { nom: "Jizzax davlat pedagogika universiteti", shahar: "Jizzax", turi: "davlat", yonalishlar: "Pedagogika, Filologiya, Matematika", vebsayt: "jspi.uz" },
  { nom: "Qo'qon davlat pedagogika instituti", shahar: "Qo'qon", turi: "davlat", yonalishlar: "Pedagogika, Boshlang'ich ta'lim", vebsayt: "" },
  { nom: "Nukus davlat pedagogika instituti", shahar: "Nukus", turi: "davlat", yonalishlar: "Pedagogika, Filologiya", vebsayt: "" },
  { nom: "Qoraqalpoq davlat universiteti", shahar: "Nukus", turi: "davlat", yonalishlar: "Filologiya, Tabiiy fanlar, IT, Iqtisodiyot", vebsayt: "qarsu.uz" },
  { nom: "Sirdaryo viloyati pedagogika instituti", shahar: "Guliston", turi: "davlat", yonalishlar: "Pedagogika", vebsayt: "" },
  { nom: "Toshkent kimyo-texnologiya instituti", shahar: "Toshkent", turi: "davlat", yonalishlar: "Kimyo texnologiyasi, Neft-kimyo, Ekologiya", vebsayt: "tkti.uz" },
  { nom: "Toshkent to'qimachilik va yengil sanoat instituti", shahar: "Toshkent", turi: "davlat", yonalishlar: "To'qimachilik texnologiyasi, Dizayn", vebsayt: "" },
  { nom: "Xalqaro Vestminster va Amerika universitetlari qoshidagi IT Park Tech School", shahar: "Toshkent", turi: "xususiy", yonalishlar: "Dasturlash, IT xavfsizlik", vebsayt: "" },
];

function upsertSubject(s) {
  db.prepare(
    `INSERT INTO subjects (nom, emoji, rang) VALUES (@nom, @emoji, @rang)
     ON CONFLICT(nom) DO UPDATE SET emoji=excluded.emoji, rang=excluded.rang`
  ).run(s);
}

function upsertAchievement(a) {
  db.prepare(
    `INSERT INTO achievements (key, nom, desc, emoji, goal) VALUES (@key, @nom, @desc, @emoji, @goal)
     ON CONFLICT(key) DO UPDATE SET nom=excluded.nom, desc=excluded.desc, emoji=excluded.emoji, goal=excluded.goal`
  ).run(a);
}

function insertUniversityIfMissing(u) {
  const existing = db.prepare("SELECT id FROM universities WHERE nom = ?").get(u.nom);
  if (!existing) {
    db.prepare(
      `INSERT INTO universities (nom, shahar, turi, yonalishlar, vebsayt) VALUES (@nom, @shahar, @turi, @yonalishlar, @vebsayt)`
    ).run(u);
  }
}

function run() {
  const seedAll = db.transaction(() => {
    subjects.forEach(upsertSubject);
    achievements.forEach(upsertAchievement);
    universities.forEach(insertUniversityIfMissing);

    // Admin (qabul komissiyasi) hisobi
    const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@learnup.uz");
    if (!existingAdmin) {
      const adminHash = bcrypt.hashSync("admin123", 10);
      db.prepare(
        `INSERT INTO users (ism, familiya, email, password_hash, role, setup_done)
         VALUES ('Admin', 'LearnUp', 'admin@learnup.uz', ?, 'admin', 1)`
      ).run(adminHash);
    }

    const textCount = db.prepare("SELECT COUNT(*) c FROM typing_texts").get().c;
    if (textCount === 0) {
      const insertText = db.prepare("INSERT INTO typing_texts (matn) VALUES (?)");
      typingTexts.forEach((t) => insertText.run(t));
    }

    // Namuna foydalanuvchi (frontend LoginPage default: islom@mail.uz / password)
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get("islom@mail.uz");
    let userId;
    if (!existing) {
      const passwordHash = bcrypt.hashSync("password", 10);
      const info = db
        .prepare(
          `INSERT INTO users
            (ism, familiya, email, password_hash, sinf, maktab, universitet, yosh,
             daraja, xp, xp_max, coin, ketma_ket, umumiy_xp, umumiy_vazifalar, rating, setup_done)
           VALUES (@ism, @familiya, @email, @password_hash, @sinf, @maktab, @universitet, @yosh,
                   @daraja, @xp, @xp_max, @coin, @ketma_ket, @umumiy_xp, @umumiy_vazifalar, @rating, 1)`
        )
        .run({
          ism: "Islom",
          familiya: "Toshmatov",
          email: "islom@mail.uz",
          password_hash: passwordHash,
          sinf: "11-A sinf",
          maktab: "1-sonli akademik litsey, Toshkent",
          universitet: "INHA University Tashkent",
          yosh: 17,
          daraja: 12,
          xp: 4500,
          xp_max: 5000,
          coin: 230,
          ketma_ket: 15,
          umumiy_xp: 14500,
          umumiy_vazifalar: 87,
          rating: 3,
        });
      userId = info.lastInsertRowid;
    } else {
      userId = existing.id;
    }

    // Foydalanuvchi fanlari + progress
    const userSubjects = [
      { nom: "Matematika", foiz: 72, baho: 4, xp: 450 },
      { nom: "Fizika", foiz: 65, baho: 4, xp: 380 },
      { nom: "Kimyo", foiz: 58, baho: 3, xp: 290 },
      { nom: "Biologiya", foiz: 81, baho: 5, xp: 520 },
      { nom: "Ingliz tili", foiz: 90, baho: 5, xp: 680 },
      { nom: "Ona tili", foiz: 88, baho: 5, xp: 610 },
      { nom: "Rus tili", foiz: 72, baho: 4, xp: 420 },
      { nom: "Informatika", foiz: 68, baho: 4, xp: 390 },
      { nom: "Tarix", foiz: 75, baho: 4, xp: 440 },
      { nom: "Geografiya", foiz: 80, baho: 4, xp: 480 },
    ];
    const getSubjectId = db.prepare("SELECT id FROM subjects WHERE nom = ?");
    const upsertUserSubject = db.prepare(
      `INSERT INTO user_subjects (user_id, subject_id, foiz, baho, xp)
       VALUES (@user_id, @subject_id, @foiz, @baho, @xp)
       ON CONFLICT(user_id, subject_id) DO UPDATE SET foiz=excluded.foiz, baho=excluded.baho, xp=excluded.xp`
    );
    userSubjects.forEach((us) => {
      const subj = getSubjectId.get(us.nom);
      if (subj) upsertUserSubject.run({ user_id: userId, subject_id: subj.id, foiz: us.foiz, baho: us.baho, xp: us.xp });
    });

    // Namuna vazifalar
    const taskCount = db.prepare("SELECT COUNT(*) c FROM tasks WHERE user_id = ?").get(userId).c;
    if (taskCount === 0) {
      const insertTask = db.prepare(
        `INSERT INTO tasks (user_id, subject_id, fan_nomi, nom, sana_matni, holat, xp, muhim, muddat)
         VALUES (@user_id, @subject_id, @fan_nomi, @nom, @sana_matni, @holat, @xp, @muhim, @muddat)`
      );
      const today = new Date();
      const iso = (d) => d.toISOString();
      const sampleTasks = [
        { fan: "Matematika", nom: "Kvadrat tenglamalar §14–15", sana_matni: "Bugun, 23:59", holat: "bajarilmagan", xp: 50, muhim: 1, muddat: iso(today) },
        { fan: "Fizika", nom: "Optika – nazorat savollari", sana_matni: "Bugun, 18:00", holat: "jarayonda", xp: 40, muhim: 0, muddat: iso(today) },
        { fan: "Ingliz tili", nom: "Reading: Unit 7 exercises", sana_matni: "Ertaga, 09:00", holat: "bajarilmagan", xp: 30, muhim: 0, muddat: iso(new Date(today.getTime() + 86400000)) },
        { fan: "Kimyo", nom: "Laboratoriya ishi #5 hisoboti", sana_matni: "Ertaga, 13:00", holat: "bajarilmagan", xp: 60, muhim: 1, muddat: iso(new Date(today.getTime() + 86400000)) },
        { fan: "Biologiya", nom: "Hujayra tuzilishi – referat", sana_matni: "3 kun, 12:00", holat: "bajarilmagan", xp: 70, muhim: 0, muddat: iso(new Date(today.getTime() + 3 * 86400000)) },
        { fan: "Matematika", nom: "Logarifm §10–11", sana_matni: "Kecha", holat: "bajarilgan", xp: 50, muhim: 0, muddat: iso(new Date(today.getTime() - 86400000)) },
        { fan: "Ingliz tili", nom: "Grammar: Present Perfect", sana_matni: "2 kun oldin", holat: "bajarilgan", xp: 30, muhim: 0, muddat: iso(new Date(today.getTime() - 2 * 86400000)) },
        { fan: "Ona tili", nom: "Insho: Vatanim O'zbekiston", sana_matni: "3 kun oldin", holat: "bajarilgan", xp: 45, muhim: 0, muddat: iso(new Date(today.getTime() - 3 * 86400000)) },
      ];
      sampleTasks.forEach((t) => {
        const subj = getSubjectId.get(t.fan);
        insertTask.run({
          user_id: userId,
          subject_id: subj ? subj.id : null,
          fan_nomi: t.fan,
          nom: t.nom,
          sana_matni: t.sana_matni,
          holat: t.holat,
          xp: t.xp,
          muhim: t.muhim,
          muddat: t.muddat,
        });
      });
    }

    // Namuna do'stlar (alohida foydalanuvchilar sifatida yaratiladi)
    const sampleFriends = [
      { ism: "Aziz", familiya: "Karimov", email: "aziz@mail.uz", sinf: "11-B", daraja: 13, xp: 5200, umumiy_xp: 5200 },
      { ism: "Sarvinoz", familiya: "Yusupova", email: "sarvinoz@mail.uz", sinf: "11-A", daraja: 12, xp: 4800, umumiy_xp: 4800 },
      { ism: "Bobur", familiya: "Xoliqov", email: "bobur@mail.uz", sinf: "10-A", daraja: 10, xp: 3600, umumiy_xp: 3600 },
      { ism: "Malika", familiya: "Rahimova", email: "malika@mail.uz", sinf: "11-C", daraja: 14, xp: 6100, umumiy_xp: 6100 },
      { ism: "Sherzod", familiya: "Tursunov", email: "sherzod@mail.uz", sinf: "12-A", daraja: 16, xp: 7300, umumiy_xp: 7300 },
    ];
    const getUserByEmail = db.prepare("SELECT id FROM users WHERE email = ?");
    const insertFriendUser = db.prepare(
      `INSERT INTO users (ism, familiya, email, password_hash, sinf, daraja, xp, xp_max, umumiy_xp, setup_done)
       VALUES (@ism, @familiya, @email, @password_hash, @sinf, @daraja, @xp, 10000, @umumiy_xp, 1)`
    );
    const insertFriendship = db.prepare(
      `INSERT OR IGNORE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')`
    );
    const dummyHash = bcrypt.hashSync("password", 10);
    sampleFriends.forEach((f) => {
      let friendUser = getUserByEmail.get(f.email);
      let friendId;
      if (!friendUser) {
        const info = insertFriendUser.run({ ...f, password_hash: dummyHash });
        friendId = info.lastInsertRowid;
      } else {
        friendId = friendUser.id;
      }
      insertFriendship.run(userId, friendId);
      insertFriendship.run(friendId, userId);
    });

    // Namuna imtihonlar
    const getExamCount = db.prepare("SELECT COUNT(*) c FROM exams WHERE creator_id = ?").get(userId);
    if (getExamCount.c === 0) {
      const insertExam = db.prepare(
        `INSERT INTO exams (nom, fan_id, fan_nomi, tavsif, muddat, difficulty, creator_id, is_public, savollar_soni)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insertQuestion = db.prepare(
        `INSERT INTO exam_questions (exam_id, savol_matn, savol_turi, variantlar, togri_javob, izoh, ball, tartib)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const sampleExams = [
        {
          nom: "Matematika - Kvadrat tenglamalar",
          fan_nomi: "Matematika",
          fan_id: 1,
          tavsif: "Kvadrat tenglamalarni yechish bo'yicha test",
          muddat: 45,
          difficulty: "medium",
          is_public: 1,
          questions: [
            {
              savol_matn: "x² - 5x + 6 = 0 tenglamaning yechimi nima?",
              savol_turi: "multiple",
              variantlar: JSON.stringify(["x = 2, x = 3", "x = 1, x = 6", "x = -2, x = -3", "x = 0, x = 5"]),
              togri_javob: JSON.stringify(["x = 2, x = 3"]),
              izoh: "Diskriminant D = 25 - 24 = 1, shuning uchun x = (5±1)/2",
              ball: 2,
            },
            {
              savol_matn: "2x² + 3x - 2 = 0 tenglamada a koeffitsienti nima?",
              savol_turi: "single",
              variantlar: JSON.stringify(["2", "3", "-2", "0"]),
              togri_javob: JSON.stringify("2"),
              izoh: "ax² + bx + c shaklida a = 2",
              ball: 1,
            },
          ],
        },
        {
          nom: "Fizika - Mexanika asoslari",
          fan_nomi: "Fizika",
          fan_id: 2,
          tavsif: "Mexanika bo'limi bo'yicha test",
          muddat: 60,
          difficulty: "hard",
          is_public: 1,
          questions: [
            {
              savol_matn: "Jismning tezligi 10 m/s dan 20 m/s ga 5 sekundda o'zgarsa, uning tezlanishi nima?",
              savol_turi: "text",
              variantlar: JSON.stringify(["2 m/s²"]),
              togri_javob: JSON.stringify("2 m/s²"),
              izoh: "a = (v - v₀) / t = (20 - 10) / 5 = 2 m/s²",
              ball: 3,
            },
          ],
        },
      ];

      sampleExams.forEach((exam) => {
        const examInfo = insertExam.run(
          exam.nom,
          exam.fan_id,
          exam.fan_nomi,
          exam.tavsif,
          exam.muddat,
          exam.difficulty,
          userId,
          exam.is_public,
          exam.questions.length
        );
        const examId = examInfo.lastInsertRowid;

        exam.questions.forEach((q, idx) => {
          insertQuestion.run(
            examId,
            q.savol_matn,
            q.savol_turi,
            q.variantlar,
            q.togri_javob,
            q.izoh,
            q.ball,
            idx + 1
          );
        });
      });
    }
  });

  seedAll();
  console.log("✅ Seed muvaffaqiyatli yakunlandi.");
  console.log("   Namuna o'quvchi hisobi: islom@mail.uz / password");
  console.log("   Admin hisobi: admin@learnup.uz / admin123");
}

run();
