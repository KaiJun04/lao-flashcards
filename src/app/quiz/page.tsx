"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type QuizCard = {
  id: string;
  english: string;
  lao: string;
  roman: string | null;
  audio_url: string | null;
};

type MCQQuestion = {
  card: QuizCard;
  options: string[];
  correctIndex: number;
};

type QuizReviewItem = {
  cardId: string;
  promptEnglish: string;
  promptLao: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
};

type QuizResultsPayload = {
  createdAt: string; // ISO
  secPerQ: number;
  totalQuestions: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  items: QuizReviewItem[];
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const DEFAULT_QS = 15;
  const DEFAULT_SEC_PER_Q = 3;
  const CHOICES = 4;

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [canRun, setCanRun] = useState(false);
  const [finished, setFinished] = useState(false);

  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>([]);

  const [timeLeft, setTimeLeft] = useState(DEFAULT_QS * DEFAULT_SEC_PER_Q);
  const timerRef = useRef<number | null>(null);

  const qs =
    typeof window !== "undefined"
      ? Number(sessionStorage.getItem("quizQs") ?? DEFAULT_QS) || DEFAULT_QS
      : DEFAULT_QS;

  const secPerQ =
    typeof window !== "undefined"
      ? Number(sessionStorage.getItem("quizSecPerQ") ?? DEFAULT_SEC_PER_Q) ||
        DEFAULT_SEC_PER_Q
      : DEFAULT_SEC_PER_Q;

  const currentQ = questions[idx];
  const totalTime =
    questions.length > 0 ? questions.length * secPerQ : qs * secPerQ;

  const pctLeft = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  const isLow = pctLeft <= 20;

  const minutes = Math.max(0, Math.floor(timeLeft / 60));
  const seconds = Math.max(0, timeLeft % 60);

  async function load() {
    setMsg("");
    setLoading(true);

    const startAtRaw = sessionStorage.getItem("quizStartAt");
    if (!startAtRaw) {
      setMsg("Please start the quiz from Home → Test → Start Quiz.");
      setCanRun(false);
      setLoading(false);
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }

    setCanRun(true);

    const poolSize = Math.max(qs * 4, qs);
    const { data, error } = await supabase.rpc("random_cards", {
      limit_count: poolSize,
    });

    if (error) {
      setMsg(error.message);
      setQuestions([]);
      setSelected([]);
      setLoading(false);
      return;
    }

    const pool = (data ?? []) as QuizCard[];
    if (pool.length === 0) {
      setMsg("No cards found yet.");
      setQuestions([]);
      setSelected([]);
      setLoading(false);
      return;
    }

    const qCards = pool.slice(0, Math.min(qs, pool.length));
    const distractorPool =
      pool.length > qCards.length ? pool.slice(qCards.length) : pool;

    const built = qCards
      .map((card) => {
        const correct = (card.roman ?? "").trim();
        if (!correct) return null;

        const seen = new Set<string>([correct.toLowerCase()]);

        const candidates = shuffle(distractorPool)
          .map((c) => (c.roman ?? "").trim())
          .filter((r) => r && !seen.has(r.toLowerCase()));

        const wrongs: string[] = [];
        for (const r of candidates) {
          if (wrongs.length >= CHOICES - 1) break;
          seen.add(r.toLowerCase());
          wrongs.push(r);
        }

        const optionsRaw = shuffle([correct, ...wrongs]);
        const correctIndex = optionsRaw.findIndex(
          (x) => x.toLowerCase() === correct.toLowerCase()
        );

        return { card, options: optionsRaw, correctIndex };
      })
      .filter(Boolean) as MCQQuestion[];

    if (built.length === 0) {
      setMsg(
        "No cards with romanisation found yet. Add romanisation to your cards first."
      );
      setQuestions([]);
      setSelected([]);
      setLoading(false);
      return;
    }

    setQuestions(built);
    setSelected(Array(built.length).fill(null));
    setIdx(0);

    // ✅ Fix: elapsed time must never be negative (prevents timer jumping up to 1:45)
    const startAt = Number(startAtRaw);
    const elapsedSec = Math.max(0, Math.floor((Date.now() - startAt) / 1000));

    // ✅ Also clamp timeLeft so it never exceeds the full quiz time
    const total = built.length * secPerQ;
    setTimeLeft(Math.max(0, Math.min(total, total - elapsedSec)));

    setFinished(false);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canRun || loading || finished || questions.length === 0) return;

    if (timerRef.current) clearInterval(timerRef.current);

    // ✅ Fix: never tick below 0
    timerRef.current = window.setInterval(
      () => setTimeLeft((t) => Math.max(0, t - 1)),
      1000
    );

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [canRun, loading, finished, questions.length]);

  useEffect(() => {
    if (canRun && !loading && !finished && timeLeft <= 0) {
      finalizeAndGoResults("time");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, canRun, loading, finished]);

  function choose(optionIndex: number) {
    setSelected((prev) => {
      const copy = [...prev];
      copy[idx] = optionIndex;
      return copy;
    });
  }

  function next() {
    if (idx >= questions.length - 1) {
      finalizeAndGoResults("finish");
      return;
    }
    setIdx((i) => i + 1);
  }

  function prev() {
    setIdx((i) => Math.max(0, i - 1));
  }

  function computeResults(): QuizResultsPayload {
    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    const items: QuizReviewItem[] = questions.map((q, i) => {
      const pick = selected[i] ?? null;

      if (pick === null) {
        blankCount += 1;
      } else if (pick === q.correctIndex) {
        score += 5;
        correctCount += 1;
      } else {
        score += -1;
        wrongCount += 1;
      }

      return {
        cardId: q.card.id,
        promptEnglish: q.card.english,
        promptLao: q.card.lao,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex: pick,
      };
    });

    return {
      createdAt: new Date().toISOString(),
      secPerQ,
      totalQuestions: questions.length,
      score,
      correctCount,
      wrongCount,
      blankCount,
      items,
    };
  }

  async function finalizeAndGoResults(_reason: "time" | "finish" | "manual") {
    if (finished) return;
    setFinished(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const results = computeResults();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }

    await supabase.from("quiz_scores").insert({
      user_id: auth.user.id,
      score: results.score,
    });

    sessionStorage.setItem("quizResults", JSON.stringify(results));
    sessionStorage.removeItem("quizStartAt");

    router.push("/quiz/results");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-6">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Home
          </button>

          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
            ⏱ {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-semibold">Quiz</h1>
        <p className="mt-2 text-slate-600">
          {questions.length > 0 ? `Question ${idx + 1} / ${questions.length}` : ""}
        </p>

        {canRun && (
          <div className="mt-5">
            <div className="mt-2 h-3 w-full rounded-full border border-slate-200 bg-white overflow-hidden">
              <div
                className={[
                  "h-full rounded-full transition-[width] duration-300",
                  isLow ? "bg-red-500" : "bg-slate-900",
                ].join(" ")}
                style={{ width: `${pctLeft}%` }}
              />
            </div>
          </div>
        )}

        {msg && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {msg}
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="text-slate-500">Loading…</div>
          ) : !canRun ? (
            <div className="mt-6">
              <button
                onClick={() => router.push("/")}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              >
                Back to Home
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-slate-500">No cards available.</div>
          ) : (
            <>
              {/* Question card */}
              <div className="rounded-[32px] bg-white border border-slate-200 shadow px-8 py-8">
                <div className="text-sm font-semibold text-slate-500">
                  Choose the pronunciation (romanisation)
                </div>

                <div className="mt-2 text-3xl font-semibold">
                  {currentQ?.card.english}
                </div>

                {/* Options */}
                <div className="mt-6 grid gap-3">
                  {currentQ?.options.map((opt, optionIndex) => {
                    const picked = selected[idx] === optionIndex;
                    return (
                      <button
                        key={`${currentQ.card.id}-${optionIndex}`}
                        onClick={() => choose(optionIndex)}
                        className={[
                          "w-full text-left rounded-2xl border px-5 py-4 text-base",
                          picked
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-semibold">{opt}</div>
                          {picked && (
                            <div className="text-xs font-semibold opacity-90">
                              Selected
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  <div className="mt-1 text-xs text-slate-500">
                    +5 correct, −1 wrong, 0 blank.
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={prev}
                    disabled={idx === 0}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Back
                  </button>

                  <button
                    onClick={next}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    {idx === questions.length - 1 ? "Finish" : "Next"}
                  </button>
                </div>

                <button
                  onClick={() => finalizeAndGoResults("manual")}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                >
                  End quiz now
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
