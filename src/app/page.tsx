"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isAdminEmail } from "@/lib/is-admin";

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [showQuizIntro, setShowQuizIntro] = useState(false);
  const [msg, setMsg] = useState("");

  async function startQuiz() {
    setMsg("");

    // Optional: block if not logged in
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }

    // Timer starts HERE (not on quiz page load)
    sessionStorage.setItem("quizStartAt", String(Date.now()));
    sessionStorage.setItem("quizQs", "15");
    sessionStorage.setItem("quizSecPerQ", "3");

    router.push("/quiz");
  }

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      // ✅ SET ADMIN FLAG HERE
      setIsAdmin(isAdminEmail(auth.user.email));

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-10 text-slate-500">
          Loading…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-sm text-slate-500">LAO3101S Flashcards</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Ready to learn Lao? 🇱🇦
        </h1>
        <p className="mt-3 text-slate-600">
          Choose a mode to start studying.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {/* Study by Deck */}
          <button
            onClick={() => router.push("/decks")}
            className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="text-xl font-semibold text-slate-900">
              Study by Deck
            </div>
            <div className="mt-2 text-slate-600">
              Pick a deck and study card-by-card.
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-700 group-hover:text-slate-900">
              Go →
            </div>
          </button>

          {/* Study all at once */}
          <button
            disabled
            className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm opacity-50 cursor-not-allowed"
          >
            <div className="text-xl font-semibold text-slate-900">
              Study all at once
            </div>
            <div className="mt-2 text-slate-600">
              Mix all decks into one big session.
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-700 group-hover:text-slate-900">
              Coming Soon
            </div>
          </button>

          {/* Test */}
          <button
            onClick={() => setShowQuizIntro(true)}
            className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="text-xl font-semibold text-slate-900">Test</div>
            <div className="mt-2 text-slate-600">
              Quiz mode with scoring.
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-700 group-hover:text-slate-900">
              Go →
            </div>
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => router.push("/leaderboard")}
            className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="text-xl font-semibold text-slate-900">
              Leaderboard
            </div>
            <div className="mt-2 text-slate-600">
              Check your ranking among your friends.
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-700 group-hover:text-slate-900">
              Go →
            </div>
          </button>
        </div>

        <div className="mt-10 flex gap-3">
          {/* ✅ ONLY SHOW ADMIN IF ADMIN */}
          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              Admin
            </button>
          )}

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Logout
          </button>
        </div>
      </div>

      {showQuizIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Quiz rules</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                  • 15 random questions from all cards<br />
                  • 3 seconds per question<br />
                  • Point System: +5 correct, −1 wrong, 0 blank<br />
                  • Ends automatically when time is up<br />
                  • Time starts when you click on "Start Quiz" GOOD LUCK!
                </div>
              </div>

              <button
                onClick={() => setShowQuizIntro(false)}
                className="rounded-full border px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowQuizIntro(false)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={startQuiz}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
