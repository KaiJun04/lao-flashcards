"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isAdminEmail } from "@/lib/is-admin";

type Deck = {
  id: string;
  title: string;
  description: string | null;
};

export default function DecksPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      // ✅ Option A: admin by email allowlist
      setIsAdmin(isAdminEmail(auth.user.email));

      const { data: decksData } = await supabase
        .from("decks")
        .select("id, title, description")
        .order("created_at", { ascending: true })
        .returns<Deck[]>();

      setDecks((decksData ?? []) as Deck[]);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-100 flex items-center justify-center">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      {/* Header */}
      <header className="px-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-neutral-600">LAO3101S Flashcards</div>
            <div className="text-2xl font-semibold mt-1">Decks</div>
            <button
              onClick={() => router.push("/")}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              ← Back
            </button>
          </div>

          <div className="flex gap-3 items-center">
            {/* ✅ ADMIN BUTTON (hidden for normal users) */}
            {isAdmin && (
              <a
                href="/admin"
                className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50"
              >
                Admin
              </a>
            )}

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="text-sm font-semibold hover:opacity-70"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 pt-8 pb-10 flex justify-center">
        <div className="w-full max-w-3xl">
          <div className="rounded-3xl bg-white p-10 shadow border">
            <div className="grid gap-4">
              {decks.map((d) => (
                <a
                  key={d.id}
                  href={`/study/${d.id}`}
                  className="block rounded-2xl border px-6 py-5 hover:bg-neutral-50"
                >
                  <div className="font-semibold">{d.title}</div>
                  {d.description && (
                    <div className="text-sm text-neutral-600">
                      {d.description}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
