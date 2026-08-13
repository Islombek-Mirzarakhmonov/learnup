# LearnUp Backend

Node.js + Express + SQLite (better-sqlite3) API server.

## Ishga tushirish

```bash
npm install
cp .env.example .env
npm run seed     # namuna ma'lumotlar (fanlar, yutuqlar, matnlar, 1 ta foydalanuvchi + do'stlar)
npm run dev       # yoki: npm start
```

Server: `http://localhost:4000`
Namuna hisob: `islom@mail.uz` / `password`

## .env

```
DATABASE_PATH=./data/learnup.db   # ixtiyoriy, standart shu
JWT_SECRET=...                    # productionda albatta o'zgartiring
PORT=4000
ANTHROPIC_API_KEY=...             # ixtiyoriy — AI Tekshiruv (/api/ai/check) uchun
```

`JWT_SECRET` majburiy va kamida 32 belgidan iborat bo'lishi kerak. Uni ishonchli tasodifiy qiymatga almashtiring; standart yoki qisqa kalit bilan server ishga tushmaydi.

## API Endpointlar

Barcha `/api/...` endpointlar (health'dan tashqari) `Authorization: Bearer <token>` talab qiladi.

### Auth
| Metod | Yo'l | Tavsif |
|---|---|---|
| POST | `/api/auth/register` | `{ ism, familiya, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET  | `/api/auth/me` | Joriy foydalanuvchi |
| POST | `/api/auth/setup` | `{ yosh, sinf, maktab, universitet, fanlar[] }` |

### Foydalanuvchi
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/api/users/me` | Profil |
| PUT | `/api/users/me` | Profil/sozlamalarni yangilash |

### Fanlar
| Metod | Yo'l |
|---|---|
| GET | `/api/subjects` |
| GET | `/api/subjects/:id` |

### Vazifalar
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/api/tasks?tur=bugungi\|kelgusi\|bajarilgan` | |
| POST | `/api/tasks` | `{ fan, nom, muddat?, sana?, xp?, muhim? }` |
| PATCH | `/api/tasks/:id` | qisman yangilash |
| PATCH | `/api/tasks/:id/complete` | bajarilgan deb belgilash (XP beriladi) |
| DELETE | `/api/tasks/:id` | |

### Kalendar
| Metod | Yo'l |
|---|---|
| GET | `/api/calendar?year=&month=` |
| POST | `/api/calendar` |
| DELETE | `/api/calendar/:id` |

### Do'stlar
| Metod | Yo'l |
|---|---|
| GET | `/api/friends` |
| GET | `/api/friends/search?q=` |
| POST | `/api/friends` |
| GET | `/api/friends/:id` |
| GET/POST | `/api/friends/:id/messages` |
| POST | `/api/friends/:id/challenge` |
| GET | `/api/friends/challenges/incoming` |

### Tez yozish
| Metod | Yo'l |
|---|---|
| GET | `/api/typing/texts` |
| POST | `/api/typing/results` |
| GET | `/api/typing/leaderboard` |
| GET | `/api/typing/history` |

### Yutuqlar / Reyting
| Metod | Yo'l |
|---|---|
| GET | `/api/achievements` |
| GET | `/api/leaderboard` |

### AI Tekshiruv
| Metod | Yo'l |
|---|---|
| POST | `/api/ai/check` | `multipart/form-data`, `image` fayli |

## Loyiha tuzilishi

```
src/
├── server.js            # Express server, route'lar shu yerda ulanadi
├── db/
│   ├── index.js          # better-sqlite3 ulanishi
│   ├── schema.sql         # jadval sxemasi
│   └── seed.js            # boshlang'ich ma'lumotlar
├── middleware/auth.js    # JWT tekshiruvi
├── utils/
│   ├── helpers.js         # serializer'lar, XP/daraja hisoblash
│   └── achievements.js    # yutuq progressini yangilash
└── routes/                # har bir bo'lim uchun alohida router
```
