"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type BestRow = {
  user_id: string;
  best_score: number;
  last_played: string;
  rank: number;
  username?: string | null;
};

type AvgRow = {
  user_id: string;
  username?: string | null;
  avg_score: number;
  attempts: number;
  best_score: number;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [me, setMe] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [tab, setTab] = useState<"best" | "avg">("best");

  const [bestRows, setBestRows] = useState<BestRow[]>([]);
  const [avgRows, setAvgRows] = useState<AvgRow[]>([]);

  async function load() {
    setMsg("");
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }

    setMe(auth.user.id);

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .single();

    if (!profErr) setIsAdmin(profile?.role === "admin");

    const [bestRes, avgRes] = await Promise.all([
      supabase.rpc("quiz_leaderboard", { limit_count: 100 }),
      supabase.rpc("quiz_average_leaderboard", { limit_n: 100 }),
    ]);

    if (bestRes.error) {
      setMsg(bestRes.error.message);
      setBestRows([]);
    } else {
      setBestRows((bestRes.data ?? []) as BestRow[]);
    }

    if (avgRes.error) {
      if (!bestRes.error) setMsg(avgRes.error.message);
      setAvgRows([]);
    } else {
      setAvgRows(
        ((avgRes.data ?? []) as any[]).map((r) => ({
          user_id: r.user_id,
          username: r.username ?? null,
          avg_score: Number(r.avg_score),
          attempts: Number(r.attempts),
          best_score: Number(r.best_score),
        }))
      );
    }

    setLoading(false);
  }

  async function resetUser(userId: string) {
    const ok = confirm("Reset this user's leaderboard scores? This cannot be undone.");
    if (!ok) return;

    setMsg("");

    const { error } = await supabase.rpc("reset_user_quiz_scores", {
      target_user: userId,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Home
          </button>

          <button
            onClick={() => router.push("/")}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Play again
          </button>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-2 text-slate-600">
          {tab === "best"
            ? "Ranked by best score."
            : "Ranked by average score (includes attempts)."}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("best")}
            className={[
              "rounded-2xl px-5 py-2 text-sm font-semibold border",
              tab === "best"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            Best score
          </button>

          <button
            onClick={() => setTab("avg")}
            className={[
              "rounded-2xl px-5 py-2 text-sm font-semibold border",
              tab === "avg"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            Best average
          </button>
        </div>

        {msg && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {msg}
          </div>
        )}

        <div className="mt-8">
          {loading ? (
            <div className="text-slate-500">Loading…</div>
          ) : tab === "best" ? (
            bestRows.length === 0 ? (
              <div className="text-slate-500">No scores yet. Play a quiz first.</div>
            ) : (
              <div className="rounded-[36px] bg-white border border-slate-200 shadow-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-8 py-5 text-sm font-semibold text-slate-500 border-b border-slate-200">
                  <div className="col-span-2">Rank</div>
                  <div className="col-span-7">Player</div>
                  <div className="col-span-3 text-right">Best score</div>
                </div>

                {bestRows.map((r) => {
                  const isMeRow = me === r.user_id;

                  return (
                    <div
                      key={r.user_id}
                      className={[
                        "grid grid-cols-12 gap-2 px-8 py-5 border-b border-slate-100",
                        isMeRow ? "bg-slate-900 text-white" : "bg-white text-slate-900",
                      ].join(" ")}
                    >
                      <div className="col-span-2 font-bold">#{r.rank}</div>

                      <div className="col-span-7 font-semibold">
                        {isMeRow ? "You" : r.username ? r.username : "Player"}
                      </div>

                      <div className="col-span-3 text-right font-black">
                        <div className="flex items-center justify-end gap-3">
                          <span>{r.best_score}</span>

                          {isAdmin && !isMeRow && (
                            <button
                              onClick={() => resetUser(r.user_id)}
                              className={[
                                "rounded-full border px-4 py-2 text-sm font-semibold",
                                isMeRow
                                  ? "border-white/30 bg-transparent text-white hover:bg-white/10"
                                  : "border-red-300 bg-white text-red-600 hover:bg-red-50",
                              ].join(" ")}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : avgRows.length === 0 ? (
            <div className="text-slate-500">No scores yet. Play a quiz first.</div>
          ) : (
            // ✅ Option A + fade hints on BOTH sides (disappear after scrolling)
            <div className="rounded-[36px] bg-white border border-slate-200 shadow-xl overflow-hidden">
              <div className="relative">
                <div
                  className="overflow-x-auto"
                  data-scrolled="0"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    el.dataset.scrolled = el.scrollLeft > 4 ? "1" : "0";
                  }}
                >
                  {/* min width prevents header overlap; scrolling happens instead */}
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-12 gap-2 px-8 py-5 text-sm font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">
                      <div className="col-span-2">Rank</div>
                      <div className="col-span-5">Player</div>
                      <div className="col-span-2 text-right">Avg</div>
                      <div className="col-span-2 text-right">Attempts</div>
                      <div className="col-span-1 text-right">Best</div>
                    </div>

                    {avgRows
                      .slice()
                      .sort(
                        (a, b) =>
                          b.avg_score - a.avg_score || b.attempts - a.attempts
                      )
                      .map((r, i) => {
                        const isMeRow = me === r.user_id;

                        return (
                          <div
                            key={r.user_id}
                            className={[
                              "grid grid-cols-12 gap-2 px-8 py-5 border-b border-slate-100 whitespace-nowrap",
                              isMeRow
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-900",
                            ].join(" ")}
                          >
                            <div className="col-span-2 font-bold">#{i + 1}</div>

                            <div className="col-span-5 font-semibold">
                              {isMeRow ? "You" : r.username ? r.username : "Player"}
                            </div>

                            <div className="col-span-2 text-right font-black">
                              {Number.isFinite(r.avg_score)
                                ? r.avg_score.toFixed(2)
                                : "-"}
                            </div>

                            <div className="col-span-2 text-right font-black">
                              {r.attempts}
                            </div>

                            <div className="col-span-1 text-right font-black">
                              {r.best_score}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* ✅ Left fade hint (hidden once scrolled) */}
                  <div
                    className={[
                      "pointer-events-none absolute inset-y-0 left-0 w-10",
                      "bg-gradient-to-r from-white to-transparent",
                      "transition-opacity duration-200",
                      // hide when user has scrolled
                      "[[data-scrolled='1']_&]:opacity-0",
                    ].join(" ")}
                  />

                  {/* ✅ Right fade hint (hidden once scrolled) */}
                  <div
                    className={[
                      "pointer-events-none absolute inset-y-0 right-0 w-10",
                      "bg-gradient-to-l from-white to-transparent",
                      "transition-opacity duration-200",
                      // hide when user has scrolled
                      "[[data-scrolled='1']_&]:opacity-0",
                    ].join(" ")}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
