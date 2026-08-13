import React, { useState, useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import InteractiveModal from "./components/InteractiveModal";
import FriendProfileModal from "./components/FriendProfileModal";
import FriendMessageModal from "./components/FriendMessageModal";
import FriendChallengeModal from "./components/FriendChallengeModal";
import { ExamPrepPage } from "./components/ExamPrepPage";
import { ParentDashboard } from "./components/ParentDashboard";
import { api, getToken, setToken, ApiError } from "./lib/api";
import { LearnUpProvider, useLearnUp } from "./context/LearnUpContext";
import type { SubjectVM, TaskVM, FriendVM } from "./context/LearnUpContext";
import {
  Home, BookOpen, FileText, Calendar, Users, Keyboard, Trophy,
  User, Settings, Bell, Search, Star, Zap, ChevronRight,
  Check, Plus, Clock, Target, Menu, LogOut, Eye, EyeOff,
  Lock, Mail, X, GraduationCap, Building2, CheckCircle2,
  AlertCircle, Sparkles, ChevronLeft, RefreshCw, Camera,
  Edit, Brain,
  Crown, CreditCard, ShieldCheck,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Screen =
  | "home" | "fanlar" | "vazifalar" | "kalendar" | "dostlar"
  | "tez-yozish" | "mukofotlar" | "profil" | "sozlamalar"
  | "ai-yordamchi" | "imtihon-tayyorligi" | "parent-dashboard" | "admin" | "obuna";

type AuthState = "login" | "register" | "setup" | "app";

// ─── Static Data ───────────────────────────────────────────────────────────

const initialUserData = {
  ism: "Islom",
  familiya: "Toshmatov",
  email: "islom@mail.uz",
  sinf: "11-A sinf",
  maktab: "1-sonli akademik litsey, Toshkent",
  universitet: "INHA University Tashkent",
  daraja: 12,
  xp: 4500,
  xpMax: 5000,
  coin: 230,
  ketmaKet: 15,
  umumiyXP: 14500,
  umumiyVazifalar: 87,
  rating: 3,
  yosh: 17,
  fanlar: ["Matematika", "Fizika", "Ingliz tili", "Informatika"],
  notif: true,
  dark: false,
  role: "student" as "student" | "parent" | "teacher" | "admin",
};

type UserData = typeof initialUserData;

function loadSavedUser(): UserData {
  try {
    const raw = localStorage.getItem("learnup.user");
    if (!raw) return initialUserData;
    return { ...initialUserData, ...JSON.parse(raw) } as UserData;
  } catch (e) {
    return initialUserData;
  }
}

// Eslatma: fanlar/vazifalar/do'stlar/tez-yozish matnlari endi backenddan
// LearnUpContext orqali olinadi (bu yerdagi statik massivlar olib tashlandi).

const navItems: { id: Screen; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home",       label: "Bosh sahifa",   icon: Home     },
  { id: "fanlar",     label: "Fanlar",        icon: BookOpen },
  { id: "vazifalar",  label: "Uy vazifalari", icon: FileText },
  { id: "kalendar",   label: "Kalendar",      icon: Calendar },
  { id: "dostlar",    label: "Do'stlar",      icon: Users    },
  { id: "tez-yozish", label: "Tez yozish",    icon: Keyboard },
  { id: "mukofotlar", label: "Mukofotlar",    icon: Trophy   },
  { id: "imtihon-tayyorligi", label: "Imtihon tayyorlanish", icon: Target },
  { id: "ai-yordamchi", label: "AI Yordamchi", icon: Brain   },
  { id: "obuna",      label: "Pro obuna",    icon: Crown   },
  { id: "parent-dashboard", label: "Ota-onalar paneli", icon: Users },
  { id: "profil",     label: "Profil",        icon: User     },
  { id: "sozlamalar", label: "Sozlamalar",    icon: Settings },
];

// Faqat admin (qabul komissiyasi) foydalanuvchilariga ko'rinadigan qo'shimcha bo'lim
const adminNavItem: { id: Screen; label: string; icon: React.ComponentType<{ className?: string }> } =
  { id: "admin", label: "Admin panel", icon: GraduationCap };

// ─── Utility Components ─────────────────────────────────────────────────────

function ProgressBar({ value, max = 100, color = "#0F766E", height = 8 }: {
  value: number; max?: number; color?: string; height?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full rounded-full overflow-hidden bg-gray-100" style={{ height }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function Chip({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "danger" | "teal" | "orange" }) {
  const styles: Record<string, string> = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-green-100 text-green-700",
    warning: "bg-orange-100 text-orange-700",
    danger:  "bg-red-100 text-red-600",
    teal:    "bg-teal-50 text-teal-700 border border-teal-200",
    orange:  "bg-orange-50 text-orange-700 border border-orange-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

function BrandLogo({ className = "", size = 40, showText = true }: {
  className?: string; size?: number; showText?: boolean;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {!imageError ? (
        <img
          src="/logo.png"
          alt="LearnUp logo"
          className="object-contain"
          style={{ width: size, height: size }}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className="rounded-xl bg-teal-600 flex items-center justify-center shadow-sm"
          style={{ width: size, height: size }}
        >
          <Zap className="text-white" style={{ width: Math.max(16, size * 0.5), height: Math.max(16, size * 0.5) }} />
        </div>
      )}
      {showText && (
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900 leading-none">LearnUp</p>
          <p className="text-xs text-gray-400 mt-0.5">O'rgan. Rivojlan.</p>
        </div>
      )}
    </div>
  );
}

// ─── Login ──────────────────────────────────────────────────────────────────

function LoginPage({ onLogin, onRegister }: { onLogin: (user: UserData) => void; onRegister: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("islom@mail.uz");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Email va parolni kiriting");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token, user } = await api.login({ email, password });
      setToken(token);
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <BrandLogo showText={false} size={56} />
          </div>
          <h1 className="text-3xl font-bold text-white">LearnUp</h1>
          <p className="text-teal-200 mt-1 text-sm">O'rgan. Rivojlan. Muvaffaqiyatga erish.</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Xush kelibsiz! 👋</h2>
          <p className="text-gray-400 text-sm mb-7">Hisobingizga kiring</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Elektron pochta</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  placeholder="misol@email.uz"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Parol</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  placeholder="Parolingizni kiriting"
                />
                <button
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer select-none">
                <input type="checkbox" className="rounded accent-teal-600" />
                Eslab qolish
              </label>
              <button className="text-teal-600 hover:text-teal-700 font-semibold">Parolni unutdim?</button>
            </div>

            {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
            >
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-400">
            Hisobingiz yo'qmi?{" "}
            <button onClick={onRegister} className="text-teal-600 font-bold hover:text-teal-700">
              Ro'yxatdan o'ting
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Register ───────────────────────────────────────────────────────────────

function RegisterPage({ onRegister, onLogin }: { onRegister: (user: UserData) => void; onLogin: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "parent">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Ism, email va parolni to'ldiring");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token, user } = await api.register({ ism: name, familiya: surname, email, password, role });
      setToken(token);
      onRegister(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ro'yxatdan o'tishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-500 to-orange-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">LearnUp</h1>
          <p className="text-orange-200 mt-1 text-sm">Yangi hisob yarating</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Ro'yxatdan o'ting</h2>
          <p className="text-gray-400 text-sm mb-7">Bepul hisob oching</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ism</label>
                <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white" placeholder="Ismingiz" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Familiya</label>
                <input value={surname} onChange={(e) => setSurname(e.target.value)} type="text" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white" placeholder="Familiyangiz" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hisob turi</label>
              <div className="grid grid-cols-2 gap-2">
                {([ ["student", "O'quvchi"], ["parent", "Ota-ona"] ] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setRole(value)} className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${role === value ? "border-orange-500 bg-orange-50 text-orange-600" : "border-gray-200 text-gray-500 hover:border-orange-200"}`}>{label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Elektron pochta</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white" placeholder="misol@email.uz" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Parol</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPw ? "text" : "password"} className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 focus:bg-white" placeholder="Kuchli parol kiriting" />
                <button onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-500 font-semibold">{error}</p>}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
            >
              {loading ? "Yuklanmoqda..." : "Ro'yxatdan o'tish"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-400">
            Hisobingiz bormi?{" "}
            <button onClick={onLogin} className="text-orange-500 font-bold hover:text-orange-600">Kirish</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Wizard ────────────────────────────────────────────────────────────

function SetupWizard({ onComplete }: { onComplete: (user: UserData) => void }) {
  const [step, setStep] = useState(1);
  const [yosh, setYosh] = useState("17");
  const [sinf, setSinf] = useState("11");
  const [maktab, setMaktab] = useState("");
  const [selectedFanlar, setSelectedFanlar] = useState<string[]>(["Matematika", "Fizika", "Ingliz tili"]);
  const [universitet, setUniversitet] = useState("INHA University Tashkent");
  const [saving, setSaving] = useState(false);

  const fanlarList = ["Matematika", "Fizika", "Kimyo", "Biologiya", "Ingliz tili", "Ona tili", "Rus tili", "Informatika", "Tarix", "Geografiya"];
  const universitetlar = [
    "INHA University Tashkent", "Westminster International University",
    "Turin Polytechnic University", "Management Development Institute",
    "TATU (Axborot Texnologiyalari)",  "O'zbekiston Milliy Universiteti",
    "Toshkent Davlat Texnika Universiteti", "Boshqa",
  ];

  const toggle = (fan: string) =>
    setSelectedFanlar(p => p.includes(fan) ? p.filter(f => f !== fan) : [...p, fan]);

  const recommended = [
    ...selectedFanlar,
    ...fanlarList.filter(f => !selectedFanlar.includes(f)).slice(0, Math.max(0, 5 - selectedFanlar.length)),
  ].slice(0, 6);

  const stepLabels = ["Yosh & Sinf", "Maktab", "Fanlar", "Universitet"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <BrandLogo size={36} className="justify-center" />
          </div>
          <p className="text-gray-500 text-sm">Profilingizni bir daqiqada sozlang</p>
        </div>

        {/* Step tracker */}
        <div className="flex items-center justify-center gap-1.5 mb-7">
          {stepLabels.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  s < step  ? "bg-teal-600 text-white" :
                  s === step ? "bg-teal-600 text-white ring-4 ring-teal-100" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {s < step ? <Check className="w-3 h-3" /> : <span>{s}</span>}
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {s < 4 && <div className={`w-4 h-0.5 rounded ${s < step ? "bg-teal-500" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-xl">
          {step === 1 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Yoshingiz va sinfingiz</h3>
              <p className="text-gray-400 text-sm mb-6">O'zingizga mos kontentni tavsiya qilamiz</p>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2.5">Yoshingiz</p>
                  <div className="flex flex-wrap gap-2">
                    {["14", "15", "16", "17", "18", "19", "20+"].map(y => (
                      <button key={y} onClick={() => setYosh(y)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                          yosh === y ? "bg-teal-600 text-white border-teal-600" : "border-gray-200 text-gray-600 hover:border-teal-300"
                        }`}>{y}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2.5">Sinfingiz</p>
                  <div className="flex flex-wrap gap-2">
                    {["7", "8", "9", "10", "11", "12"].map(s => (
                      <button key={s} onClick={() => setSinf(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                          sinf === s ? "bg-teal-600 text-white border-teal-600" : "border-gray-200 text-gray-600 hover:border-teal-300"
                        }`}>{s}-sinf</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Maktabingiz</h3>
              <p className="text-gray-400 text-sm mb-6">O'qiyotgan maktabingizni tanlang</p>
              <input
                value={maktab}
                onChange={e => setMaktab(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 mb-3"
                placeholder="Maktab nomini kiriting…"
              />
              <div className="space-y-2">
                {["1-sonli akademik litsey, Toshkent", "78-sonli maktab, Toshkent", "IT Park akademiyasi", "Mirzo Ulug'bek nomidagi litsey"].map(m => (
                  <button key={m} onClick={() => setMaktab(m)}
                    className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-gray-700 border border-gray-200 hover:border-teal-400 hover:bg-teal-50 transition-all">
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">O'qiyotgan fanlar</h3>
              <p className="text-gray-400 text-sm mb-5">Bir yoki bir nechta fan tanlang</p>
              <div className="grid grid-cols-2 gap-2">
                {fanlarList.map(fan => (
                  <button key={fan} onClick={() => toggle(fan)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      selectedFanlar.includes(fan)
                        ? "bg-teal-600 text-white border-teal-600"
                        : "border-gray-200 text-gray-600 hover:border-teal-300"
                    }`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedFanlar.includes(fan) ? "bg-white border-white" : "border-gray-400"
                    }`}>
                      {selectedFanlar.includes(fan) && <Check className="w-3 h-3 text-teal-600" />}
                    </div>
                    {fan}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Kelajakdagi universitetingiz</h3>
              <p className="text-gray-400 text-sm mb-4">Orzu qilayotgan universitetingizni tanlang</p>
              <div className="space-y-2 mb-5">
                {universitetlar.map(u => (
                  <button key={u} onClick={() => setUniversitet(u)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm border-2 transition-all ${
                      universitet === u
                        ? "bg-teal-50 border-teal-500 text-teal-800 font-semibold"
                        : "border-gray-200 text-gray-700 hover:border-teal-300"
                    }`}>
                    {u}
                    {universitet === u && <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100">
                <div className="flex items-center gap-2 mb-2.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-bold text-teal-700">Sizga tavsiya etilgan fanlar</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recommended.map(f => (
                    <span key={f} className="text-xs bg-white text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg font-medium">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-7">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                Orqaga
              </button>
            )}
            <button
              onClick={async () => {
                if (step < 4) { setStep(s => s + 1); return; }
                setSaving(true);
                try {
                  const { user } = await api.setup({ yosh, sinf: `${sinf}-sinf`, maktab, fanlar: selectedFanlar, universitet });
                  onComplete(user);
                } catch (e) {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-bold transition-colors shadow-sm">
              {saving ? "Saqlanmoqda..." : step === 4 ? "Boshlash 🚀" : "Davom etish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ screen, setScreen, onLogout, isOpen, onClose, userData }: {
  screen: Screen; setScreen: (s: Screen) => void;
  onLogout: () => void; isOpen: boolean; onClose: () => void; userData: UserData;
}) {
  const initials = `${userData.ism?.[0] ?? ""}${userData.familiya?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <>
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-40 flex flex-col
        transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <BrandLogo size={36} className="flex-1" />
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-teal-100/40 rounded-2xl">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{userData.ism} {userData.familiya}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-teal-700 font-semibold">🏅 Daraja {userData.daraja}</span>
                <span className="text-xs text-orange-500 font-semibold">🔥 {userData.ketmaKet}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {[...navItems, ...(userData.role === "admin" ? [adminNavItem] : [])].map(item => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setScreen(item.id); onClose(); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Chiqish
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ title, onMenuClick, userData }: { title: string; onMenuClick: () => void; userData: UserData }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unread = notifications.filter(n => !n.read_at).length;
  useEffect(() => {
    api.notifications().then(({ notifications }) => setNotifications(notifications)).catch(() => {});
  }, []);
  async function openNotifications() {
    setOpen(v => !v);
    const { notifications } = await api.notifications();
    setNotifications(notifications);
  }
  async function markRead(id: number) {
    await api.readNotification(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100 px-4 lg:px-6 py-3.5 flex items-center gap-3">
      <button onClick={onMenuClick} className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-base font-bold text-gray-900 flex-1">{title}</h1>
      <div className="flex items-center gap-2">
        <button onClick={openNotifications} className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Bildirishnomalar">
          <Bell className="w-5 h-5" />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 min-w-2 h-2 bg-orange-500 rounded-full" />}
        </button>
        <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 bg-teal-50 rounded-xl border border-teal-100">
          <span className="text-xs font-bold text-teal-700">⚡ {userData.xp}</span>
          <span className="w-px h-3.5 bg-teal-200" />
          <span className="text-xs font-bold text-orange-500">🪙 {userData.coin}</span>
          <span className="w-px h-3.5 bg-teal-200" />
          <span className="text-xs font-bold text-orange-500">🔥 {userData.ketmaKet}</span>
        </div>
      </div>
      {open && <div className="absolute right-4 top-[62px] z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-gray-100 bg-white p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between"><p className="font-bold text-gray-900">Bildirishnomalar</p><span className="text-xs text-gray-400">{unread} ta yangi</span></div>
        <div className="max-h-80 space-y-2 overflow-y-auto">{notifications.length ? notifications.map(n => <button key={n.id} onClick={() => !n.read_at && markRead(n.id)} className={`w-full rounded-xl p-3 text-left ${n.read_at ? "bg-gray-50" : "bg-teal-50"}`}><p className="text-sm font-bold text-gray-800">{n.title}</p><p className="mt-1 text-xs text-gray-500">{n.body}</p></button>) : <p className="p-4 text-center text-sm text-gray-400">Hozircha bildirishnoma yo'q.</p>}</div>
      </div>}
    </header>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

function HomePage({ setScreen, userData }: { setScreen: (s: Screen) => void; userData: UserData }) {
  const { tasks, subjects } = useLearnUp();
  const xpPct = (userData.xp / userData.xpMax) * 100;
  const todayTasks = tasks.filter(v => v.tur === "bugungi");
  const todaySchedule = [
    { vaqt: "08:00", fan: "Matematika",  xona: "301-xona" },
    { vaqt: "09:50", fan: "Fizika",      xona: "204-xona" },
    { vaqt: "11:40", fan: "Ingliz tili", xona: "106-xona" },
    { vaqt: "13:30", fan: "Informatika", xona: "Lab-2"    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Hero greeting */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute bottom-2 right-16 w-20 h-20 bg-orange-400/20 rounded-full" />
        <div className="relative">
          <h2 className="text-2xl font-bold mb-0.5">Assalomu alaykum, {userData.ism}! 👋</h2>
          <p className="text-teal-200 text-sm mb-5">Bugun ham zo'r natijalar qo'lga kiriting!</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Daraja", value: userData.daraja, icon: "🏅" },
              { label: "XP",     value: userData.xp,    icon: "⚡" },
              { label: "Coin",   value: userData.coin,  icon: "🪙" },
              { label: "Ketma-ket", value: `${userData.ketmaKet} kun`, icon: "🔥" },
            ].map(s => (
              <div key={s.label} className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-3.5">
                <p className="text-xs text-teal-200 mb-1">{s.label}</p>
                <p className="text-xl font-bold">{s.value} <span className="text-base">{s.icon}</span></p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs text-teal-200 mb-1.5">
              <span>Keyingi darajaga {userData.xpMax - userData.xp} XP qoldi</span>
              <span>{userData.xp} / {userData.xpMax}</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-orange-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Bugungi vazifalar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Bugungi vazifalar</h3>
              <button onClick={() => setScreen("vazifalar")} className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-0.5">
                Barchasi <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2.5">
              {todayTasks.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Bugun uchun vazifa yo'q 🎉</p>
              )}
              {todayTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    task.holat === "bajarilgan" ? "bg-green-100" :
                    task.holat === "jarayonda"  ? "bg-orange-100" : "bg-gray-200"
                  }`}>
                    {task.holat === "bajarilgan" ? <Check className="w-4 h-4 text-green-600" /> :
                     task.holat === "jarayonda"  ? <Clock className="w-4 h-4 text-orange-500" /> :
                                                   <FileText className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{task.nom}</p>
                    <p className="text-xs text-gray-400">{task.fan} · {task.sana}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {task.muhim && <Chip variant="danger">⚠ Muhim</Chip>}
                    <span className="text-xs text-teal-600 font-bold">+{task.xp} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fan rivoji */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Fanlar rivoji</h3>
              <button onClick={() => setScreen("fanlar")} className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-0.5">
                Barchasi <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3.5">
              {subjects.slice(0, 5).map(fan => (
                <div key={fan.id} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center flex-shrink-0">{fan.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-700">{fan.nom}</span>
                      <span className="text-sm font-bold text-gray-900">{fan.foiz}%</span>
                    </div>
                    <ProgressBar value={fan.foiz} color={fan.rang} height={6} />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 flex-shrink-0">
                    {fan.baho}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Target university */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/40 rounded-2xl p-5 border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-gray-900 text-sm">Maqsad universitet</h3>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white text-lg font-black flex-shrink-0">IN</div>
              <div>
                <p className="text-sm font-bold text-gray-900">{userData.universitet}</p>
                <p className="text-xs text-gray-500">IT va Kompyuter Ilmlari</p>
              </div>
            </div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500">Tayyorgarlik</span>
              <span className="font-bold text-orange-600">68%</span>
            </div>
            <ProgressBar value={68} color="#F97316" height={7} />
          </div>

          {/* Today's schedule */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm">Bugungi jadval</h3>
              <button onClick={() => setScreen("kalendar")} className="text-xs text-teal-600 hover:text-teal-700 font-semibold">Ko'proq</button>
            </div>
            <div className="space-y-2">
              {todaySchedule.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-gray-400 w-11 flex-shrink-0">{d.vaqt}</span>
                  <div className="flex-1 flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-xs font-semibold text-gray-800">{d.fan}</span>
                    <span className="text-xs text-gray-400">{d.xona}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Tezkor amallar</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "AI Tekshiruv", icon: Brain,    screen: "vazifalar" as Screen, style: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
                { label: "Tez yozish",  icon: Keyboard, screen: "tez-yozish" as Screen, style: "bg-teal-50 text-teal-700 hover:bg-teal-100" },
                { label: "Fanlar",      icon: BookOpen, screen: "fanlar"    as Screen, style: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
                { label: "Mukofotlar",  icon: Trophy,   screen: "mukofotlar" as Screen, style: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.label} onClick={() => setScreen(a.screen)}
                    className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl text-xs font-bold transition-colors ${a.style}`}>
                    <Icon className="w-5 h-5" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fanlar Page ──────────────────────────────────────────────────────────────

function FanlarPage() {
  const { subjects, tasks } = useLearnUp();
  const [q, setQ] = useState("");
  const [selectedFan, setSelectedFan] = useState<SubjectVM | null>(null);
  const filtered = subjects.filter(f => f.nom.toLowerCase().includes(q.toLowerCase()));
  const selectedTasks = selectedFan ? tasks.filter(v => v.fan === selectedFan.nom) : [];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="relative max-w-xs mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Fan qidirish…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(fan => (
          <motion.div
            key={fan.id}
            whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-3xl">{fan.emoji}</span>
              <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400" />
                {fan.baho}.0
              </div>
            </div>
            <h3 className="font-bold text-gray-900 mb-0.5">{fan.nom}</h3>
            <p className="text-xs text-gray-400 mb-4">{fan.vazifalar} ta faol vazifa</p>

            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Rivojlanish</span>
                <span className="font-bold" style={{ color: fan.rang }}>{fan.foiz}%</span>
              </div>
              <ProgressBar value={fan.foiz} color={fan.rang} height={6} />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400 font-mono">⚡ {fan.xp} XP</span>
              <button
                onClick={() => setSelectedFan(fan)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: fan.rang }}
              >
                Ochish
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <InteractiveModal
        open={Boolean(selectedFan)}
        title={selectedFan?.nom ?? "Fan haqida"}
        subtitle={selectedFan ? `${selectedFan.vazifalar} ta faol vazifa • ${selectedFan.foiz}% rivojlanish` : ""}
        onClose={() => setSelectedFan(null)}
        footer={
          <button
            onClick={() => setSelectedFan(null)}
            className="w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Yopish
          </button>
        }
      >
        {selectedFan && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Fan darajasi</p>
                  <p className="text-2xl font-black text-gray-900">{selectedFan.foiz}%</p>
                </div>
                <div className="text-4xl">{selectedFan.emoji}</div>
              </div>
              <div className="mt-3">
                <ProgressBar value={selectedFan.foiz} color={selectedFan.rang} height={7} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                <span>Bahosi: {selectedFan.baho}.0</span>
                <span>XP: {selectedFan.xp}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4">
              <h4 className="text-sm font-bold text-gray-900">Bu fandagi vazifalar</h4>
              <div className="mt-3 space-y-2">
                {selectedTasks.length > 0 ? (
                  selectedTasks.map(task => (
                    <div key={task.id} className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-sm font-semibold text-gray-800">{task.nom}</p>
                      <p className="mt-1 text-xs text-gray-400">{task.sana}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Hozircha bu fanga oid vazifa yo‘q.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </InteractiveModal>
    </div>
  );
}

// ─── AI Tekshiruv Modal ───────────────────────────────────────────────────────

function AIModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"upload" | "loading" | "result" | "error">("upload");
  const [result, setResult] = useState<{ baho: number | null; izoh: string; xatoliklar: string[]; mock?: boolean } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setStep("loading");
    try {
      const res = await api.aiCheck(file);
      setResult(res);
      setStep("result");
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : "AI tekshiruvida xatolik yuz berdi");
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900">AI Tekshiruv</h3>
            <Chip variant="teal">Beta</Chip>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {step === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <div
                className="border-2 border-dashed border-gray-200 hover:border-purple-400 rounded-2xl p-12 text-center cursor-pointer transition-all group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-gray-100 group-hover:bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
                  <Camera className="w-8 h-8 text-gray-300 group-hover:text-purple-400 transition-colors" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Daftar rasmini yuklang</p>
                <p className="text-xs text-gray-400">JPG, PNG yoki PDF · 10 MB gacha</p>
                <p className="text-xs text-teal-600 font-semibold mt-3">Bosing yoki faylni tashlang</p>
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mx-auto mb-5" />
              <p className="font-bold text-gray-900">AI tekshiryapti…</p>
              <p className="text-sm text-gray-400 mt-1">Natijalar tayyorlanmoqda</p>
            </div>
          )}

          {step === "error" && (
            <div className="py-10 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-sm text-gray-600">{errorMsg}</p>
              <button onClick={() => setStep("upload")} className="text-sm font-bold text-purple-600 hover:text-purple-700">
                Qayta urinish
              </button>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              {result.mock && (
                <div className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                  Demo natija — haqiqiy AI tahlili uchun backendda ANTHROPIC_API_KEY sozlanishi kerak.
                </div>
              )}
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border border-green-100">
                <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black">
                  {result.baho ?? "–"}
                </div>
                <div>
                  <p className="font-bold text-gray-900">Baho: {result.baho ?? "–"} / 5</p>
                  <p className="text-sm text-gray-500">AI tomonidan tekshirildi</p>
                </div>
                <span className="ml-auto text-3xl">🎉</span>
              </div>

              {result.xatoliklar?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <div className="flex items-center gap-2 mb-2.5">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="font-bold text-red-700 text-sm">Xatolar ({result.xatoliklar.length} ta)</span>
                  </div>
                  <ul className="space-y-2">
                    {result.xatoliklar.map((err, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-400 font-bold flex-shrink-0">✗</span>
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-bold text-purple-700 text-sm">AI izohi va tavsiyalar</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{result.izoh}</p>
              </div>

              <button onClick={onClose}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-2xl font-bold text-sm transition-colors">
                Yopish
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Vazifalar Page ───────────────────────────────────────────────────────────

function VazifalarPage() {
  const { tasks, subjects, addTask, completeTask } = useLearnUp();
  const [tab, setTab] = useState<"bugungi" | "kelgusi" | "bajarilgan">("bugungi");
  const [showAI, setShowAI] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSubject, setNewTaskSubject] = useState("Matematika");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [xpToast, setXpToast] = useState<string>("");

  const filtered = tasks.filter(v => v.tur === tab);
  const subjectNames = subjects.length ? subjects.map(s => s.nom) : ['Matematika','Fizika','Kimyo','Biologiya','Ingliz tili','Ona tili'];

  const statusMeta: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "teal" | "orange" }> = {
    "bajarilmagan": { label: "Bajarilmagan", variant: "default" },
    "jarayonda":    { label: "Jarayonda",    variant: "warning"  },
    "bajarilgan":   { label: "Bajarilgan",   variant: "success"  },
  };

  async function handleAddTask() {
    if (!newTaskTitle.trim()) return;
    setSaving(true);
    try {
      await addTask({
        fan: newTaskSubject,
        nom: newTaskTitle.trim(),
        muddat: newTaskDate ? new Date(newTaskDate).toISOString() : undefined,
        sana: newTaskDate ? undefined : "Muddatsiz",
        xp: 30,
      });
      setShowAddTask(false);
      setNewTaskTitle("");
      setNewTaskDate("");
    } catch (e) {
      // xatolik bo'lsa modal ochiq qoladi, foydalanuvchi qayta urinishi mumkin
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(id: number) {
    setCompletingId(id);
    try {
      const xpGained = await completeTask(id);
      setXpToast(`+${xpGained} XP qo'shildi! 🎉`);
      setTimeout(() => setXpToast(""), 3000);
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {/* AI Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-5 mb-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5" />
              <span className="font-bold">AI Tekshiruv</span>
              <Chip variant="teal">Beta</Chip>
            </div>
            <p className="text-sm text-purple-200">Daftar rasmini yuklang — AI bahoni tekshiradi</p>
          </div>
          <button onClick={() => setShowAI(true)}
            className="flex-shrink-0 bg-white text-purple-700 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-purple-50 transition-colors">
            Yuklash
          </button>
        </div>
      </div>

      {xpToast && (
        <div className="mb-4 flex items-center gap-2.5 p-3.5 bg-teal-50 rounded-xl border border-teal-100">
          <Zap className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-bold text-teal-700">{xpToast}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5 w-fit gap-1">
        {(["bugungi", "kelgusi", "bajarilgan"] as const).map(t => {
          const labels = { bugungi: "Bugungi", kelgusi: "Kelgusi", bajarilgan: "Bajarilgan" };
          const cnt = tasks.filter(v => v.tur === t).length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === t ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {labels[t]}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                tab === t ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
              }`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Bu bo'limda vazifa yo'q.</p>
        )}
        {filtered.map(task => (
          <motion.div key={task.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                task.holat === "bajarilgan" ? "bg-green-100" :
                task.holat === "jarayonda"  ? "bg-orange-100" : "bg-gray-100"
              }`}>
                {task.holat === "bajarilgan" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                 task.holat === "jarayonda"  ? <Clock        className="w-5 h-5 text-orange-500" /> :
                                               <FileText     className="w-5 h-5 text-gray-400"  />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{task.nom}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{task.fan}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />&nbsp;{task.sana}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.muhim && <Chip variant="danger">⚠ Muhim</Chip>}
                    <Chip variant={statusMeta[task.holat].variant}>{statusMeta[task.holat].label}</Chip>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-gray-100">
                  <span className="text-xs font-bold text-teal-600">+{task.xp} XP</span>
                  {task.holat !== "bajarilgan" && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      disabled={completingId === task.id}
                      className="text-xs text-gray-500 hover:text-teal-600 font-semibold transition-colors disabled:opacity-50">
                      {completingId === task.id ? "Saqlanmoqda…" : "✓ Bajarilgan deb belgilash"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <button onClick={() => setShowAddTask(true)} className="mt-4 w-full border-2 border-dashed border-gray-200 hover:border-teal-400 rounded-2xl p-4 text-sm font-semibold text-gray-400 hover:text-teal-600 transition-all flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" />
        Yangi vazifa qo'shish
      </button>

      <InteractiveModal
        open={showAddTask}
        title="Yangi vazifa qo‘shish"
        subtitle="Bugungi va kelgusi vazifalarni tezda qo‘shing"
        onClose={() => setShowAddTask(false)}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowAddTask(false)} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">Bekor qilish</button>
            <button onClick={handleAddTask} disabled={saving} className="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Vazifa nomi</label>
            <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Masalan: Algebra mashqlari" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Fan</label>
            <select value={newTaskSubject} onChange={(e) => setNewTaskSubject(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              {subjectNames.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Muddat</label>
            <input value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} type="datetime-local" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
      </InteractiveModal>

      {showAI && <AIModal onClose={() => setShowAI(false)} />}
    </div>
  );
}

// ─── Kalendar Page ────────────────────────────────────────────────────────────

const oyNomlari = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];

function KalendarPage() {
  const { events, addEvent, refreshEvents } = useLearnUp();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("Vazifa");
  const [saving, setSaving] = useState(false);

  const startDay = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Dushanba=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const dayNames = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

  const eventsByDay: Record<number, typeof events> = {};
  events.forEach(e => {
    const d = new Date(e.sana);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      (eventsByDay[day] ||= []).push(e);
    }
  });

  function changeMonth(delta: number) {
    let m = viewMonth + delta, y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m); setViewYear(y);
    setSelectedDay(1);
    refreshEvents(y, m + 1).catch(() => {});
  }

  async function handleAddEvent() {
    if (!eventTitle.trim()) return;
    setSaving(true);
    try {
      const sana = new Date(viewYear, viewMonth, selectedDay).toISOString().slice(0, 10);
      await addEvent({ sana, turi: eventType, label: eventTitle.trim() });
      setShowEventModal(false);
      setEventTitle("");
    } finally {
      setSaving(false);
    }
  }

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const selectedEvents = eventsByDay[selectedDay] || [];

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900">{oyNomlari[viewMonth]} {viewYear}</h3>
            <div className="flex gap-1">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-300 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: totalCells }).map((_, i) => {
              const day = i - startDay + 1;
              const valid = day >= 1 && day <= daysInMonth;
              const hasEv = valid && eventsByDay[day];
              const isToday = isCurrentMonth && day === today.getDate();
              const isSel = day === selectedDay;
              return (
                <button key={i} onClick={() => valid && setSelectedDay(day)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    !valid ? "cursor-default opacity-0" :
                    isSel  ? "bg-teal-600 text-white shadow-sm" :
                    isToday ? "border-2 border-teal-400 text-teal-700" :
                    "hover:bg-gray-100 text-gray-700"
                  }`}>
                  {valid && (
                    <>
                      {day}
                      {hasEv && !isSel && (
                        <div className="flex gap-0.5 mt-0.5">
                          {eventsByDay[day]!.slice(0, 2).map((e, j) => (
                            <div key={j} className="w-1 h-1 rounded-full" style={{ backgroundColor: e.rang }} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-0.5">{selectedDay}-{oyNomlari[viewMonth]}</h3>
          <p className="text-sm text-gray-400 mb-4">{selectedEvents.length > 0 ? `${selectedEvents.length} ta hodisa` : "Hodisa yo'q"}</p>
          {selectedEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: e.rang }} />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{e.label}</p>
                    <p className="text-xs text-gray-400">{e.turi}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Bu kunda hodisa yo'q</p>
            </div>
          )}
          <button onClick={() => setShowEventModal(true)} className="w-full mt-4 border-2 border-dashed border-gray-200 hover:border-teal-400 rounded-xl p-3 text-sm font-semibold text-gray-400 hover:text-teal-600 transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Hodisa qo'shish
          </button>

          <InteractiveModal
            open={showEventModal}
            title="Yangi hodisa"
            subtitle="Kalendaringizga yangi voqeani qo‘shing"
            onClose={() => setShowEventModal(false)}
            footer={
              <div className="flex gap-3">
                <button onClick={() => setShowEventModal(false)} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">Bekor qilish</button>
                <button onClick={handleAddEvent} disabled={saving} className="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Saqlanmoqda…" : "Saqlash"}
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Hodisa nomi</label>
                <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Masalan: Matematika test" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Turi</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {['Vazifa','Imtihon','Nazorat','Loyiha','Test'].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </InteractiveModal>
        </div>
      </div>
    </div>
  );
}

// ─── Dostlar Page ─────────────────────────────────────────────────────────────

function DostlarPage() {
  const { friends, addFriend, sendMessage, sendChallenge } = useLearnUp();
  const [q, setQ] = useState("");
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendVM | null>(null);
  const [friendAction, setFriendAction] = useState<"message" | "challenge" | "profile" | null>(null);
  const [messageText, setMessageText] = useState("");
  const [challengeText, setChallengeText] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const filtered = friends.filter(d => !q || d.ism.toLowerCase().includes(q.toLowerCase()));

  const closeFriendAction = () => {
    setSelectedFriend(null);
    setFriendAction(null);
    setMessageText("");
    setChallengeText("");
  };

  async function handleAddFriend() {
    if (!friendEmail.trim()) return;
    setAddSaving(true);
    setAddError("");
    const res = await addFriend(friendEmail.trim());
    setAddSaving(false);
    if (res.ok) {
      setShowFriendModal(false);
      setFriendEmail("");
    } else {
      setAddError(res.error || "Xatolik yuz berdi");
    }
  }

  async function handleSendMessage() {
    if (!selectedFriend || !messageText.trim()) return;
    setActionSaving(true);
    try {
      await sendMessage(selectedFriend.id, messageText.trim());
      closeFriendAction();
    } finally {
      setActionSaving(false);
    }
  }

  async function handleSendChallenge() {
    if (!selectedFriend || !challengeText.trim()) return;
    setActionSaving(true);
    try {
      await sendChallenge(selectedFriend.id, challengeText.trim());
      closeFriendAction();
    } finally {
      setActionSaving(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="Do'st qidirish…" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Do'stlarim <span className="text-gray-400 font-normal text-sm">({friends.length})</span></h3>
        <button onClick={() => setShowFriendModal(true)} className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" /> Do'st qo'shish
        </button>
      </div>

      <InteractiveModal
        open={showFriendModal}
        title="Yangi do‘st qo‘shish"
        subtitle="Do'stingizning emailini kiriting"
        onClose={() => setShowFriendModal(false)}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setShowFriendModal(false)} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">Bekor qilish</button>
            <button onClick={handleAddFriend} disabled={addSaving} className="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {addSaving ? "Yuborilmoqda…" : "Qo'shish"}
            </button>
          </div>
        }
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Do‘stning emaili</label>
          <input value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} type="email" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="masalan@mail.uz" />
          {addError && <p className="mt-2 text-sm text-red-500 font-semibold">{addError}</p>}
        </div>
      </InteractiveModal>

      <FriendProfileModal
        open={friendAction === "profile" && Boolean(selectedFriend)}
        friend={selectedFriend ?? { ism: "", sinf: "", daraja: 0, xp: 0, faoliyat: "" }}
        onClose={closeFriendAction}
      />

      <FriendMessageModal
        open={friendAction === "message" && Boolean(selectedFriend)}
        friend={selectedFriend ?? { ism: "" }}
        value={messageText}
        onChange={setMessageText}
        onClose={closeFriendAction}
        onSubmit={handleSendMessage}
      />

      <FriendChallengeModal
        open={friendAction === "challenge" && Boolean(selectedFriend)}
        friend={selectedFriend ?? { ism: "" }}
        value={challengeText}
        onChange={setChallengeText}
        onClose={closeFriendAction}
        onSubmit={handleSendChallenge}
      />

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Hozircha do'stlar yo'q. Yuqoridagi tugma orqali qo'shing.</p>
        )}
        {filtered.map(d => (
          <div key={d.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0">
                {d.ism.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900 text-sm">{d.ism}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500">{d.sinf}</span>
                  <span className="text-gray-300">·</span>
                  <Chip variant="teal">Daraja {d.daraja}</Chip>
                  <Chip variant="orange">⚡ {d.xp.toLocaleString()}</Chip>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 truncate">{d.faoliyat}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3.5 pt-3 border-t border-gray-100">
              <button onClick={() => { setSelectedFriend(d); setFriendAction("profile"); }} className="flex-1 text-xs font-bold py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors">Profil</button>
              <button onClick={() => { setSelectedFriend(d); setFriendAction("challenge"); }} className="flex-1 text-xs font-bold py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl transition-colors">Musobaqa</button>
              <button onClick={() => { setSelectedFriend(d); setFriendAction("message"); }} className="flex-1 text-xs font-bold py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl transition-colors">Xabar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tez Yozish Page ──────────────────────────────────────────────────────────

type GameLanguage = "uzbek" | "english";
type Difficulty = "easy" | "medium" | "hard";
type TypingMode = "mashq" | "ai" | "dost";

const typingTextLibrary: Record<GameLanguage, Record<Difficulty, string[]>> = {
  uzbek: {
    easy: [
      "Har kuni yangi bilim o'rganish kelajagimizni yoritadi.",
      "Maktabdagi darslar va uy vazifalari o'quvchining kelajagini yaratadi.",
      "O'zbekiston bayrog'i quvonch va g'urur ramzidir.",
      "Mehnat va sabr har qanday maqsadga erishishda yordam beradi.",
    ],
    medium: [
      "Biologiya fani organizmlarning tuzilishi, rivojlanishi va yashash jarayonlarini o'rganadi.",
      "Matematika mavjud muammolarni aniq va tez yechish uchun mantiqiy fikrlashni rivojlantiradi.",
      "Taraqqiyotga erishish uchun doimiy o'rganish, sinash va yaxshilash kerak bo'ladi.",
      "Toshkent shahri zamonaviy ta'lim, fan va madaniyat markazlaridan biriga aylanmoqda.",
    ],
    hard: [
      "Ilmiy tadqiqotlar va amaliy mashg'ulotlar orqali o'quvchilar zamonaviy texnologiyalar, muhandislik va fan sohalarida mustahkam poydevor quradilar.",
      "Barqaror kelajakni yaratish uchun yosh avlodga zamonaviy bilim, ijtimoiy madaniyat va mas'uliyatli mehnat tarbiyasi kerak bo'ladi.",
      "Talabalarning faolligi, mustaqil fikrlashi va ijodiy yondashuvi ta'lim jarayonining eng muhim omillaridan biri hisoblanadi.",
      "Har bir yangilik va ijtimoiy o'zgarish insonlarning bilim, mahorat va muloqot ko'nikmalariga bog'liq bo'lib, bu jarayonlarni rivojlantirish dolzarb vazifadir.",
    ],
  },
  english: {
    easy: [
      "Practice makes progress and every small step matters.",
      "Reading every day helps you learn new ideas and grow faster.",
      "A calm mind and steady focus can solve many problems.",
      "Learning English opens new doors to knowledge and friends.",
    ],
    medium: [
      "Technology is changing the world, and students need creativity, patience, and curiosity to keep up.",
      "Strong communication skills help people work with teams, share ideas, and solve problems confidently.",
      "Success usually comes from regular practice, careful planning, and learning from mistakes.",
      "Healthy habits, clear goals, and teamwork can improve both study performance and confidence.",
    ],
    hard: [
      "In a rapidly evolving world, the most valuable skill is not just memorizing facts, but adapting to new information, thinking critically, and applying knowledge to real challenges.",
      "Scientific progress depends on curiosity, disciplined research, and the ability to connect theory with practical solutions that benefit people and society.",
      "Students who develop resilience, creativity, and self-motivation are much better prepared to face uncertainty, lead projects, and contribute meaningfully to the future.",
      "Effective learning requires consistent effort, feedback, reflection, and the courage to practice difficult tasks until improvement becomes visible and sustainable.",
    ],
  },
};

const difficultyMeta: Record<Difficulty, { label: string; emoji: string; subtitle: string }> = {
  easy: { label: "Oson", emoji: "🌱", subtitle: "Yengil va tez mashq" },
  medium: { label: "O'rta", emoji: "⚡", subtitle: "Muvozanatli qiyinchilik" },
  hard: { label: "Qiyin", emoji: "🔥", subtitle: "Kuchli tayyorgarlik" },
};

function TezYozishPage() {
  const { typingTexts: ctxTexts, submitTypingResult } = useLearnUp();
  const [mode, setMode] = useState<null | TypingMode>(null);
  const [language, setLanguage] = useState<GameLanguage>("uzbek");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [gs, setGs] = useState<"idle" | "countdown" | "playing" | "finished">("idle");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [typed, setTyped] = useState("");
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [submitted, setSubmitted] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [selectedText, setSelectedText] = useState<string>(typingTextLibrary.uzbek.easy[0]);
  const [aiProgress, setAiProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const getTextPool = (targetLanguage: GameLanguage, targetDifficulty: Difficulty) => {
    if (ctxTexts.length) {
      const filtered = ctxTexts.filter((text) => {
        const hasEnglish = /[A-Za-z]/.test(text);
        return targetLanguage === "english" ? hasEnglish : !hasEnglish;
      });
      if (filtered.length) return filtered;
    }
    return typingTextLibrary[targetLanguage][targetDifficulty];
  };

  const pickText = (targetLanguage: GameLanguage, targetDifficulty: Difficulty) => {
    const pool = getTextPool(targetLanguage, targetDifficulty);
    return pool[Math.floor(Math.random() * pool.length)] || typingTextLibrary[targetLanguage][targetDifficulty][0];
  };

  useEffect(() => {
    if (gs !== "countdown") return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    setGs("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [gs, countdown]);

  useEffect(() => {
    if (gs !== "playing") return;
    if (timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
    setGs("finished");
  }, [gs, timeLeft]);

  useEffect(() => {
    if (gs !== "finished" || submitted) return;
    setSubmitted(true);
    submitTypingResult({ mode: mode || "mashq", wpm, accuracy, duration: 60 - timeLeft })
      .then((gained) => setXpGained(gained))
      .catch(() => {});
  }, [gs, submitted, mode, wpm, accuracy, timeLeft, submitTypingResult]);

  useEffect(() => {
    if (mode !== "ai" || gs !== "playing") {
      setAiProgress(0);
      return;
    }

    const step = difficulty === "easy" ? 2 : difficulty === "medium" ? 4 : 6;
    const interval = setInterval(() => {
      setAiProgress((prev) => {
        const next = prev + (Math.random() * step + step * 0.5);
        return Math.min(Math.ceil(next), selectedText.length);
      });
    }, 900);

    return () => clearInterval(interval);
  }, [mode, gs, difficulty, selectedText.length]);

  const start = (m: TypingMode) => {
    const text = pickText(language, difficulty);
    setMode(m);
    setSelectedText(text);
    setAiProgress(0);
    setGs("countdown");
    setCountdown(3);
    setTimeLeft(60);
    setTyped("");
    setWpm(0);
    setAccuracy(100);
    setSubmitted(false);
    setXpGained(0);
  };

  const reset = () => {
    setMode(null);
    setSelectedText(typingTextLibrary[language][difficulty][0]);
    setAiProgress(0);
    setGs("idle");
    setCountdown(3);
    setTimeLeft(60);
    setTyped("");
    setWpm(0);
    setAccuracy(100);
    setSubmitted(false);
    setXpGained(0);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTyped(val);
    const words = val.trim().split(/\s+/).filter(Boolean).length;
    const elapsed = 60 - timeLeft;
    setWpm(elapsed > 0 ? Math.round((words / elapsed) * 60) : 0);
    let correct = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i] === selectedText[i]) correct++;
    }
    setAccuracy(val.length > 0 ? Math.round((correct / val.length) * 100) : 100);
    if (val.length >= selectedText.length) setGs("finished");
  };

  if (!mode) {
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Keyboard className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Tez yozish</h2>
          <p className="text-gray-400 text-sm">Tilni, qiyinchilikni tanlang va mahoratingizni sinab ko'ring</p>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Til</p>
          <div className="flex gap-2">
            {([
              { key: "uzbek", label: "O'zbek" },
              { key: "english", label: "English" },
            ] as const).map((item) => (
              <button
                key={item.key}
                onClick={() => setLanguage(item.key)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  language === item.key
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Qiyinchilik</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(difficultyMeta) as Difficulty[]).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  difficulty === level
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="text-lg">{difficultyMeta[level].emoji}</div>
                <div className="text-sm font-bold text-gray-800">{difficultyMeta[level].label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 mb-8">
          {[
            { id: "mashq" as const, label: "Mashq", desc: "O'zingiz uchun mashq qiling", emoji: "🎯", style: "hover:border-teal-400 hover:bg-teal-50" },
            { id: "ai" as const, label: "AI bilan jang", desc: `AI raqibi • ${difficultyMeta[difficulty].label} daraja`, emoji: "🤖", style: "hover:border-orange-400 hover:bg-orange-50" },
            { id: "dost" as const, label: "Do'st bilan", desc: "Do'stingiz bilan musobaqa qiling", emoji: "👥", style: "hover:border-blue-400 hover:bg-blue-50" },
          ].map((m) => (
            <button key={m.id} onClick={() => start(m.id)}
              className={`p-5 bg-white rounded-2xl border-2 border-gray-200 transition-all text-left shadow-sm ${m.style}`}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">{m.emoji}</span>
                <div>
                  <p className="font-bold text-gray-900">{m.label}</p>
                  <p className="text-sm text-gray-400">{m.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 ml-auto" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button onClick={reset} className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Orqaga
        </button>
        <div className="flex items-center gap-6">
          {[
            { label: "WPM", value: wpm, color: "text-teal-600" },
            { label: gs === "countdown" ? "Boshlanmoqda" : "Soniya", value: gs === "countdown" ? countdown : timeLeft, color: timeLeft <= 10 && gs === "playing" ? "text-red-500" : "text-gray-900" },
            { label: "Aniqlik", value: `${accuracy}%`, color: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
        <button onClick={() => start(mode || "mashq")} className="p-2 hover:bg-gray-100 rounded-xl">
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="mb-4 rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Rejim</p>
            <p className="font-bold text-gray-900">{mode === "ai" ? "AI bilan jang" : mode === "dost" ? "Do'st bilan" : "Mashq"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">{language === "english" ? "English" : "O'zbek"}</span>
            <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">{difficultyMeta[difficulty].label}</span>
          </div>
        </div>
      </div>

      {gs === "countdown" && (
        <div className="text-center py-20">
          <motion.div
            key={countdown}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="text-9xl font-black text-teal-600"
          >
            {countdown === 0 ? "🚀" : countdown}
          </motion.div>
        </div>
      )}

      {(gs === "playing" || gs === "finished") && (
        <div className="space-y-4">
          {mode === "ai" && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <span className="text-sm font-bold text-orange-700">AI raqibi yozmoqda</span>
                </div>
                <span className="text-xs font-semibold text-orange-600">{Math.min(100, Math.round((aiProgress / Math.max(selectedText.length, 1)) * 100))}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-orange-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                  animate={{ width: `${Math.min(100, (aiProgress / Math.max(selectedText.length, 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-orange-700">
                {selectedText.slice(0, Math.min(aiProgress, selectedText.length)) || "AI tayyorgarlik ko'rmoqda..."}
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              {mode === "ai" ? "AI raqibi" : mode === "dost" ? "Raqib" : "Matn"}
            </p>
            <p className="text-lg leading-relaxed">
              {selectedText.split("").map((ch, i) => (
                <span key={i} className={
                  i < typed.length
                    ? typed[i] === ch ? "text-teal-600 font-semibold" : "text-red-500 bg-red-50"
                    : i === typed.length ? "border-b-2 border-gray-500 text-gray-800"
                    : "text-gray-300"
                }>{ch}</span>
              ))}
            </p>
          </div>

          {gs === "playing" && (
            <input
              ref={inputRef}
              value={typed}
              onChange={handleInput}
              autoFocus
              className="w-full px-5 py-4 bg-white border-2 border-teal-400 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              placeholder={language === "english" ? "Type here..." : "Bu yerga yozing…"}
            />
          )}

          {gs === "finished" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-5 text-center">Natijangiz! 🎉</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "WPM", value: wpm, icon: "⚡", color: "text-teal-600" },
                  { label: "Aniqlik", value: `${accuracy}%`, icon: "🎯", color: "text-green-600" },
                  { label: "Vaqt", value: `${60 - timeLeft}s`, icon: "⏱", color: "text-blue-600" },
                  { label: "Ball", value: Math.round((wpm * accuracy) / 100), icon: "⭐", color: "text-orange-500" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 bg-gray-50 rounded-2xl">
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-3 p-3.5 bg-teal-50 rounded-2xl mb-4 border border-teal-100">
                <Zap className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-bold text-teal-700">{submitted ? `+${xpGained} XP qo'shildi` : "XP hisoblanmoqda…"}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => start(mode || "mashq")} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-2xl font-bold transition-colors">Qayta urinish</button>
                <button onClick={reset} className="flex-1 border-2 border-gray-200 text-gray-700 py-3.5 rounded-2xl font-bold hover:bg-gray-50 transition-colors">Asosiy menyu</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mukofotlar Page ──────────────────────────────────────────────────────────

function MukofotlarPage({ userData }: { userData: UserData }) {
  const { achievements, leaderboard } = useLearnUp();
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      {/* Level banner */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-orange-200 text-sm mb-1">Joriy daraja</p>
            <h2 className="text-4xl font-black">Daraja {userData.daraja}</h2>
            <p className="text-orange-200 text-sm mt-1">Tajribali o'quvchi</p>
          </div>
          <div className="text-6xl">🏅</div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-orange-200 mb-1.5">
            <span>Daraja {userData.daraja + 1} ga</span>
            <span>{userData.xp.toLocaleString()} / {userData.xpMax.toLocaleString()} XP</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(userData.xp / userData.xpMax) * 100}%` }}
              transition={{ duration: 1.2 }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Umumiy XP",  value: userData.umumiyXP.toLocaleString(), icon: "⚡", bg: "bg-teal-50",   text: "text-teal-700"  },
          { label: "Coin",       value: userData.coin,                       icon: "🪙", bg: "bg-orange-50", text: "text-orange-700" },
          { label: "Ketma-ket",  value: `${userData.ketmaKet} kun`,          icon: "🔥", bg: "bg-red-50",    text: "text-red-700"   },
          { label: "Bajarildi",  value: userData.umumiyVazifalar,            icon: "✅", bg: "bg-green-50",  text: "text-green-700" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="text-2xl mb-1.5">{s.icon}</div>
            <div className={`text-2xl font-black ${s.text}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Yutuqlar</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map(a => (
            <div key={a.id}
              className={`rounded-2xl p-4 text-center transition-all ${
                a.earned
                  ? "bg-gradient-to-br from-teal-50 to-teal-100/50 border-2 border-teal-200"
                  : "bg-gray-50 border-2 border-gray-100 opacity-70"
              }`}>
              <div className={`text-3xl mb-2 ${!a.earned ? "grayscale opacity-50" : ""}`}>{a.emoji}</div>
              <p className="text-xs font-bold text-gray-900">{a.nom}</p>
              <p className="text-xs text-gray-400 mt-0.5">{a.desc}</p>
              {!a.earned && a.progress > 0 && (
                <div className="mt-2">
                  <ProgressBar value={a.progress} color="#0F766E" height={4} />
                  <span className="text-xs text-gray-400">{a.progress}%</span>
                </div>
              )}
              {a.earned && <p className="mt-1.5 text-xs text-teal-600 font-bold">✓ Qo'lga kiritildi</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Reyting jadvali</h3>
        <div className="space-y-2">
          {leaderboard.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Hozircha reyting mavjud emas.</p>
          )}
          {leaderboard.map(l => (
            <div key={l.o}
              className={`flex items-center gap-3.5 p-3.5 rounded-2xl ${
                l.me ? "bg-teal-50 border-2 border-teal-200" : "hover:bg-gray-50 border-2 border-transparent"
              }`}>
              <span className="text-xl w-8 text-center">{medals[l.o - 1] ?? `#${l.o}`}</span>
              <div className="flex-1">
                <p className={`text-sm font-bold ${l.me ? "text-teal-700" : "text-gray-900"}`}>
                  {l.ism} {l.me && <span className="text-xs text-teal-400">(Siz)</span>}
                </p>
                <p className="text-xs text-gray-400">Daraja {l.daraja}</p>
              </div>
              <div className="text-sm font-bold text-orange-500">⚡ {l.xp.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profil Page ──────────────────────────────────────────────────────────────

function ProfilPage({ setScreen, userData }: { setScreen: (s: Screen) => void; userData: UserData }) {
  const { subjects } = useLearnUp();
  const selectedFanlar = subjects.filter((f) => userData.fanlar?.includes(f.nom));

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-700 rounded-2xl flex items-center justify-center text-white text-2xl font-black">IT</div>
            <button className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50">
              <Camera className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{userData.ism} {userData.familiya}</h2>
            <p className="text-gray-400 text-sm mb-2">{userData.sinf} · {userData.maktab}</p>
            <div className="flex flex-wrap gap-2">
              <Chip variant="teal">🏅 Daraja {userData.daraja}</Chip>
              <Chip variant="orange">🔥 {userData.ketmaKet} kun</Chip>
              <Chip variant="teal">⚡ {userData.xp.toLocaleString()} XP</Chip>
            </div>
          </div>
          <button onClick={() => setScreen("sozlamalar")} className="p-2 hover:bg-gray-100 rounded-xl">
            <Edit className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Ma'lumotlar</h3>
        <div className="space-y-3">
          {[
            { label: "Maktab",             value: userData.maktab,      Icon: Building2    },
            { label: "Maqsad universitet", value: userData.universitet,  Icon: GraduationCap },
            { label: "Yosh",               value: `${userData.yosh} yosh`, Icon: User        },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Statistika</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Umumiy XP",  value: userData.umumiyXP.toLocaleString(), icon: "⚡" },
            { label: "Coin",       value: userData.coin,                       icon: "🪙" },
            { label: "Vazifalar",  value: userData.umumiyVazifalar,            icon: "✅" },
            { label: "Reyting",    value: `#${userData.rating}`,               icon: "🏆" },
          ].map(s => (
            <div key={s.label} className="p-4 bg-gray-50 rounded-2xl">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Fanlar</h3>
          <button onClick={() => setScreen("fanlar")} className="text-xs font-semibold text-teal-600 hover:text-teal-700">Barchasi</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {selectedFanlar.length > 0 ? selectedFanlar.map(f => (
            <div key={f.id} className="text-center rounded-2xl bg-gray-50 p-2.5">
              <div className="text-2xl mb-1">{f.emoji}</div>
              <div className="text-xs text-gray-500 truncate">{f.nom.split(" ")[0]}</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: f.rang }}>{f.foiz}%</div>
            </div>
          )) : (
            <div className="col-span-full text-sm text-gray-500">Hozircha tanlangan fanlar yo‘q.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sozlamalar Page ──────────────────────────────────────────────────────────

type Subscription = { plan: "pro"; priceUzs: number; plans?: { id: string; months: number; priceUzs: number; label: string }[]; status: "trialing" | "active" | "expired"; trialEndsAt?: string | null; currentPeriodEnd?: string | null; exempt?: boolean };

function SubscriptionPage({ subscription }: { subscription: Subscription | null }) {
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [planId, setPlanId] = useState("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [promoNotice, setPromoNotice] = useState("");
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const endsAt = subscription?.status === "trialing" ? subscription?.trialEndsAt : subscription?.currentPeriodEnd;
  const formattedEnd = endsAt ? new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "long", year: "numeric" }).format(new Date(endsAt)) : null;

  async function createPayment() {
    setCreatingPayment(true); setError("");
    try { const { payment } = await api.createSubscriptionPayment({ planId, promoCode }); setPaymentRef(payment.provider_ref); }
    catch (e) { setError(e instanceof ApiError ? e.message : "To'lov so'rovini yaratib bo'lmadi"); }
    finally { setCreatingPayment(false); }
  }
  if (!subscription) return <div className="p-6 text-center text-sm text-gray-400">Obuna ma'lumotlari yuklanmoqda...</div>;
  return <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
    <section className="rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 p-6 sm:p-8 text-white shadow-lg">
      <div className="flex items-start justify-between gap-4"><div><div className="mb-3 flex items-center gap-2 text-sm font-bold text-teal-100"><Crown className="w-5 h-5" /> LearnUp Pro</div><h2 className="text-2xl sm:text-3xl font-black">Ta'limingiz uchun to'liq imkoniyat</h2><p className="mt-2 text-sm text-teal-50">Barcha fanlar, AI yordamchi va imtihon tayyorgarligi bitta obunada.</p></div><Crown className="w-10 h-10 text-amber-300" /></div>
      <div className="mt-6 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">{subscription.exempt ? "Siz uchun bepul" : isActive ? subscription.status === "trialing" ? "Sinov muddati faol" : "Obuna faol" : "Obuna faol emas"}</div>
    </section>
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-gray-900">Joriy holat</p><p className="mt-1 text-sm text-gray-500">{subscription.exempt ? "Administrator va o'qituvchi akkauntlarida Pro cheklovi yo'q." : formattedEnd ? `${subscription.status === "trialing" ? "Sinov" : "Obuna"} muddati: ${formattedEnd}` : "Obuna hali faollashtirilmagan."}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${isActive ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"}`}>{isActive ? "FAOL" : "MUDDAT TUGAGAN"}</span></div></section>
    {!subscription.exempt && <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h3 className="font-bold text-gray-900">LearnUp Pro tariflari</h3><p className="mt-1 text-sm text-gray-500">Uzoq muddatli tariflarda chegirma bor</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{(subscription.plans || [{ id: "monthly", label: "1 oy", priceUzs: subscription.priceUzs, months: 1 }]).map(p => <button key={p.id} onClick={() => setPlanId(p.id)} className={`rounded-xl border-2 p-3 text-left ${planId === p.id ? "border-teal-600 bg-teal-50" : "border-gray-100"}`}><p className="font-bold text-gray-900">{p.label}</p><p className="text-sm text-teal-700">{p.priceUzs.toLocaleString("uz-UZ")} so'm</p></button>)}</div><div className="mt-4 flex gap-2"><input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="Promo-kod" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm" /><button onClick={async () => { try { const r = await api.validatePromo(promoCode); setPromoNotice(`${r.percent}% chegirma qo'llanadi`); } catch (e) { setPromoNotice(e instanceof ApiError ? e.message : "Promo-kod noto'g'ri"); } }} className="rounded-xl bg-gray-100 px-3 text-sm font-bold text-gray-700">Tekshirish</button></div>{promoNotice && <p className="mt-2 text-xs text-teal-700">{promoNotice}</p>}<div className="mt-5 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">{["Barcha o'quv bo'limlariga kirish", "AI Yordamchi va tahlil", "Imtihonlarga tayyorgarlik", "Progress va mukofotlar"].map(item => <div key={item} className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-600" />{item}</div>)}</div>{paymentRef ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold">To'lov so'rovi qabul qilindi</p><p className="mt-1">Kod: <span className="font-mono font-bold">{paymentRef}</span>. Administrator to'lovni tasdiqlagach, obunangiz faollashadi.</p></div> : <button onClick={createPayment} disabled={creatingPayment} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"><CreditCard className="w-4 h-4" />{creatingPayment ? "So'rov yuborilmoqda..." : "Obunani faollashtirish"}</button>}{error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}</section>}
    <div className="flex items-center justify-center gap-2 text-xs text-gray-400"><ShieldCheck className="w-4 h-4" /> To'lov tasdiqlangach 30 kunlik Pro ochiladi.</div>
  </div>;
}

function SozlamalarPage({ userData, setUserData }: { userData: UserData; setUserData: React.Dispatch<React.SetStateAction<UserData>> }) {
  const [name, setName] = useState(userData.ism);
  const [family, setFamily] = useState(userData.familiya);
  const [email, setEmail] = useState(userData.email);
  const [sinf, setSinf] = useState(userData.sinf.split("-")[0] || "11");
  const [maktab, setMaktab] = useState(userData.maktab);
  const [univ, setUniv] = useState(userData.universitet);
  const [selFanlar, setSelFanlar] = useState<string[]>(userData.fanlar);
  const [notif, setNotif] = useState(userData.notif);
  const [dark, setDark] = useState(userData.dark);
  const [savedText, setSavedText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    setName(userData.ism);
    setFamily(userData.familiya);
    setEmail(userData.email);
    setSinf(userData.sinf.split("-")[0] || "11");
    setMaktab(userData.maktab);
    setUniv(userData.universitet);
    setSelFanlar(userData.fanlar);
    setNotif(userData.notif);
    setDark(userData.dark);
  }, [userData.ism, userData.familiya, userData.email, userData.sinf, userData.maktab, userData.universitet, userData.fanlar, userData.notif, userData.dark]);

  const fanlarList = ["Matematika", "Fizika", "Kimyo", "Biologiya", "Ingliz tili", "Ona tili", "Rus tili", "Informatika", "Tarix", "Geografiya"];
  const toggle = (f: string) => setSelFanlar(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  const recommended = [...selFanlar, ...fanlarList.filter(f => !selFanlar.includes(f)).slice(0, Math.max(0, 5 - selFanlar.length))].slice(0, 6);

  const handleSave = async () => {
    setSaving(true);
    setErrorText("");
    setSavedText("");
    try {
      const { user } = await api.updateMe({
        ism: name,
        familiya: family,
        email,
        sinf: `${sinf}-A sinf`,
        maktab,
        universitet: univ,
        fanlar: selFanlar,
        notif,
        dark,
      });
      setUserData(user);
      setSavedText("Sozlamalar saqlandi ✅");
    } catch (e) {
      setErrorText(e instanceof ApiError ? e.message : "Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ on, set }: { on: boolean; set: () => void }) => (
    <button onClick={set}
      className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors ${on ? "bg-teal-600" : "bg-gray-200"}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${on ? "left-6" : "left-1"}`} />
    </button>
  );

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Hisob ma'lumotlari</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Ism</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Familiya</label>
              <input value={family} onChange={(e) => setFamily(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Elektron pochta</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">O'quvchi sozlamalari</h3>
        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2.5 block">Sinf</label>
            <div className="flex gap-2 flex-wrap">
              {["7", "8", "9", "10", "11", "12"].map(s => (
                <button key={s} onClick={() => setSinf(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${sinf === s ? "bg-teal-600 text-white border-teal-600" : "border-gray-200 text-gray-600 hover:border-teal-400"}`}>
                  {s}-sinf
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Maktab</label>
            <input value={maktab} onChange={e => setMaktab(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Maqsad universitet</label>
            <input value={univ} onChange={e => setUniv(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2.5 block">O'qiyotgan fanlar</label>
            <div className="grid grid-cols-2 gap-2">
              {fanlarList.map(fan => (
                <button key={fan} onClick={() => toggle(fan)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                    selFanlar.includes(fan) ? "bg-teal-600 text-white border-teal-600" : "border-gray-200 text-gray-600 hover:border-teal-400"
                  }`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selFanlar.includes(fan) ? "bg-white border-white" : "border-gray-300"
                  }`}>
                    {selFanlar.includes(fan) && <Check className="w-3 h-3 text-teal-600" />}
                  </div>
                  {fan}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tavsiya */}
      <div className="bg-gradient-to-r from-teal-50 to-teal-100/50 rounded-2xl p-5 border border-teal-100">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-teal-800 text-sm">Sizga tavsiya etilgan fanlar</h3>
        </div>
        <p className="text-xs text-teal-600/70 mb-3">{univ} uchun zarur fanlar:</p>
        <div className="flex flex-wrap gap-2">
          {recommended.map(f => (
            <span key={f} className="text-xs bg-white text-teal-700 border border-teal-200 px-3 py-1.5 rounded-xl font-semibold">{f}</span>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Ilovalar sozlamasi</h3>
        <div className="space-y-3">
          {[
            { label: "Bildirishnomalar", desc: "Vazifa va dars eslatmalari",  on: notif, set: () => setNotif(v => !v) },
            { label: "Qorong'i rejim",   desc: "Ko'z uchun qulay qorong'i rejim", on: dark,  set: () => setDark(v => !v)  },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-gray-900">{s.label}</p>
                <p className="text-xs text-gray-400">{s.desc}</p>
              </div>
              <Toggle on={s.on} set={s.set} />
            </div>
          ))}
        </div>
      </div>

      {savedText && <div className="rounded-2xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-sm font-semibold text-teal-700">{savedText}</div>}
      {errorText && <div className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-600">{errorText}</div>}

      <button onClick={handleSave} disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-3.5 rounded-2xl font-bold transition-colors shadow-sm">
        {saving ? "Saqlanmoqda…" : "Saqlash"}
      </button>
    </div>
  );
}

// ─── AI Yordamchi Page ────────────────────────────────────────────────────────

type ChatMsg = { role: "user" | "assistant"; text: string };

function AIYordamchiPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", text: "Assalomu alaykum! Men LearnUp AI Yordamchisiman 🎓 O'zbekistondagi universitetlar, kirish imtihonlari va kasb tanlash bo'yicha savol bering." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    const newMessages: ChatMsg[] = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    try {
      const { reply } = await api.aiChat(text, messages);
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Kechirasiz, javob berishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring." }]);
    } finally {
      setSending(false);
    }
  }

  const suggestions = [
    "Toshkentda IT yo'nalishi bo'yicha qaysi universitetlar bor?",
    "Tibbiyot institutiga kirish uchun qanday fanlarni tayyorlashim kerak?",
    "Xorijiy universitet filiallari haqida ayting",
    "Samarqandda qanday universitetlar bor?",
  ];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Brain className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">AI Yordamchi</h2>
          <p className="text-xs text-gray-400">O'zbekiston universitetlari va OTMga kirish bo'yicha maslahatchi</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
              m.role === "user" ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-800 border border-gray-100"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-400">
              Yozmoqda…
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl font-semibold transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Savolingizni yozing…"
          className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button onClick={handleSend} disabled={sending || !input.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 rounded-2xl font-bold text-sm transition-colors">
          Yuborish
        </button>
      </div>
    </div>
  );
}

// ─── Admin Page (Qabul komissiyasi paneli) ────────────────────────────────────

type AdminStats = {
  totalUsers: number; totalTasksDone: number; totalTasks: number;
  totalUniversities: number; activeToday: number;
  topStudents: { id: number; ism: string; familiya: string; daraja: number; umumiy_xp: number }[];
  recentUsers: { id: number; ism: string; familiya: string; email: string; sinf: string; created_at: string }[];
};

type UniversityVM = { id: number; nom: string; shahar: string; turi: string; yonalishlar: string; vebsayt: string | null; tavsif: string | null };

function AdminPage() {
  const [tab, setTab] = useState<"stats" | "universities">("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [universities, setUniversities] = useState<UniversityVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUni, setShowAddUni] = useState(false);
  const [uniForm, setUniForm] = useState({ nom: "", shahar: "", turi: "davlat", yonalishlar: "", vebsayt: "" });
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([api.adminStats(), api.universities()]);
      setStats(s);
      setUniversities(u.universities);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleAddUniversity() {
    if (!uniForm.nom.trim()) return;
    setSaving(true);
    try {
      await api.createUniversity(uniForm);
      setShowAddUni(false);
      setUniForm({ nom: "", shahar: "", turi: "davlat", yonalishlar: "", vebsayt: "" });
      const { universities } = await api.universities();
      setUniversities(universities);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUniversity(id: number) {
    await api.deleteUniversity(id);
    setUniversities(prev => prev.filter(u => u.id !== id));
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-400 text-sm">Yuklanmoqda…</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex bg-gray-100 rounded-2xl p-1 w-fit gap-1">
        {(["stats", "universities"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t === "stats" ? "Statistika" : "Universitetlar"}
          </button>
        ))}
      </div>

      {tab === "stats" && stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "O'quvchilar", value: stats.totalUsers, icon: "🎓" },
              { label: "Bugun faol", value: stats.activeToday, icon: "🟢" },
              { label: "Bajarilgan vazifa", value: stats.totalTasksDone, icon: "✅" },
              { label: "Jami vazifa", value: stats.totalTasks, icon: "📋" },
              { label: "Universitetlar", value: stats.totalUniversities, icon: "🏛️" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-2xl mb-1.5">{s.icon}</div>
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Eng faol o'quvchilar</h3>
              <div className="space-y-2">
                {stats.topStudents.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-gray-800">{s.ism} {s.familiya}</span>
                    <span className="text-xs text-gray-400">Daraja {s.daraja}</span>
                    <span className="text-xs font-bold text-orange-500">⚡ {s.umumiy_xp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Yangi ro'yxatdan o'tganlar</h3>
              <div className="space-y-2">
                {stats.recentUsers.map((u) => (
                  <div key={u.id} className="p-2.5 bg-gray-50 rounded-xl">
                    <p className="text-sm font-semibold text-gray-800">{u.ism} {u.familiya}</p>
                    <p className="text-xs text-gray-400">{u.email} · {u.sinf || "sinf ko'rsatilmagan"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "universities" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Universitetlar bazasi ({universities.length})</h3>
            <button onClick={() => setShowAddUni(true)} className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Qo'shish
            </button>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {universities.map(u => (
              <div key={u.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{u.nom}</p>
                  <p className="text-xs text-gray-500">{u.shahar} · {u.turi}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{u.yonalishlar}</p>
                </div>
                <button onClick={() => handleDeleteUniversity(u.id)} className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 font-semibold">
                  O'chirish
                </button>
              </div>
            ))}
          </div>

          <InteractiveModal
            open={showAddUni}
            title="Yangi universitet qo'shish"
            subtitle="Universitetlar bazasiga yangi yozuv qo'shing"
            onClose={() => setShowAddUni(false)}
            footer={
              <div className="flex gap-3">
                <button onClick={() => setShowAddUni(false)} className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600">Bekor qilish</button>
                <button onClick={handleAddUniversity} disabled={saving} className="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Saqlanmoqda…" : "Saqlash"}
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nomi</label>
                <input value={uniForm.nom} onChange={(e) => setUniForm(f => ({ ...f, nom: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Shahar</label>
                  <input value={uniForm.shahar} onChange={(e) => setUniForm(f => ({ ...f, shahar: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">Turi</label>
                  <select value={uniForm.turi} onChange={(e) => setUniForm(f => ({ ...f, turi: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="davlat">Davlat</option>
                    <option value="xususiy">Xususiy</option>
                    <option value="xorijiy filial">Xorijiy filial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Yo'nalishlar (vergul bilan)</label>
                <input value={uniForm.yonalishlar} onChange={(e) => setUniForm(f => ({ ...f, yonalishlar: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="IT, Iqtisodiyot, ..." />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Veb-sayt</label>
                <input value={uniForm.vebsayt} onChange={(e) => setUniForm(f => ({ ...f, vebsayt: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="masalan.uz" />
              </div>
            </div>
          </InteractiveModal>
        </div>
      )}
    </div>
  );
}

// ─── Screen titles ────────────────────────────────────────────────────────────

const screenTitles: Record<Screen, string> = {
  home:       "Bosh sahifa",
  fanlar:     "Fanlar",
  vazifalar:  "Uy vazifalari",
  kalendar:   "Kalendar",
  dostlar:    "Do'stlar",
  "tez-yozish": "Tez yozish",
  mukofotlar: "Mukofotlar",
  profil:     "Profil",
  sozlamalar: "Sozlamalar",
  "ai-yordamchi": "AI Yordamchi",
  "imtihon-tayyorligi": "Imtihon tayyorlanish",
  "parent-dashboard": "Ota-onalar paneli",
  obuna:      "Pro obuna",
  admin:      "Admin panel",
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => (getToken() ? "loading" as AuthState : "login"));
  const [screen, setScreen] = useState<Screen>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserDataState] = useState<UserData>(() => loadSavedUser());
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Foydalanuvchi ma'lumotini o'zgartirganda backendga ham yozib qo'yamiz (Sozlamalar sahifasi uchun)
  function setUserData(updater: React.SetStateAction<UserData>) {
    setUserDataState((prev) => {
      const next = typeof updater === "function" ? (updater as (p: UserData) => UserData)(prev) : updater;
      try {
        localStorage.setItem("learnup.user", JSON.stringify(next));
      } catch (e) {
        // ignore storage errors
      }
      return next;
    });
  }

  // Sahifa ochilganda: token mavjud bo'lsa, sessiyani backenddan tiklaymiz
  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(({ user }: { user: UserData }) => {
        setUserDataState(user);
        setAuth(user.setupDone ? "app" : "setup");
      })
      .catch(() => {
        setToken(null);
        setAuth("login");
      });
  }, []);

  useEffect(() => {
    if (auth !== "app") return;
    api.subscription().then(({ subscription }) => {
      setSubscription(subscription);
      if (subscription.status === "expired" && !subscription.exempt) setScreen("obuna");
    }).catch(() => {});
  }, [auth]);

  function handleLogin(user: UserData) {
    setUserDataState(user);
    setAuth(user.setupDone ? "app" : "setup");
  }

  function handleRegister(user: UserData) {
    setUserDataState(user);
    setAuth(user.setupDone ? "app" : "setup");
  }

  function handleSetupComplete(user: UserData) {
    setUserDataState(user);
    setAuth("app");
  }

  function handleLogout() {
    setToken(null);
    setSubscription(null);
    setAuth("login");
  }

  function refreshUser() {
    api.me().then(({ user }: { user: UserData }) => setUserDataState(user)).catch(() => {});
  }

  if (auth === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-teal-600 font-semibold text-sm">Yuklanmoqda...</div>
      </div>
    );
  }
  if (auth === "login")    return <LoginPage    onLogin={handleLogin} onRegister={() => setAuth("register")} />;
  if (auth === "register") return <RegisterPage onRegister={handleRegister} onLogin={() => setAuth("login")} />;
  if (auth === "setup")    return <SetupWizard  onComplete={handleSetupComplete} />;

  const subscriptionRequired = subscription?.status === "expired" && !subscription.exempt;

  return (
    <LearnUpProvider onUserRefresh={refreshUser}>
      <div className="min-h-screen bg-background flex">
        <Sidebar
          screen={subscriptionRequired ? "obuna" : screen}
          setScreen={setScreen}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userData={userData}
        />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <Header title={screenTitles[subscriptionRequired ? "obuna" : screen]} onMenuClick={() => setSidebarOpen(true)} userData={userData} />
          <main className="flex-1 overflow-y-auto">
            {subscriptionRequired ? <SubscriptionPage subscription={subscription} /> : <>
            {screen === "home"       && <HomePage       setScreen={setScreen} userData={userData} />}
            {screen === "fanlar"     && <FanlarPage     />}
            {screen === "vazifalar"  && <VazifalarPage  />}
            {screen === "kalendar"   && <KalendarPage   />}
            {screen === "dostlar"    && <DostlarPage    />}
            {screen === "tez-yozish" && <TezYozishPage  />}
            {screen === "mukofotlar" && <MukofotlarPage userData={userData} />}
            {screen === "ai-yordamchi" && <AIYordamchiPage />}
            {screen === "imtihon-tayyorligi" && <ExamPrepPage />}
            {screen === "parent-dashboard" && <ParentDashboard childName={`${userData.ism} ${userData.familiya}`} childClass={userData.sinf} isParent={userData.role === "parent"} />}
            {screen === "obuna"      && <SubscriptionPage subscription={subscription} />}
            {screen === "profil"     && <ProfilPage     setScreen={setScreen} userData={userData} />}
            {screen === "sozlamalar" && <SozlamalarPage userData={userData} setUserData={setUserData} />}
            {screen === "admin" && userData.role === "admin" && <AdminPage />}
            </>}
          </main>
        </div>
      </div>
    </LearnUpProvider>
  );
}
