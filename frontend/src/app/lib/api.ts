// LearnUp backend bilan ishlaydigan yengil API klient.
// Barcha so'rovlar shu yerdan o'tadi — token avtomatik qo'shiladi.

// Developmentda Vite proxy CORS muammosisiz backendga uzatadi.
// Productionda VITE_API_URL berilmasa, backend bilan bitta domen ostidagi /api ishlatiladi.
const API_URL = (import.meta as any).env?.VITE_API_URL || "/api";

const TOKEN_KEY = "learnup.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(data?.error || `So'rov bajarilmadi (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  // Auth
  register: (body: { ism: string; familiya: string; email: string; password: string; role?: "student" | "parent" | "teacher" }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  setup: (body: { yosh?: string; sinf?: string; maktab?: string; fanlar?: string[]; universitet?: string }) =>
    request("/auth/setup", { method: "POST", body: JSON.stringify(body) }),

  // Pro obuna
  subscription: () => request("/subscription/me"),
  validatePromo: (code: string) => request("/subscription/promo/validate", { method: "POST", body: JSON.stringify({ code }) }),
  createSubscriptionPayment: (body: { planId?: string; promoCode?: string; provider?: "manual" | "click" | "payme" } = {}) => request("/subscription/payments", { method: "POST", body: JSON.stringify(body) }),

  // User / settings
  updateMe: (body: Record<string, unknown>) => request("/users/me", { method: "PUT", body: JSON.stringify(body) }),
  notifications: () => request("/users/notifications"),
  readNotification: (id: number) => request(`/users/notifications/${id}/read`, { method: "PATCH" }),

  // Subjects
  subjects: () => request("/subjects"),
  subject: (id: number | string) => request(`/subjects/${id}`),

  // Tasks
  tasks: (tur?: string) => request(`/tasks${tur ? `?tur=${tur}` : ""}`),
  createTask: (body: { fan: string; nom: string; sana?: string; muddat?: string; xp?: number; muhim?: boolean }) =>
    request("/tasks", { method: "POST", body: JSON.stringify(body) }),
  completeTask: (id: number) => request(`/tasks/${id}/complete`, { method: "PATCH" }),
  deleteTask: (id: number) => request(`/tasks/${id}`, { method: "DELETE" }),

  // Calendar
  events: (year?: number, month?: number) =>
    request(`/calendar${year && month ? `?year=${year}&month=${month}` : ""}`),
  createEvent: (body: { sana: string; turi: string; label: string; rang?: string }) =>
    request("/calendar", { method: "POST", body: JSON.stringify(body) }),

  // Friends
  friends: () => request("/friends"),
  searchFriends: (q: string) => request(`/friends/search?q=${encodeURIComponent(q)}`),
  addFriend: (body: { friendId?: number; email?: string }) =>
    request("/friends", { method: "POST", body: JSON.stringify(body) }),
  friendProfile: (id: number) => request(`/friends/${id}`),
  friendMessages: (id: number) => request(`/friends/${id}/messages`),
  sendMessage: (id: number, text: string) =>
    request(`/friends/${id}/messages`, { method: "POST", body: JSON.stringify({ text }) }),
  sendChallenge: (id: number, text: string) =>
    request(`/friends/${id}/challenge`, { method: "POST", body: JSON.stringify({ text }) }),

  // Typing
  typingTexts: () => request("/typing/texts"),
  submitTypingResult: (body: { mode: string; wpm: number; accuracy: number; duration?: number }) =>
    request("/typing/results", { method: "POST", body: JSON.stringify(body) }),
  typingLeaderboard: () => request("/typing/leaderboard"),

  // Achievements & leaderboard
  achievements: () => request("/achievements"),
  leaderboard: () => request("/leaderboard"),

  // AI check
  aiCheck: (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return request("/ai/check", { method: "POST", body: form });
  },
  aiChat: (message: string, history?: { role: string; text: string }[]) =>
    request("/ai/chat", { method: "POST", body: JSON.stringify({ message, history }) }),

  // Universitetlar
  universities: (params?: { q?: string; shahar?: string; turi?: string }) => {
    const qs = params
      ? "?" + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
      : "";
    return request(`/universities${qs}`);
  },
  createUniversity: (body: { nom: string; shahar?: string; turi?: string; yonalishlar?: string; vebsayt?: string; tavsif?: string }) =>
    request("/universities", { method: "POST", body: JSON.stringify(body) }),
  updateUniversity: (id: number, body: Record<string, unknown>) =>
    request(`/universities/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUniversity: (id: number) => request(`/universities/${id}`, { method: "DELETE" }),

  // Admin
  adminStats: () => request("/admin/stats"),
  adminUsers: (q?: string) => request(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  // Imtihon tayyorlanish
  exams: (params?: { fan_id?: number; difficulty?: string; q?: string }) => {
    const qs = params
      ? "?" + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
      : "";
    return request(`/exams${qs}`);
  },
  examDetail: (id: number) => request(`/exams/${id}`),
  createExam: (body: { nom: string; fan_nomi: string; fan_id?: number; tavsif?: string; muddat?: number; difficulty?: string; is_public?: boolean; questions?: any[] }) =>
    request("/exams", { method: "POST", body: JSON.stringify(body) }),
  startExam: (id: number) => request(`/exams/${id}/start`, { method: "POST" }),
  submitExam: (id: number, javoblar: Record<number, any>) =>
    request(`/exams/${id}/submit`, { method: "POST", body: JSON.stringify({ javoblar }) }),
  examResults: (id: number) => request(`/exams/${id}/results`),
  examStats: () => request("/exams/stats/overview"),

  // Ota-onalar paneli
  parentChildren: () => request("/parent/children"),
  linkChild: (childEmail: string) => request("/parent/children", { method: "POST", body: JSON.stringify({ childEmail }) }),
  incomingParentLinkRequests: () => request("/parent/link-requests/incoming"),
  respondToParentLinkRequest: (requestId: number, status: "accepted" | "rejected") =>
    request(`/parent/link-requests/${requestId}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  parentDashboard: (childId: number) => request(`/parent/children/${childId}/dashboard`),
  sendChildNotification: (childId: number, body: { title: string; body?: string; type?: string }) =>
    request(`/parent/children/${childId}/notifications`, { method: "POST", body: JSON.stringify(body) }),
  parentTeachers: () => request("/parent/teachers"),
  parentTeacherMessages: (teacherId: number) => request(`/parent/teachers/${teacherId}/messages`),
  sendParentTeacherMessage: (teacherId: number, text: string) =>
    request(`/parent/teachers/${teacherId}/messages`, { method: "POST", body: JSON.stringify({ text }) }),
};

export { ApiError };
