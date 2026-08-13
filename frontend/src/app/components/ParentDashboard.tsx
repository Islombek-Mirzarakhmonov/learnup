import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle, ArrowUpRight, BellRing, BookOpen, CheckCircle2,
  Clock3, MessageCircle, Send, Sparkles, TrendingUp, UserRound,
} from "lucide-react";
import { api } from "../lib/api";

type ParentDashboardProps = {
  childName: string;
  childClass: string;
  isParent?: boolean;
};

const subjects = [
  { name: "Matematika", progress: 88, color: "bg-teal-500", note: "+12% bu oy" },
  { name: "Ingliz tili", progress: 81, color: "bg-sky-500", note: "+8% bu oy" },
  { name: "Fizika", progress: 67, color: "bg-amber-500", note: "Qo'shimcha e'tibor" },
  { name: "Informatika", progress: 92, color: "bg-violet-500", note: "A'lo natija" },
];

export function ParentDashboard({ childName, childClass, isParent = false }: ParentDashboardProps) {
  const [message, setMessage] = useState("");
  const [childId, setChildId] = useState<number | null>(null);
  const [childEmail, setChildEmail] = useState("");
  const [liveDashboard, setLiveDashboard] = useState<any>(null);
  const [linkError, setLinkError] = useState("");
  const [linkNotice, setLinkNotice] = useState("");
  const [parentRequests, setParentRequests] = useState<any[]>([]);
  const [requestBusy, setRequestBusy] = useState<number | null>(null);
  const [linking, setLinking] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "Dilnoza Rahimova", role: "Matematika o'qituvchisi", text: "Islom bu hafta juda faol qatnashdi. Uy vazifasini vaqtida topshirdi.", time: "10:24", mine: false },
    { sender: "Siz", role: "", text: "Rahmat, uyda ham mashqlarini kuzatib boramiz.", time: "10:31", mine: true },
  ]);

  const today = useMemo(() => new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "long" }).format(new Date()), []);

  async function loadDashboard(id: number) {
    const data = await api.parentDashboard(id);
    setLiveDashboard(data);
  }

  useEffect(() => {
    if (!isParent) {
      api.incomingParentLinkRequests().then(({ requests }: any) => setParentRequests(requests || [])).catch(() => {});
      return;
    }
    api.parentChildren().then(({ children }: any) => {
      if (children?.[0]) { setChildId(children[0].id); return loadDashboard(children[0].id); }
    }).catch(() => setLinkError("Farzand ma'lumotlarini yuklab bo'lmadi"));
  }, [isParent]);

  async function respondToLinkRequest(requestId: number, status: "accepted" | "rejected") {
    setRequestBusy(requestId);
    try {
      await api.respondToParentLinkRequest(requestId, status);
      setParentRequests((requests) => requests.filter((request) => request.id !== requestId));
    } finally { setRequestBusy(null); }
  }

  async function linkChild() {
    if (!childEmail.trim()) return;
    setLinking(true); setLinkError(""); setLinkNotice("");
    try {
      const { child }: any = await api.linkChild(childEmail.trim());
      setChildEmail("");
      if (child) { setChildId(child.id); await loadDashboard(child.id); }
      else setLinkNotice("Tasdiqlash so'rovi farzandingizga yuborildi. U tasdiqlagach progress ochiladi.");
    } catch (error: any) { setLinkError(error?.message || "Bog'lashda xatolik yuz berdi"); }
    finally { setLinking(false); }
  }

  async function sendReminder() {
    if (!childId) return;
    await api.sendChildNotification(childId, { title: "Fizika vazifasi", body: "Juma kungi vazifani bajarishni eslatamiz.", type: "reminder" });
    setReminderSent(true);
  }

  const summary = liveDashboard?.summary;
  const displayedName = liveDashboard?.child ? `${liveDashboard.child.ism} ${liveDashboard.child.familiya || ""}`.trim() : childName;
  const displayedClass = liveDashboard?.child?.sinf || childClass;
  const displayedSubjects = liveDashboard?.subjects?.length ? liveDashboard.subjects.map((subject: any, index: number) => ({ ...subject, name: subject.name, progress: subject.progress, color: ["bg-teal-500", "bg-sky-500", "bg-amber-500", "bg-violet-500"][index % 4], note: `${subject.grade}/5 baho` })) : subjects;
  const concern = liveDashboard?.concerns?.[0];

  function sendMessage() {
    const text = message.trim();
    if (!text) return;
    setMessages((items) => [...items, { sender: "Siz", role: "", text, time: "Hozir", mine: true }]);
    setMessage("");
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 p-6 lg:p-8 text-white">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute right-32 bottom-0 h-20 w-20 rounded-full bg-cyan-300/20" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Jonli kuzatuv faol
            </div>
            <h2 className="text-2xl font-bold lg:text-3xl">{displayedName}ning o'quv jarayoni</h2>
            <p className="mt-2 text-sm text-teal-100">{displayedClass} · Ma'lumotlar hozir yangilandi · {today}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-teal-700 font-bold">IT</div>
            <div><p className="text-sm font-bold">Yaxshi sur'atda</p><p className="text-xs text-teal-100">Haftalik maqsadning 84%i</p></div>
          </div>
        </div>
      </section>

      {isParent && !childId && (
        <section className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm"><h3 className="font-bold text-gray-900">Farzand akkauntini bog'lang</h3><p className="mt-1 text-sm text-gray-500">O'quvchining LearnUp email manzilini kiriting. U bog'lanishni o'z akkauntida tasdiqlaydi.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={childEmail} onChange={(event) => setChildEmail(event.target.value)} type="email" placeholder="oquvchi@email.uz" className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" /><button disabled={linking} onClick={linkChild} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{linking ? "Bog'lanmoqda..." : "Bog'lash"}</button></div>{linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}{linkNotice && <p className="mt-2 text-sm text-teal-700">{linkNotice}</p>}</section>
      )}

      {!isParent && parentRequests.length > 0 && (
        <section className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm"><h3 className="font-bold text-gray-900">Ota-ona bog'lanish so'rovlari</h3><p className="mt-1 text-sm text-gray-500">Ma'lumotlaringiz faqat tasdiqlaganingizdan keyin ulashiladi.</p><div className="mt-4 space-y-3">{parentRequests.map((request) => <div key={request.id} className="flex flex-col gap-3 rounded-2xl bg-teal-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-gray-800">{request.ism} {request.familiya}</p><p className="text-xs text-gray-500">{request.email}</p></div><div className="flex gap-2"><button disabled={requestBusy === request.id} onClick={() => respondToLinkRequest(request.id, "rejected")} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600">Rad etish</button><button disabled={requestBusy === request.id} onClick={() => respondToLinkRequest(request.id, "accepted")} className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white">Tasdiqlash</button></div></div>)}</div></section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {[
          { label: "Haftalik faollik", value: summary ? `${summary.weeklyActivity}%` : "84%", detail: "Bajarilgan vazifalarga ko'ra", icon: TrendingUp, tone: "text-teal-600 bg-teal-50" },
          { label: "Bajarilgan vazifalar", value: summary ? `${summary.completedTasks} / ${summary.totalTasks}` : "11 / 13", detail: "Oxirgi 7 kun", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
          { label: "O'quv vaqti", value: summary ? `${summary.studyMinutes} daq` : "8 soat 40 daq", detail: "Oxirgi 7 kun", icon: Clock3, tone: "text-sky-600 bg-sky-50" },
          { label: "O'rtacha baho", value: summary ? String(summary.averageGrade) : "4.6", detail: "5 ballik tizimda", icon: Sparkles, tone: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-gray-500">{label}</p><div className={`rounded-xl p-2 ${tone}`}><Icon className="h-4 w-4" /></div></div>
            <p className="mt-3 text-xl font-bold text-gray-900 lg:text-2xl">{value}</p><p className="mt-1 text-xs text-gray-400">{detail}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold text-gray-900">Fanlar bo'yicha progress</h3><p className="mt-1 text-sm text-gray-400">Joriy oydagi o'zlashtirish darajasi</p></div><button className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">Batafsil <ArrowUpRight className="h-4 w-4" /></button></div>
          <div className="space-y-5">{displayedSubjects.map((subject: any) => <div key={subject.name}><div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-gray-700">{subject.name}</span><span className="font-bold text-gray-900">{subject.progress}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-gray-100"><motion.div initial={{ width: 0 }} animate={{ width: `${subject.progress}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${subject.color}`} /></div><p className={`mt-1.5 text-xs ${subject.progress < 70 ? "text-amber-600" : "text-gray-400"}`}>{subject.note}</p></div>)}</div>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><BellRing className="h-5 w-5" /></div><div><h3 className="font-bold text-gray-900">E'tibor talab qiladi</h3><p className="text-xs text-amber-700">1 ta yangi tavsiya</p></div></div>
          <div className="mt-5 rounded-2xl bg-white p-4"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><div><p className="text-sm font-bold text-gray-800">{concern ? `${concern.subject}: ${concern.task}` : "Fizika: 2 ta vazifa qolgan"}</p><p className="mt-1 text-xs leading-5 text-gray-500">{concern ? "Muddatdan o'tgan vazifa. Farzandingiz bilan reja tuzishni tavsiya qilamiz." : "Juma kuni muddat tugaydi. 30 daqiqalik takrorlash rejasini tavsiya qilamiz."}</p></div></div><button onClick={sendReminder} disabled={isParent && !childId} className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-60">{reminderSent ? "Eslatma yuborildi" : "Eslatma yuborish"}</button></div>
          <p className="mt-4 text-center text-xs text-gray-500">Bildirishnomalar sizga haftasiga bir marta yuboriladi.</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-5">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between"><div><h3 className="font-bold text-gray-900">Haftalik hisobot</h3><p className="mt-1 text-sm text-gray-400">5–11 avgust</p></div><BookOpen className="h-5 w-5 text-teal-600" /></div>
          <div className="mt-5 space-y-3">{[["Darslarda qatnashish", "100%"], ["Uy vazifasi topshirilishi", "85%"], ["Test natijalari", "89%"]].map(([name, value]) => <div key={name} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3"><span className="text-sm font-medium text-gray-600">{name}</span><span className="text-sm font-bold text-teal-700">{value}</span></div>)}</div>
          <button className="mt-4 w-full rounded-xl border border-teal-200 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-50">Hisobotni yuklab olish</button>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm xl:col-span-3">
          <div className="flex items-center gap-3 border-b border-gray-100 p-5"><div className="rounded-xl bg-teal-50 p-2.5 text-teal-600"><MessageCircle className="h-5 w-5" /></div><div className="flex-1"><h3 className="font-bold text-gray-900">O'qituvchi bilan xabarlar</h3><p className="text-xs text-gray-400">Dilnoza Rahimova hozir onlayn</p></div><UserRound className="h-5 w-5 text-gray-300" /></div>
          <div className="max-h-56 space-y-3 overflow-y-auto p-5">{messages.map((item, index) => <div key={`${item.time}-${index}`} className={`flex ${item.mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${item.mine ? "rounded-br-md bg-teal-600 text-white" : "rounded-bl-md bg-gray-100 text-gray-700"}`}><p className={`text-xs font-bold ${item.mine ? "text-teal-100" : "text-gray-500"}`}>{item.mine ? "Siz" : item.sender}</p><p className="mt-1 text-sm leading-5">{item.text}</p><p className={`mt-1 text-right text-[10px] ${item.mine ? "text-teal-100" : "text-gray-400"}`}>{item.time}</p></div></div>)}</div>
          <div className="flex gap-2 border-t border-gray-100 p-4"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder="O'qituvchiga xabar yozing..." className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /><button onClick={sendMessage} aria-label="Xabar yuborish" className="rounded-xl bg-teal-600 p-2.5 text-white transition hover:bg-teal-700"><Send className="h-5 w-5" /></button></div>
        </div>
      </section>
    </div>
  );
}
