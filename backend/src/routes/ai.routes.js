const express = require("express");
const multer = require("multer");
const path = require("path");
const { requireAuth } = require("../middleware/auth");
const db = require("../db");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "uploads"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});

function getConfiguredAiProvider() {
  return (process.env.AI_PROVIDER || "anthropic").toLowerCase();
}

function getAiApiKey(provider) {
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY;
  return process.env.ANTHROPIC_API_KEY;
}

function parseAiJsonResponse(rawText) {
  const text = String(rawText || "").replace(/```json|```/gi, "").trim();
  if (!text) return { baho: null, izoh: "AI javob bo'sh qaytdi", xatoliklar: [] };

  try {
    const parsed = JSON.parse(text);
    return { baho: parsed.baho ?? null, izoh: parsed.izoh || "", xatoliklar: parsed.xatoliklar || [] };
  } catch {
    return { baho: null, izoh: text, xatoliklar: [] };
  }
}

async function askAnthropicForHomeworkCheck(imageBase64, mediaType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            {
              type: "text",
              text:
                "Bu o'quvchining daftar sahifasi. Bajarilgan uy vazifasini tekshirib, 2-5 baho qo'y va topilgan xatoliklarni o'zbek tilida ro'yxat qilib ber. Faqat JSON qaytar: {\"baho\": number, \"izoh\": string, \"xatoliklar\": string[]}",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic javobi: ${response.status}`);
  const data = await response.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  return parseAiJsonResponse(text);
}

async function askDeepSeekForHomeworkCheck(imageBase64, mediaType) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Bu o'quvchining daftar sahifasi. Bajarilgan uy vazifasini tekshirib, 2-5 baho qo'y va topilgan xatoliklarni o'zbek tilida ro'yxat qilib ber. Faqat JSON formatda qaytar: {\"baho\": number, \"izoh\": string, \"xatoliklar\": string[]}",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) throw new Error(`DeepSeek javobi: ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseAiJsonResponse(text);
}

// POST /api/ai/check — AIModal: daftar rasmini yuklab, "AI tekshiruvi" natijasini oladi.
// AI_PROVIDER .env da "anthropic" yoki "deepseek" bo'lishi mumkin.
// Agar kalit yo'q bo'lsa, demo/mock natija qaytariladi (frontendni to'xtatmasdan sinash uchun).
router.post("/check", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Rasm fayli (image) yuborilishi kerak" });

  const provider = getConfiguredAiProvider();
  const apiKey = getAiApiKey(provider);
  if (!apiKey) {
    require("fs").unlink(req.file.path, () => {});
    return res.json({
      mock: true,
      baho: 4,
      izoh:
        "Bu demo natija (AI API kaliti sozlanmagan). Haqiqiy AI tahlili uchun .env faylga AI_PROVIDER va API kalitni qo'shing.",
      xatoliklar: ["2-masalada ishorani tekshiring", "4-mashqda birlik yozilmagan"],
    });
  }

  try {
    const fs = require("fs");
    const imageBase64 = fs.readFileSync(req.file.path, { encoding: "base64" });
    const mediaType = req.file.mimetype || "image/jpeg";

    let parsed;
    if (provider === "deepseek") {
      parsed = await askDeepSeekForHomeworkCheck(imageBase64, mediaType);
    } else {
      parsed = await askAnthropicForHomeworkCheck(imageBase64, mediaType);
    }

    fs.unlink(req.file.path, () => {});
    res.json({ mock: false, provider, ...parsed });
  } catch (err) {
    console.error("AI check error:", err);
    if (req.file?.path) require("fs").unlink(req.file.path, () => {});
    res.status(502).json({ error: "AI xizmati bilan bog'lanishda xatolik yuz berdi" });
  }
});

module.exports = router;

// ─── AI Yordamchi: O'zbekiston universitetlari bo'yicha maslahat chati ───────
// POST /api/ai/chat  { message, history?: {role,text}[] }
// ANTHROPIC_API_KEY mavjud bo'lsa — haqiqiy Claude javob beradi (har safar boshqacha,
// chunki modelning o'zi tabiiy ravishda turlicha javob shakllantiradi).
// Aks holda — bazadagi universitetlar asosida, TURLI shablonlardan tasodifiy
// tanlab, har safar boshqacha ko'rinishdagi javob generatsiya qilinadi.
router.post("/chat", requireAuth, async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "message majburiy" });
  }

  const universities = db.prepare("SELECT * FROM universities ORDER BY nom").all();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const uniContext = universities
        .map((u) => `- ${u.nom} (${u.shahar}, ${u.turi}) — yo'nalishlar: ${u.yonalishlar}${u.vebsayt ? `, sayt: ${u.vebsayt}` : ""}`)
        .join("\n");

      const systemPrompt =
        `Sen LearnUp platformasidagi "AI Yordamchi" — o'zbek maktab o'quvchilariga OTMga (oliy ta'lim muassasasiga) ` +
        `kirish, kasb tanlash va O'zbekistondagi universitetlar haqida maslahat beruvchi yordamchisan. ` +
        `Faqat o'zbek tilida, samimiy va qisqa-lo'nda javob ber. Har safar javobni boshqacha so'zlar va tuzilish bilan yoz — ` +
        `bir xil qolipni takrorlama. Quyida bazadagi universitetlar ro'yxati (foydalanuvchi so'rasa shulardan foydalan, ` +
        `lekin bilimingdan boshqa universitetlar haqida ham gapirishing mumkin):\n${uniContext}`;

      const messages = [
        ...(Array.isArray(history) ? history.slice(-8).map((h) => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.text })) : []),
        { role: "user", content: message },
      ];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          temperature: 1,
          system: systemPrompt,
          messages,
        }),
      });

      const data = await response.json();
      const text = (data.content || []).map((b) => b.text || "").join("\n").trim();
      if (!text) throw new Error("Bo'sh javob");
      return res.json({ reply: text, mock: false });
    } catch (err) {
      console.error("AI chat error:", err);
      // Xatolik bo'lsa pastdagi fallback generatorga o'tamiz
    }
  }

  return res.json({ reply: generateFallbackReply(message, universities), mock: true });
});

// ─── Fallback javob generatori (API kalitsiz ham har safar boshqacha javob) ──

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFallbackReply(message, universities) {
  const q = message.toLowerCase();

  // Xabar matnidan shaharni aniqlashga harakat qilamiz
  const shaharlar = [...new Set(universities.map((u) => u.shahar).filter(Boolean))];
  const matchedShahar = shaharlar.find((s) => q.includes(s.toLowerCase()));

  // Xabar matnidan yo'nalishni aniqlashga harakat qilamiz (soddalashtirilgan)
  const yonalishKalitlari = ["it", "dasturlash", "kompyuter", "tibbiyot", "shifokor", "iqtisod", "huquq", "pedagogika", "muhandis", "til", "biznes"];
  const matchedYonalish = yonalishKalitlari.find((k) => q.includes(k));

  let candidates = universities;
  if (matchedShahar) candidates = candidates.filter((u) => u.shahar === matchedShahar);
  if (matchedYonalish) {
    const byField = candidates.filter((u) => u.yonalishlar.toLowerCase().includes(matchedYonalish));
    if (byField.length) candidates = byField;
  }
  if (candidates.length === 0) candidates = universities;

  // Tasodifiy 3-4 tasini tanlaymiz va tartibini aralashtiramiz
  const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, Math.min(4, candidates.length));

  const intros = [
    "Albatta, yordam beraman!",
    "Yaxshi savol — keling, ko'rib chiqamiz.",
    "Mana sizga bir nechta tavsiya:",
    "Bu borada bazamdagi ma'lumotlar asosida aytishim mumkin:",
    "Keling, mos variantlarni birga ko'rib chiqamiz.",
  ];
  const outros = [
    "Agar aniqroq yo'nalish yoki shahar aytsangiz, tavsiyalarni yanada aniqlashtirib beraman.",
    "Ko'proq ma'lumot kerak bo'lsa, so'rang — batafsilroq aytib beraman.",
    "Har bir universitet haqida ko'proq bilmoqchi bo'lsangiz, nomini yozing.",
    "Qabul talablari yildan-yilga o'zgarishi mumkin, shuning uchun rasmiy saytdan ham tekshirib turing.",
  ];

  const lines = shuffled.map((u, i) => {
    const templates = [
      `${i + 1}. **${u.nom}** (${u.shahar}) — ${u.yonalishlar}.`,
      `${i + 1}. **${u.nom}**, ${u.shahar} shahrida joylashgan. Asosiy yo'nalishlar: ${u.yonalishlar}.`,
      `${i + 1}. **${u.nom}** — ${u.turi} ta'lim muassasasi (${u.shahar}). Yo'nalishlari: ${u.yonalishlar}.`,
    ];
    return pick(templates) + (u.vebsayt ? ` Sayt: ${u.vebsayt}` : "");
  });

  return `${pick(intros)}\n\n${lines.join("\n")}\n\n${pick(outros)}`;
}
