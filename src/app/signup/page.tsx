"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanEmail) return setErr("Please enter your email.");
    if (!cleanUsername) return setErr("Please enter a username.");
    if (!password) return setErr("Please enter a password.");

    // Optional: simple username rule (helps prevent weird characters)
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return setErr("Username must be 3–20 chars: lowercase letters, numbers, underscore.");
    }

    setLoading(true);

    // 1) Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (error) {
      setLoading(false);
      return setErr(error.message);
    }
    if (!data.user) {
      setLoading(false);
      return setErr("Signup failed.");
    }

    // 2) Create profile WITH username
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      username: cleanUsername,
      role: "user",
    });

    if (profileError) {
      setLoading(false);

      // Duplicate username (unique constraint violation)
      const code = (profileError as any).code;
      if (code === "23505") {
        return setErr("Username already taken. Please choose another one.");
      }

      return setErr(profileError.message);
    }

    setLoading(false);
    router.push("/decks");
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      {/* Top bar */}
      <header className="px-6 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-neutral-600">LAO3101S Flashcards</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              Create account
            </div>
          </div>
          <a
            href="/login"
            className="text-sm font-semibold text-neutral-900 hover:opacity-70"
          >
            Login
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 pb-10 pt-8 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          {/* Big card */}
          <div className="rounded-3xl bg-white shadow-[0_18px_60px_rgba(0,0,0,0.08)] border border-neutral-200/60">
            <form onSubmit={onSignup} className="p-10 md:p-12">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Sign up
                  </div>
                  <div className="mt-3 text-neutral-500">
                    Get ready to learn LAO Language!
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Email
                  </label>
                  <input
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm
                               outline-none placeholder:text-neutral-400
                               focus:bg-white focus:border-neutral-400"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Username
                  </label>
                  <input
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm
                               outline-none placeholder:text-neutral-400
                               focus:bg-white focus:border-neutral-400"
                    placeholder="include your name e.g. jaredseevhot"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
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
                    autoComplete="new-password"
                  />
                </div>

                {err && (
                  <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                    {err}
                  </div>
                )}
              </div>

              {/* Buttons row */}
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
                             hover:opacity-90 active:scale-[0.99] transition
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create account"}
                </button>

                <a
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold
                             hover:bg-neutral-50 active:scale-[0.99] transition"
                >
                  Login →
                </a>
              </div>

              <div className="mt-6 text-sm text-neutral-500">
                Tip: you can press{" "}
                <span className="font-semibold text-neutral-800">Enter</span> to
                submit.
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
