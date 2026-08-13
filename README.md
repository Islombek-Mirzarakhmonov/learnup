# LearnUp — EdTech platforma (Frontend + Backend)

O'quvchilar uchun EdTech platforma: fanlar, uy vazifalari, kalendar, do'stlar,
tez yozish (typing) o'yini, mukofotlar/reyting, profil va sozlamalar.
Shuningdek: **AI Yordamchi** (O'zbekiston universitetlari bo'yicha maslahatchi)
va **Admin panel** (qabul komissiyasi uchun statistika + universitetlar bazasini boshqarish).

Loyiha ikki qismdan iborat:

```
learnup/
├── backend/    Node.js + Express + SQLite API server
└── frontend/   React + Vite frontend (Figma dizayni asosida)
```

Namuna hisoblar (seed orqali yaratiladi):
- **O'quvchi:** islom@mail.uz / password
- **Admin:** admin@learnup.uz / admin123

---

## ⚡️ Eng tezkor ishga tushirish (bitta server, production rejimi)

Frontend allaqachon build qilingan va `backend/public/` papkasiga joylashtirilgan.
Shunchaki backendni ishga tushirsangiz bo'ldi — u ham API, ham saytni beradi:

```bash
cd backend
npm install
npm run seed      # namuna ma'lumotlarni bazaga yuklaydi (bir marta yetarli)
npm start
```

Brauzerda oching: **http://localhost:4000**

---

## 🛠️ Development rejimi (frontend va backend alohida, hot-reload bilan)

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env      # kerak bo'lsa JWT_SECRET/PORT/ANTHROPIC_API_KEY ni sozlang
npm run seed
npm run dev                # yoki: npm start
```

Backend `http://localhost:4000` da ishga tushadi. Health-check: `GET /api/health`.

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL=http://localhost:4000/api
npm run dev
```

Frontend `http://localhost:5173` da ishga tushadi va so'rovlarni backendga yuboradi.

Frontendni qayta build qilib backendga joylashtirish uchun:

```bash
cd frontend && npm run build
rm -rf ../backend/public && cp -r dist ../backend/public
```

---

## 📡 Backend API haqida

To'liq hujjat: [`backend/README.md`](./backend/README.md)

Asosiy bo'limlar:
- **Auth** — ro'yxatdan o'tish, kirish, sessiya (JWT), setup wizard, foydalanuvchi rollari (student/admin)
- **Fanlar** — fanlar ro'yxati va foydalanuvchi progressi
- **Vazifalar** — CRUD, "bugungi/kelgusi/bajarilgan" filtri, bajarish (XP beriladi)
- **Kalendar** — hodisalarni qo'shish/ko'rish
- **Do'stlar** — qo'shish, qidirish, xabar yozish, challenge yuborish
- **Tez yozish** — natijalarni saqlash, reyting jadvali
- **Yutuqlar (Achievements)** va **Reyting jadvali (Leaderboard)**
- **AI Tekshiruv** — daftar rasmini yuklab, AI orqali tekshirish
- **AI Yordamchi** — O'zbekiston universitetlari, OTMga kirish va kasb tanlash bo'yicha chat-maslahatchi. Har bir javob boshqacha shakllantiriladi (ANTHROPIC_API_KEY bo'lsa — haqiqiy Claude javobi; bo'lmasa — bazadagi 46+ universitet asosida tasodifiy shablonlar bilan generatsiya qilingan javob)
- **Universitetlar** — O'zbekistondagi 46+ universitet (davlat, xususiy, xorijiy filial) haqida ma'lumotlar bazasi
- **Admin panel** — faqat `role: admin` foydalanuvchilar uchun: umumiy statistika (o'quvchilar soni, bajarilgan vazifalar, eng faol o'quvchilar) va universitetlar bazasini boshqarish (qo'shish/o'chirish)

## 🗄️ Baza haqida

SQLite (`better-sqlite3`) ishlatiladi — alohida server o'rnatish shart emas, `backend/data/learnup.db`
faylida saqlanadi. Productionga chiqarishda shu faylni backup qilib turish kifoya, yoki
kerak bo'lsa PostgreSQL/MySQL'ga o'tkazish uchun `src/db/schema.sql` asos qilib olinishi mumkin.

## 🔑 Admin va AI Yordamchi haqida

- Admin panelga kirish uchun `admin@learnup.uz / admin123` hisobidan foydalaning. Sidebar'da
  "Admin panel" bandi faqat `role: "admin"` bo'lgan foydalanuvchilarga ko'rinadi.
- AI Yordamchi barcha foydalanuvchilar uchun ochiq (sidebar'da "AI Yordamchi").
  Haqiqiy AI (Claude) javoblarini yoqish uchun `backend/.env` faylida
  `ANTHROPIC_API_KEY` ni sozlang. Kalitsiz holatda ham har safar boshqacha
  (tasodifiy shablon va tartibda) javob beradi — bitta qotib qolgan javob bermaydi.

