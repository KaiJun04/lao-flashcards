"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const input = emailOrUsername.trim().toLowerCase();

    let email = input;

    // If user typed username, resolve to email
    if (!input.includes("@")) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", input)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return setErr("Invalid email or username.");
      }

      const { data: userData } = await supabase.auth.admin.getUserById(
        data.id
      );

      if (!userData?.user?.email) {
        setLoading(false);
        return setErr("Invalid email or username.");
      }

      email = userData.user.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) return setErr(error.message);

    router.push("/");
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      {/* Top bar */}
      <header className="px-6 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-neutral-600">LAO3101S Flashcards</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              Welcome back!
            </div>
          </div>
          <a
            href="/signup"
            className="text-sm font-semibold text-neutral-900 hover:opacity-70"
          >
            Sign up
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 pb-10 pt-8 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          <div className="rounded-3xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.08)] border border-neutral-200/60">
            <form onSubmit={onLogin} className="p-10 md:p-12">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Login
                  </div>
                  <div className="mt-3 text-neutral-500">
                    Continue learning Lao 🇱🇦
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Email
                  </label>
                  <input
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm
                               outline-none placeholder:text-neutral-400
                               focus:bg-white focus:border-neutral-400"
                    placeholder="you@example.com"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Password
                  </label>
                  <input
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm
                               outline-none placeholder:text-neutral-400
                               focus:bg-white focus:border-neutral-400"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                {err && (
                  <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    {err}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="mt-10 flex items-center gap-3">
                <a
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold
                             hover:bg-neutral-50 active:scale-[0.99] transition"
                >
                  ← Home
                </a>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-7 py-3 text-sm font-semibold text-white
                             hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
                >
                  {loading ? "Logging in…" : "Login"}
                </button>

                <a
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold
                             hover:bg-neutral-50 active:scale-[0.99] transition"
                >
                  Sign up →
                </a>
              </div>

              <div className="mt-6 text-sm text-neutral-500">
                Tip: press <span className="font-semibold text-neutral-800">Enter</span> to submit.
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
