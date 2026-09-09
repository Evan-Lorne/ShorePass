"use client";
import { useEffect, useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { request } from "@/lib/client";
export default function FlashcardClient({
  words,
}: {
  words: { id: string; word: string; translation: string }[];
}) {
  const [index, setIndex] = useState(0),
    [show, setShow] = useState(false),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [known, setKnown] = useState<string[]>([]);
  useEffect(() => {
    request<{ progress: { wordId: string; status: string }[] }>("/api/words/progress")
      .then((data) =>
        setKnown(data.progress.filter((p) => p.status === "known").map((p) => p.wordId))
      )
      .catch((e) => setError(e.message));
  }, []);
  async function next(status: "known" | "forgotten") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/words/progress", {
        method: "POST",
        body: JSON.stringify({ wordId: words[index].id, status }),
      });
      setKnown((previous) =>
        status === "known"
          ? [...new Set([...previous, words[index].id])]
          : previous.filter((id) => id !== words[index].id)
      );
      if (index < words.length - 1) {
        setIndex(index + 1);
        setShow(false);
      } else setDone(true);
    } catch (e) {
      setError((e as Error).message || "网络不可用，当前单词尚未保存。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="w-full max-w-lg">
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <p className="muted text-center mb-4">
        {index + 1} / {words.length} · 已认识 {known.length} 词
      </p>
      {done ? (
        <div className="empty">
          <h2>本组复习完成</h2>
          <button
            className="button primary mt-5"
            onClick={() => {
              setIndex(0);
              setDone(false);
              setShow(false);
            }}
          >
            <RotateCcw size={18} />
            再来一遍
          </button>
        </div>
      ) : (
        <>
          <button
            className="word-card"
            aria-label={show ? "隐藏释义" : "查看释义"}
            aria-pressed={show}
            onClick={() => setShow(!show)}
          >
            <h2>{words[index].word}</h2>
            <p className="muted">{show ? words[index].translation : "查看释义"}</p>
          </button>
          <div className="actions mt-6">
            <button className="button flex-1" disabled={busy} onClick={() => next("forgotten")}>
              <X size={20} />
              不认识
            </button>
            <button className="button primary flex-1" disabled={busy} onClick={() => next("known")}>
              <Check size={20} />
              认识
            </button>
          </div>
        </>
      )}
    </div>
  );
}
