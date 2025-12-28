"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { isAdminEmail } from "@/lib/is-admin";

type Deck = {
  id: string;
  title: string;
  description: string | null;
  created_at?: string;
};

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [checkingAccess, setCheckingAccess] = useState(true);

  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Create deck
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function load() {
    setMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("decks")
      .select("id, title, description, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      setMsg(error.message);
      setDecks([]);
    } else {
      setDecks((data ?? []) as Deck[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      // ✅ Guard: only allow logged-in admins
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.replace("/login");
        return;
      }

      if (!isAdminEmail(auth.user.email)) {
        router.replace("/");
        return;
      }

      setCheckingAccess(false);

      // Now safe to load admin data
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDeck() {
    setMsg("");
    const t = title.trim();
    const d = description.trim();

    if (!t) {
      setMsg("Deck title is required.");
      return;
    }

    const { error } = await supabase.from("decks").insert({
      title: t,
      description: d || null,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setTitle("");
    setDescription("");
    load();
  }

  function startEdit(deck: Deck) {
    setEditingId(deck.id);
    setEditTitle(deck.title);
    setEditDescription(deck.description ?? "");
    setMsg("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  }

  async function saveEdit(deckId: string) {
    setMsg("");
    const t = editTitle.trim();
    const d = editDescription.trim();

    if (!t) {
      setMsg("Deck title is required.");
      return;
    }

    const { error } = await supabase
      .from("decks")
      .update({ title: t, description: d || null })
      .eq("id", deckId);

    if (error) {
      setMsg(error.message);
      return;
    }

    cancelEdit();
    load();
  }

  async function deleteDeck(deckId: string) {
    const ok = confirm(
      "Delete this deck AND all cards inside it? This cannot be undone."
    );
    if (!ok) return;

    setMsg("");

    const { error: delCardsErr } = await supabase
      .from("cards")
      .delete()
      .eq("deck_id", deckId);

    if (delCardsErr) {
      setMsg(delCardsErr.message);
      return;
    }

    const { error: delDeckErr } = await supabase
      .from("decks")
      .delete()
      .eq("id", deckId);

    if (delDeckErr) {
      setMsg(delDeckErr.message);
      return;
    }

    load();
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        Checking access…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div>
          <div className="text-sm text-slate-500">LAO3101S Flashcards</div>
          <h1 className="mt-1 text-4xl font-bold tracking-tight">Admin</h1>
          <p className="mt-2 text-slate-600">Manage decks and cards.</p>
        </div>

        {msg && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {msg}
          </div>
        )}

        {/* ===== MANAGE DECKS ===== */}
        <div className="mt-10">
          {/* Back link */}
          <button
            onClick={() => router.push("/decks")}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>

          <h2 className="text-lg font-semibold">Your decks</h2>

          {loading ? (
            <div className="mt-4 text-slate-500">Loading…</div>
          ) : decks.length === 0 ? (
            <div className="mt-4 text-slate-500">No decks yet.</div>
          ) : (
            <div className="mt-4 grid gap-4">
              {decks.map((d) => {
                const isEditing = editingId === d.id;

                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    {!isEditing ? (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-xl font-semibold">{d.title}</div>
                          {d.description && (
                            <div className="mt-1 text-slate-600">
                              {d.description}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => router.push(`/admin/decks/${d.id}`)}
                            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                          >
                            Manage cards →
                          </button>

                          <button
                            onClick={() => startEdit(d)}
                            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold hover:bg-slate-100"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteDeck(d.id)}
                            className="rounded-full border border-red-300 bg-white px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3"
                        />
                        <input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3"
                        />

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => saveEdit(d.id)}
                            className="rounded-full bg-black px-6 py-3 font-semibold text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-full border border-slate-300 px-6 py-3 font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== CREATE DECK ===== */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create a new deck</h2>

          <div className="mt-4 grid gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Deck title (e.g. Basic)"
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
            />

            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-xl border border-slate-200 px-4 py-3"
            />

            <button
              onClick={createDeck}
              className="mt-2 rounded-full bg-black px-6 py-3 font-semibold text-white hover:bg-slate-900"
            >
              Create deck
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
