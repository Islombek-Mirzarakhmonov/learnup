import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLearnUp } from "../context/LearnUpContext";
import { api } from "../lib/api";
import { Clock, Target, ChevronRight, Play, CheckCircle2, AlertCircle, BarChart3 } from "lucide-react";

type ExamMode = "list" | "detail" | "taking" | "results";

export function ExamPrepPage() {
  const { exams, examStats, refreshExams, startExam: startExamRequest, submitExam: submitExamRequest, getExamResults } = useLearnUp();
  const [mode, setMode] = useState<ExamMode>("list");
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examResult, setExamResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Imtihon tafsilotlarini yuklash
  const loadExamDetail = async (examId: number) => {
    try {
      setLoading(true);
      const { exam, questions } = await api.examDetail(examId);
      setSelectedExam(exam);
      setExamQuestions(questions);
      setMode("detail");
    } catch (e) {
      alert("Imtihon yuklashda xatolik: " + (e as any).message);
    } finally {
      setLoading(false);
    }
  };

  // Imtihonni boshlash
  const startExam = async (examId: number) => {
    try {
      setLoading(true);
      await startExamRequest(examId);
      setMode("taking");
      setCurrentQuestion(0);
      setUserAnswers({});
      setTimeLeft(selectedExam.muddat * 60); // minutlarni sekundga o'tkazish
    } catch (e) {
      alert("Imtihon boshlanishida xatolik: " + (e as any).message);
    } finally {
      setLoading(false);
    }
  };

  // Timer
  useEffect(() => {
    if (mode !== "taking" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleSubmitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, timeLeft]);

  // Javobni o'zgartirish
  const handleAnswerChange = (questionId: number, answer: any) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Imtihonni yuborish
  const handleSubmitExam = async () => {
    if (!selectedExam || !Array.isArray(examQuestions)) return;

    const javoblar: Record<number, any> = {};
    examQuestions.forEach((q) => {
      javoblar[q.id] = userAnswers[q.id] || null;
    });

    try {
      setLoading(true);
      await submitExamRequest(selectedExam.id, javoblar);
      const results = await getExamResults(selectedExam.id);
      setExamResult(results);
      setMode("results");
    } catch (e) {
      alert("Yuborishdа xatolik: " + (e as any).message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === "list") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">📚 Imtihon Tayyorlanish</h1>
          <div className="text-sm bg-blue-100 text-blue-900 px-4 py-2 rounded">
            {examStats?.tugallangan_imtihonlar || 0} ta imtihon tugallandi
          </div>
        </div>

        {examStats && examStats.tugallangan_imtihonlar > 0 && (
          <div className="grid grid-cols-3 gap-4 bg-gradient-to-r from-blue-50 to-teal-50 p-4 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{examStats.o_rtacha_foiz}%</div>
              <div className="text-sm text-gray-600">O'rtacha foiz</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{examStats.eng_yuksak_foiz}%</div>
              <div className="text-sm text-gray-600">Eng yuksak foiz</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{examStats.qiyin_fanlar?.length || 0}</div>
              <div className="text-sm text-gray-600">Qiyin fanlar</div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {exams && exams.length > 0 ? (
            exams.map((exam: any) => (
              <motion.div
                key={exam.id}
                whileHover={{ x: 5 }}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition"
                onClick={() => loadExamDetail(exam.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{exam.nom}</h3>
                    <p className="text-sm text-gray-600">{exam.fan_nomi}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {exam.muddat} min
                      </span>
                      <span className={`px-2 py-1 rounded ${
                        exam.difficulty === "easy" ? "bg-green-100 text-green-800" :
                        exam.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {exam.difficulty === "easy" ? "Oson" : exam.difficulty === "medium" ? "O'rtacha" : "Qiyin"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400" />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">Imtihon topilmadi</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === "detail") {
    return (
      <div className="p-6 space-y-6">
        <button
          onClick={() => setMode("list")}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          ← Orqaga
        </button>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-bold mb-2">{selectedExam?.nom}</h2>
          <p className="text-gray-600 mb-4">{selectedExam?.tavsif}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              <div>
                <div className="text-sm text-gray-600">Vaqt</div>
                <div className="font-semibold">{selectedExam?.muddat} minut</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target size={20} className="text-green-600" />
              <div>
                <div className="text-sm text-gray-600">Savollar</div>
                <div className="font-semibold">{examQuestions?.length || 0}</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => startExam(selectedExam.id)}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            <Play size={20} /> Imtihonni Boshlash
          </button>
        </div>
      </div>
    );
  }

  if (mode === "taking" && selectedExam) {
    const question = examQuestions[currentQuestion];
    const variantlar = question?.variantlar ? (typeof question.variantlar === 'string' ? JSON.parse(question.variantlar) : question.variantlar) : [];
    const progress = ((currentQuestion + 1) / examQuestions.length) * 100;

    return (
      <div className="p-6 space-y-6">
        <div className="sticky top-0 bg-white p-4 rounded-lg shadow-sm z-10">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-semibold">Savol {currentQuestion + 1} / {examQuestions.length}</div>
            <div className={`text-lg font-bold ${timeLeft < 300 ? 'text-red-600' : 'text-gray-700'}`}>
              ⏱️ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {question && (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-6 border border-gray-200"
          >
            <h3 className="text-lg font-semibold mb-4">{question.savol_matn}</h3>

            <div className="space-y-3">
              {question.savol_turi === "single" && (
                <div className="space-y-2">
                  {variantlar.map((variant: string, i: number) => (
                    <label key={i} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50">
                      <input
                        type="radio"
                        name={`q${question.id}`}
                        checked={userAnswers[question.id] === variant}
                        onChange={() => handleAnswerChange(question.id, variant)}
                        className="w-4 h-4"
                      />
                      {variant}
                    </label>
                  ))}
                </div>
              )}

              {question.savol_turi === "multiple" && (
                <div className="space-y-2">
                  {variantlar.map((variant: string, i: number) => (
                    <label key={i} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={(userAnswers[question.id] || []).includes(variant)}
                        onChange={(e) => {
                          const current = userAnswers[question.id] || [];
                          if (e.target.checked) {
                            handleAnswerChange(question.id, [...current, variant]);
                          } else {
                            handleAnswerChange(question.id, current.filter((v: string) => v !== variant));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      {variant}
                    </label>
                  ))}
                </div>
              )}

              {question.savol_turi === "text" && (
                <input
                  type="text"
                  placeholder="Javobingizni yozing..."
                  value={userAnswers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              )}
            </div>
          </motion.div>
        )}

        <div className="flex justify-between gap-3">
          <button
            onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            ← Oldingi
          </button>

          {currentQuestion === examQuestions.length - 1 ? (
            <button
              onClick={handleSubmitExam}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
            >
              ✓ Imtihonni Yuborish
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion((q) => Math.min(examQuestions.length - 1, q + 1))}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              Keyingi →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === "results" && examResult) {
    const percentage = examResult.result.foiz;
    const passed = percentage >= 70;

    return (
      <div className="p-6 space-y-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-8 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg"
        >
          <div className={`text-6xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-orange-600'}`}>
            {percentage}%
          </div>
          <div className="text-2xl font-semibold mb-2">{examResult.result.jami_ball} / {examResult.result.maksimal_ball} ball</div>
            <div className="text-lg">{passed ? "✅ Tabriklaymiz! Siz o'tdingiz!" : "⚠️ Yana harakat qiling"}</div>
        </motion.div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} /> Tahlil
          </h3>
          <div className="space-y-4">
            {examResult.detailedResults?.map((r: any, i: number) => (
              <div key={r.id} className={`p-4 border rounded-lg ${r.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start gap-2 mb-2">
                  {r.correct ? (
                    <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle size={20} className="text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{i + 1}. {r.savol_matn}</p>
                    <p className="text-sm text-gray-700 mt-1">Sizning javobingiz: <strong>{r.user_javob || "Javob yo'q"}</strong></p>
                    {!r.correct && <p className="text-sm text-gray-700 mt-1">To'g'ri javob: <strong>{r.togri_javob}</strong></p>}
                    {r.izoh && <p className="text-sm text-gray-600 mt-2 italic">{r.izoh}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setMode("list")}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Orqaga
        </button>
      </div>
    );
  }

  return null;
}
