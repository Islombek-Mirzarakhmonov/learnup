import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../lib/api";

// Backenddan keladigan obyekt shakllari (App.tsx dagi UserData bilan mos)
export type SubjectVM = { id: number; nom: string; emoji: string; rang: string; foiz: number; baho: number; xp: number; vazifalar: number };
export type TaskVM = { id: number; fan: string; nom: string; tavsif: string | null; sana: string; muddat: string | null; holat: string; xp: number; muhim: boolean; tur: string };
export type EventVM = { id: number; sana: string; turi: string; label: string; rang: string };
export type FriendVM = { id: number; ism: string; sinf: string; xp: number; daraja: number; faoliyat: string; vaqt: string };
export type AchievementVM = { id: number; nom: string; desc: string; emoji: string; earned: boolean; progress: number };
export type LeaderboardRowVM = { o: number; ism: string; daraja: number; xp: number; me: boolean };
export type ExamVM = { id: number; nom: string; fan_nomi: string; fan_id?: number; tavsif?: string; muddat: number; difficulty: string; is_public: number; creator_id: number; savollar_hisob?: number; created_at: string };
export type ExamQuestionVM = { id: number; savol_matn: string; savol_turi: string; variantlar: string[]; ball: number; tartib: number };
export type ExamResultVM = { id: number; user_id: number; exam_id: number; jami_ball: number; maksimal_ball: number; foiz: number; vaqt_otkani: number; status: string; created_at: string; submitted_at?: string };

type LearnUpContextType = {
  subjects: SubjectVM[];
  tasks: TaskVM[];
  friends: FriendVM[];
  events: EventVM[];
  typingTexts: string[];
  achievements: AchievementVM[];
  leaderboard: LeaderboardRowVM[];
  exams: ExamVM[];
  examStats: { tugallangan_imtihonlar: number; o_rtacha_foiz: number; eng_yuksak_foiz: number; qiyin_fanlar: any[] };
  loading: boolean;

  refreshSubjects: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshFriends: () => Promise<void>;
  refreshAchievements: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  refreshEvents: (year: number, month: number) => Promise<void>;
  refreshExams: () => Promise<void>;
  refreshExamStats: () => Promise<void>;

  addTask: (data: { fan: string; nom: string; sana?: string; muddat?: string; xp?: number; muhim?: boolean }) => Promise<void>;
  completeTask: (id: number) => Promise<number>; // xpGained qaytaradi
  deleteTask: (id: number) => Promise<void>;

  addEvent: (data: { sana: string; turi: string; label: string; rang?: string }) => Promise<void>;

  addFriend: (email: string) => Promise<{ ok: boolean; error?: string }>;
  sendMessage: (friendId: number, text: string) => Promise<void>;
  sendChallenge: (friendId: number, text: string) => Promise<void>;

  submitTypingResult: (data: { mode: string; wpm: number; accuracy: number; duration?: number }) => Promise<number>;

  // Exam methods
  createExam: (data: { nom: string; fan_nomi: string; fan_id?: number; tavsif?: string; muddat?: number; difficulty?: string; is_public?: boolean; questions?: any[] }) => Promise<ExamVM>;
  startExam: (id: number) => Promise<any>;
  submitExam: (id: number, javoblar: Record<number, any>) => Promise<{ xpGained: number }>;
  getExamResults: (id: number) => Promise<any>;

  onXpGain: ((delta: { xp: number; coin?: number }) => void) | null;
};

const LearnUpContext = createContext<LearnUpContextType | null>(null);

export function useLearnUp() {
  const ctx = useContext(LearnUpContext);
  if (!ctx) throw new Error("useLearnUp faqat LearnUpProvider ichida ishlaydi");
  return ctx;
}

export function LearnUpProvider({ children, onUserRefresh }: { children: ReactNode; onUserRefresh?: () => void }) {
  const [subjects, setSubjects] = useState<SubjectVM[]>([]);
  const [tasks, setTasks] = useState<TaskVM[]>([]);
  const [friends, setFriends] = useState<FriendVM[]>([]);
  const [events, setEvents] = useState<EventVM[]>([]);
  const [typingTexts, setTypingTexts] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<AchievementVM[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRowVM[]>([]);
  const [exams, setExams] = useState<ExamVM[]>([]);
  const [examStats, setExamStats] = useState({ tugallangan_imtihonlar: 0, o_rtacha_foiz: 0, eng_yuksak_foiz: 0, qiyin_fanlar: [] });
  const [loading, setLoading] = useState(true);

  const refreshSubjects = useCallback(async () => {
    const { subjects } = await api.subjects();
    setSubjects(subjects);
  }, []);

  const refreshTasks = useCallback(async () => {
    const { tasks } = await api.tasks();
    setTasks(tasks);
  }, []);

  const refreshFriends = useCallback(async () => {
    const { friends } = await api.friends();
    setFriends(friends);
  }, []);

  const refreshAchievements = useCallback(async () => {
    const { achievements } = await api.achievements();
    setAchievements(achievements);
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    const { leaderboard } = await api.leaderboard();
    setLeaderboard(leaderboard);
  }, []);

  const refreshEvents = useCallback(async (year: number, month: number) => {
    const { events } = await api.events(year, month);
    setEvents(events);
  }, []);

  const refreshExams = useCallback(async () => {
    const { exams } = await api.exams();
    setExams(exams);
  }, []);

  const refreshExamStats = useCallback(async () => {
    const stats = await api.examStats();
    setExamStats(stats);
  }, []);

  useEffect(() => {
    const now = new Date();
    Promise.all([
      refreshSubjects(),
      refreshTasks(),
      refreshFriends(),
      refreshAchievements(),
      refreshLeaderboard(),
      refreshEvents(now.getFullYear(), now.getMonth() + 1),
      refreshExams(),
      refreshExamStats(),
      api.typingTexts().then(({ texts }: { texts: string[] }) => setTypingTexts(texts)),
    ])
      .catch((e) => console.error("LearnUp ma'lumotlarini yuklashda xatolik:", e))
      .finally(() => setLoading(false));
  }, [refreshSubjects, refreshTasks, refreshFriends, refreshAchievements, refreshLeaderboard, refreshEvents, refreshExams, refreshExamStats]);

  const addTask: LearnUpContextType["addTask"] = async (data) => {
    await api.createTask(data);
    await refreshTasks();
    await refreshSubjects();
  };

  const completeTask: LearnUpContextType["completeTask"] = async (id) => {
    const res = await api.completeTask(id);
    await refreshTasks();
    if (onUserRefresh) onUserRefresh();
    return res.xpGained || 0;
  };

  const deleteTask: LearnUpContextType["deleteTask"] = async (id) => {
    await api.deleteTask(id);
    await refreshTasks();
  };

  const addEvent: LearnUpContextType["addEvent"] = async (data) => {
    await api.createEvent(data);
    const d = new Date(data.sana);
    await refreshEvents(d.getFullYear(), d.getMonth() + 1);
  };

  const addFriend: LearnUpContextType["addFriend"] = async (email) => {
    try {
      await api.addFriend({ email });
      await refreshFriends();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Do'st qo'shishda xatolik" };
    }
  };

  const sendMessage: LearnUpContextType["sendMessage"] = async (friendId, text) => {
    await api.sendMessage(friendId, text);
  };

  const sendChallenge: LearnUpContextType["sendChallenge"] = async (friendId, text) => {
    await api.sendChallenge(friendId, text);
  };

  const submitTypingResult: LearnUpContextType["submitTypingResult"] = async (data) => {
    const res = await api.submitTypingResult(data);
    await refreshLeaderboard();
    if (onUserRefresh) onUserRefresh();
    return res.xpGained || 0;
  };

  const createExam: LearnUpContextType["createExam"] = async (data) => {
    const { exam } = await api.createExam(data);
    await refreshExams();
    return exam;
  };

  const startExam: LearnUpContextType["startExam"] = async (id) => {
    return await api.startExam(id);
  };

  const submitExam: LearnUpContextType["submitExam"] = async (id, javoblar) => {
    const res = await api.submitExam(id, javoblar);
    await refreshExams();
    await refreshExamStats();
    if (onUserRefresh) onUserRefresh();
    return { xpGained: res.xpGained || 0 };
  };

  const getExamResults: LearnUpContextType["getExamResults"] = async (id) => {
    return await api.examResults(id);
  };

  const value: LearnUpContextType = {
    subjects, tasks, friends, events, typingTexts, achievements, leaderboard, exams, examStats, loading,
    refreshSubjects, refreshTasks, refreshFriends, refreshAchievements, refreshLeaderboard, refreshEvents, refreshExams, refreshExamStats,
    addTask, completeTask, deleteTask, addEvent, addFriend, sendMessage, sendChallenge, submitTypingResult,
    createExam, startExam, submitExam, getExamResults,
    onXpGain: null,
  };

  return <LearnUpContext.Provider value={value}>{children}</LearnUpContext.Provider>;
}
