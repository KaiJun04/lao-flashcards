"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Card = {
  id: string;
  english: string;
  lao: string;
  roman: string | null;
  audio_url: string | null;
  position: number | null;
};

type Deck = {
  id: string;
  title: string;
  description: string | null;
};

export default function ManageCardsPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = (params as any).deckId as string;

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEnglish, setEditEnglish] = useState("");
  const [editLao, setEditLao] = useState("");
  const [editRoman, setEditRoman] = useState("");

  // ✅ drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // ✅ helper to get storage path from public URL
  function storagePathFromPublicUrl(url: string) {
    const marker = "/storage/v1/object/public/audio/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  }

  async function load() {
    setMsg("");

    // Load deck info (title/desc)
    const { data: deckData, error: deckErr } = await supabase
      .from("decks")
      .select("id, title, description")
      .eq("id", deckId)
      .single();

    if (deckErr) {
      setMsg(deckErr.message);
      setDeck(null);
    } else {
      setDeck(deckData as Deck);
    }

    // ✅ Load cards in stable order
    const { data, error } = await supabase
      .from("cards")
      .select("id, english, lao, roman, audio_url, position")
      .eq("deck_id", deckId)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) setMsg(error.message);

    setCards((data ?? []) as Card[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!deckId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // ✅ Helper: get next position in this deck
  async function getNextPosition() {
    const { data, error } = await supabase
      .from("cards")
      .select("position")
      .eq("deck_id", deckId)
      .order("position", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) return 1;
    return (data?.position ?? 0) + 1;
  }

  async function addBulk() {
    setMsg("");
    try {
      const lines = bulk
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setMsg("Nothing to add.");
        return;
      }

      const startPos = await getNextPosition();

      const rows = lines.map((line, i) => {
        const [english, lao, roman] = line.split("|").map((p) => p.trim());
        if (!english || !lao) throw new Error("Invalid format");
        return {
          english,
          lao,
          roman: roman || null,
          deck_id: deckId,
          position: startPos + i,
        };
      });

      const { error } = await supabase.from("cards").insert(rows);
      if (error) throw error;

      setBulk("");
      load();
    } catch {
      setMsg("Invalid format. Use: English | Lao | Roman");
    }
  }

  async function uploadAudio(cardId: string, file: File) {
    setMsg("");

    const ext = file.name.split(".").pop() || "mp3";
    const path = `${deckId}/${cardId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("audio")
      .upload(path, file, { upsert: true });

    if (upErr) {
      setMsg(upErr.message);
      return;
    }

    const { data } = supabase.storage.from("audio").getPublicUrl(path);

    const { error: dbErr } = await supabase
      .from("cards")
      .update({ audio_url: data.publicUrl })
      .eq("id", cardId);

    if (dbErr) {
      setMsg(dbErr.message);
      return;
    }

    load();
  }

  async function deleteAudio(cardId: string, audioUrl: string) {
    const ok = confirm("Delete this audio recording?");
    if (!ok) return;

    setMsg("");

    const path = storagePathFromPublicUrl(audioUrl);

    if (path) {
      const { error: rmErr } = await supabase.storage.from("audio").remove([path]);
      if (rmErr) {
        setMsg(rmErr.message);
        return;
      }
    }

    const { error: dbErr } = await supabase
      .from("cards")
      .update({ audio_url: null })
      .eq("id", cardId);

    if (dbErr) {
      setMsg(dbErr.message);
      return;
    }

    load();
  }

  async function deleteCard(cardId: string) {
    const ok = confirm("Delete this card?");
    if (!ok) return;

    setMsg("");
    const { error } = await supabase.from("cards").delete().eq("id", cardId);

    if (error) {
      setMsg(error.message);
      return;
    }

    if (editingId === cardId) {
      setEditingId(null);
      setEditEnglish("");
      setEditLao("");
      setEditRoman("");
    }

    load();
  }

  function startEdit(c: Card) {
    setEditingId(c.id);
    setEditEnglish(c.english);
    setEditLao(c.lao);
    setEditRoman(c.roman ?? "");
    setMsg("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditEnglish("");
    setEditLao("");
    setEditRoman("");
  }

  async function saveEdit(cardId: string) {
    setMsg("");

    const e = editEnglish.trim();
    const l = editLao.trim();
    const r = editRoman.trim();

    if (!e || !l) {
      setMsg("English and Lao are required.");
      return;
    }

    const { error } = await supabase
      .from("cards")
      .update({
        english: e,
        lao: l,
        roman: r ? r : null,
      })
      .eq("id", cardId);

    if (error) {
      setMsg(error.message);
      return;
    }

    cancelEdit();
    load();
  }

  // ✅ move card up/down (swap positions)
  async function moveCard(cardId: string, direction: "up" | "down") {
    const index = cards.findIndex((c) => c.id === cardId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;

    const current = cards[index];
    const target = cards[targetIndex];

    const results = await Promise.all([
      supabase.from("cards").update({ position: target.position }).eq("id", current.id),
      supabase.from("cards").update({ position: current.position }).eq("id", target.id),
    ]);

    const error = results.find((r) => r.error)?.error;
    if (error) {
      setMsg(error.message);
      return;
    }

    load();
  }

  // ✅ drag reorder helpers
  function reorder<T>(arr: T[], from: number, to: number) {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  }

  async function persistOrder(nextCards: Card[]) {
    const updates = nextCards.map((c, i) => ({ id: c.id, position: i + 1 }));

    const results = await Promise.all(
      updates.map((u) =>
        supabase.from("cards").update({ position: u.position }).eq("id", u.id)
      )
    );

    const err = results.find((r) => r.error)?.error;
    if (err) {
      setMsg(err.message);
      return;
    }

    load();
  }

  function onDragStart(cardId: string) {
    setDraggingId(cardId);
    setOverId(null);
  }

  function onDragEnter(cardId: string) {
    if (!draggingId) return;
    if (cardId === draggingId) return;
    setOverId(cardId);
  }

  async function onDrop() {
    if (!draggingId || !overId || draggingId === overId) {
      setDraggingId(null);
      setOverId(null);
      return;
    }

    const from = cards.findIndex((c) => c.id === draggingId);
    const to = cards.findIndex((c) => c.id === overId);

    if (from === -1 || to === -1) {
      setDraggingId(null);
      setOverId(null);
      return;
    }

    const next = reorder(cards, from, to);

    setCards(next);
    await persistOrder(next);

    setDraggingId(null);
    setOverId(null);
  }

  function onDragEnd() {
    setDraggingId(null);
    setOverId(null);
  }

  async function deleteDeck() {
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

    router.push("/admin");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              Refresh
            </button>

            <button
              onClick={deleteDeck}
              className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Delete deck
            </button>
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Manage cards</h1>
        <p className="mt-2 text-slate-600">
          Deck:{" "}
          <span className="font-semibold text-slate-900">
            {deck?.title ?? "…"}
          </span>
          <span className="mx-2 text-slate-300">•</span>
          Bulk add format:{" "}
          <span className="font-semibold">English | Lao | Roman</span>
        </p>

        {msg && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {msg}
          </div>
        )}

        {/* Bulk input */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={`Hello | ສະບາຍດີ | sabaidee\nYou | ເຈົ້າ | jao`}
            className="w-full min-h-[180px] rounded-xl border border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={addBulk}
              className="rounded-full bg-black px-6 py-3 font-semibold text-white hover:bg-slate-900"
            >
              Add cards
            </button>

            <button
              onClick={() => setBulk("")}
              className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Cards list */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Cards</h2>

          {loading ? (
            <div className="mt-4 text-slate-500">Loading…</div>
          ) : cards.length === 0 ? (
            <div className="mt-4 text-slate-500">No cards in this deck yet.</div>
          ) : (
            <div className="mt-4 grid gap-4">
              {cards.map((c, idx) => {
                const isEditing = editingId === c.id;

                return (
                  <div
                    key={c.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => onDragEnter(c.id)}
                    onDragLeave={() => {
                      if (overId === c.id) setOverId(null);
                    }}
                    onDrop={onDrop}
                    className={[
                      "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
                      overId === c.id ? "border-slate-300 bg-slate-50" : "",
                    ].join(" ")}
                  >
                    {!isEditing ? (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-lg font-semibold text-slate-900">
                              {c.english}
                            </div>
                            <div className="text-2xl text-slate-900">{c.lao}</div>
                            {c.roman && (
                              <div className="text-sm text-slate-600">
                                {c.roman}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit(c)}
                                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteCard(c.id)}
                                className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>

                            {/* ✅ drag button moved to the RIGHT of arrows */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => moveCard(c.id, "up")}
                                disabled={idx === 0}
                                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveCard(c.id, "down")}
                                disabled={idx === cards.length - 1}
                                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-40"
                              >
                                ↓
                              </button>
                              <button
                                draggable
                                onDragStart={() => onDragStart(c.id)}
                                onDragEnd={onDragEnd}
                                title="Drag to reorder"
                                className="cursor-grab active:cursor-grabbing rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                              >
                                ☰
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          {c.audio_url ? (
                            <audio controls src={c.audio_url} className="h-9" />
                          ) : (
                            <span className="text-sm text-slate-500">No audio</span>
                          )}

                          {c.audio_url ? (
                            <button
                              onClick={() => deleteAudio(c.id, c.audio_url!)}
                              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                            >
                              Delete audio
                            </button>
                          ) : (
                            <label className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                              Upload audio
                              <input
                                type="file"
                                hidden
                                accept="audio/*"
                                onChange={(e) =>
                                  e.target.files &&
                                  uploadAudio(c.id, e.target.files[0])
                                }
                              />
                            </label>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-3">
                          <input
                            value={editEnglish}
                            onChange={(e) => setEditEnglish(e.target.value)}
                            placeholder="English"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                          />
                          <input
                            value={editLao}
                            onChange={(e) => setEditLao(e.target.value)}
                            placeholder="Lao"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                          />
                          <input
                            value={editRoman}
                            onChange={(e) => setEditRoman(e.target.value)}
                            placeholder="Roman (optional)"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                          />

                          <div className="mt-1 flex flex-wrap gap-3">
                            <button
                              onClick={() => saveEdit(c.id)}
                              className="rounded-full bg-black px-6 py-3 font-semibold text-white hover:bg-slate-900"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => deleteCard(c.id)}
                              className="rounded-full border border-red-300 bg-white px-6 py-3 font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete card
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
