"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isAdminEmail } from "@/lib/is-admin";

export default function TopNav() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setIsAdmin(isAdminEmail(data.user?.email));
    })();
  }, [supabase]);

  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="text-lg font-bold"
        >
          🇱🇦 Lao Flashcards
        </button>

        <div className="flex items-center gap-3">
          {email && (
            <span className="text-sm text-slate-600">
              {email}
            </span>
          )}

          {isAdmin && (
            <button
              onClick={() => router.push("/admin")}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Admin
            </button>
          )}

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
