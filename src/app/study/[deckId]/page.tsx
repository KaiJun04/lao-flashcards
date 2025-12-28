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
};

export default function StudyDeckPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = (params as any).deckId as string;

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [deckTitle, setDeckTitle] = useState<string>("Deck");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  async function load() {
    setMsg("");
    setLoading(true);

    // Require login (since you said you don't want this public)
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }

    // Fetch deck title
    const { data: deck, error: deckErr } = await supabase
      .from("decks")
      .select("title")
      .eq("id", deckId)
      .single();

    if (deckErr) setMsg(deckErr.message);
    setDeckTitle(deck?.title ?? "Deck");

    // Fetch cards
    const { data: cardsData, error: cardsErr } = await supabase
      .from("cards")
      .select("id, english, lao, roman, audio_url")
      .eq("deck_id", deckId)
      .order("position", { ascending: true, nullsFirst: false })
      .order("created_at", {ascending: true })
      .returns<Card[]>();

    if (cardsErr) setMsg(cardsErr.message);

    const list = cardsData ?? [];
    setCards(list);

    // reset index safely
    setIdx(0);
    setRevealed(false);

    setLoading(false);
  }

  useEffect(() => {
    if (!deckId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const current = cards[idx];

  function goPrev() {
    if (cards.length === 0) return;
    setIdx((i) => Math.max(0, i - 1));
    setRevealed(false);
  }

  function goNext() {
    if (cards.length === 0) return;
    setIdx((i) => Math.min(cards.length - 1, i + 1));
    setRevealed(false);
  }

  function toggleReveal() {
    setRevealed((v) => !v);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-6">
          <button
            onClick={() => router.push("/decks")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Decks
          </button>

          <div className="text-sm text-slate-500">
            {cards.length > 0 ? `Card ${idx + 1} / ${cards.length}` : ""}
          </div>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">{deckTitle}</h1>

        {msg && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {msg}
          </div>
        )}

        {/* Main card area */}
        <div className="mt-8">
          {loading ? (
            <div className="text-slate-500">Loading…</div>
          ) : cards.length === 0 ? (
            <div className="text-slate-500">No cards in this deck yet.</div>
          ) : (
            <>
              {/* CARD (NO JUMP) */}
              <div
                onClick={toggleReveal}
                className="cursor-pointer select-none rounded-[36px] bg-white border border-slate-200 shadow-xl px-10 py-10 h-[300px] flex flex-col"
              >
                {/* Scroll inside, card height fixed */}
                <div className="flex-1 overflow-y-auto">
                  <div className="text-4xl font-black tracking-tight">
                    {current?.english}
                  </div>

                  {/* Reserve space so reveal doesn't move anything */}
                  <div className="mt-10 min-h-[80px]">
                    {!revealed ? (
                      <div className="text-xl font-semibold text-slate-300">
                        Click to reveal
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-2xl font-semibold">
                          {current?.lao}
                        </div>
                        {current?.roman && (
                          <div className="text-xl text-slate-500">
                            {current.roman}
                          </div>
                        )}
                        {current?.audio_url ? (
                          <audio controls src={current.audio_url} className="mt-1" />
                        ) : (
                          <div className="text-sm text-slate-400 italic">
                             🔇 No audio available yet
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={goPrev}
                  disabled={idx === 0}
                  className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40"
                >
                  ← Prev
                </button>

                <button
                  onClick={toggleReveal}
                  className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-slate-900 active:scale-[0.98]"
                >
                  {revealed ? "Hide" : "Reveal"}
                </button>

                <button
                  onClick={goNext}
                  disabled={idx === cards.length - 1}
                  className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>


              <div className="mt-5 text-slate-500">
                Tip: click anywhere on the card to flip.
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
