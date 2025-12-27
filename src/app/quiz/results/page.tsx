"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type QuizReviewItem = {
  cardId: string;
  promptEnglish: string;
  promptLao: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
};

type QuizResultsPayload = {
  createdAt: string;
  secPerQ: number;
  totalQuestions: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  items: QuizReviewItem[];
};

export default function QuizResultsPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResultsPayload | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      const raw = sessionStorage.getItem("quizResults");
      if (!raw) {
        // If user refreshes later / opens directly, send them somewhere sensible
        router.push("/quiz");
        return;
      }

      try {
        const parsed = JSON.parse(raw) as QuizResultsPayload;
        setResults(parsed);
      } catch {
        router.push("/quiz");
        return;
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !results) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-10 text-slate-500">
          Loading…
        </div>
      </main>
    );
  }

  function pill(text: string, kind: "good" | "bad" | "neutral") {
    const cls =
      kind === "good"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : kind === "bad"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-white text-slate-700";

    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
        {text}
      </span>
    );
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

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/leaderboard")}
              className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Leaderboard
            </button>

            <button
                onClick={() => {
                    sessionStorage.removeItem("quizResults");

                    // start a fresh attempt (needed by your quiz page timer logic)
                    sessionStorage.setItem("quizStartAt", String(Date.now()));

                    router.push("/quiz");
                }}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                >
                Play again
            </button>

          </div>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Quiz Results</h1>
        <p className="mt-2 text-slate-600">
          Score breakdown (+5 correct, −1 wrong, 0 blank)
        </p>

        {/* Summary card */}
        <div className="mt-8 rounded-[32px] bg-white border border-slate-200 shadow px-8 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-500">Your score</div>
              <div className="mt-1 text-5xl font-black">{results.score}</div>
              <div className="mt-2 text-sm text-slate-500">
                {new Date(results.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {pill(`✅ Correct: ${results.correctCount}`, "good")}
              {pill(`❌ Wrong: ${results.wrongCount}`, "bad")}
              {pill(`➖ Blank: ${results.blankCount}`, "neutral")}
              {pill(`Total: ${results.totalQuestions}`, "neutral")}
            </div>
          </div>
        </div>

        {/* Review list */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Review</h2>
          <div className="mt-4 grid gap-4">
            {results.items.map((it, i) => {
              const isBlank = it.selectedIndex === null;
              const isCorrect = !isBlank && it.selectedIndex === it.correctIndex;
              const pickedText = isBlank ? null : it.options[it.selectedIndex!];
              const correctText = it.options[it.correctIndex];

              return (
                <div
                  key={`${it.cardId}-${i}`}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-500">
                        Question {i + 1}
                      </div>
                      <div className="mt-1 text-2xl font-semibold">
                        {it.promptEnglish}
                      </div>
                      <div className="mt-1 text-slate-600">{it.promptLao}</div>
                    </div>

                    <div>
                      {isBlank
                        ? pill("Blank", "neutral")
                        : isCorrect
                        ? pill("Correct", "good")
                        : pill("Wrong", "bad")}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2">
                    <div className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">Your answer:</span>{" "}
                      {isBlank ? (
                        <span className="italic text-slate-500">No answer</span>
                      ) : (
                        <span className={isCorrect ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                          {pickedText}
                        </span>
                      )}
                    </div>

                    {!isCorrect && (
                      <div className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">Correct answer:</span>{" "}
                        <span className="text-emerald-700 font-semibold">{correctText}</span>
                      </div>
                    )}
                  </div>

                  {/* Optional: show all options */}
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {it.options.map((opt, oi) => {
                      const isPicked = it.selectedIndex === oi;
                      const isAnswer = it.correctIndex === oi;

                      const cls = isAnswer
                        ? "border-emerald-200 bg-emerald-50"
                        : isPicked
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white";

                      return (
                        <div
                          key={`${it.cardId}-${oi}`}
                          className={`rounded-xl border px-4 py-3 text-sm ${cls}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold">{opt}</div>
                            <div className="text-xs font-semibold text-slate-600">
                              {isAnswer ? "Correct" : isPicked ? "You chose" : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/decks")}
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Study decks
          </button>
          <button
            onClick={() => {
                sessionStorage.removeItem("quizResults");

                // start a fresh attempt (needed by your quiz page timer logic)
                sessionStorage.setItem("quizStartAt", String(Date.now()));

                router.push("/quiz");
            }}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
            Take another quiz
            </button>

        </div>
      </div>
    </main>
  );
}
