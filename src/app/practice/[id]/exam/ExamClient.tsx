"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flag,
  Pause,
  Play,
  Grid2X2,
} from "lucide-react";
import type { StudyPaper } from "@/lib/paper";
import type { Session } from "@/lib/study-types";
import { typeLabels } from "@/lib/study-types";
import { connect, request } from "@/lib/client";
import AnswerInput from "@/components/AnswerInput";
import Dialog from "@/components/Dialog";
import ExamResults from "@/components/ExamResults";

type Draft = {
  revision: number;
  answers: Record<string, string>;
  marked: string[];
  currentIndex: number;
  elapsed: number;
};
type Snapshot = { session: Session; draft: Draft; dirty: boolean };
const empty: Draft = { revision: 0, answers: {}, marked: [], currentIndex: 0, elapsed: 0 };
function fromSession(session: Session): Draft {
  let state;
  try {
    state = JSON.parse(session.draftState);
  } catch {
    state = {};
  }
  return {
    ...empty,
    ...state,
    revision: session.revision,
    answers: Object.fromEntries(session.answers.map((a) => [a.questionId, a.userAnswer])),
  };
}
function formatTime(seconds: number) {
  const sec = Math.max(0, Math.floor(seconds));
  return `${Math.floor(sec / 60)
    .toString()
    .padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
}

export default function ExamClient({
  paper,
  mode,
  verified,
}: {
  paper: StudyPaper;
  mode: string;
  verified: boolean;
}) {
  const params = useSearchParams();
  const requestedSession = params.get("session");
  const fresh = params.get("new") === "1";
  const questions = paper.sections.flatMap((section) =>
    section.tasks.flatMap((task) => task.questions.map((q) => ({ ...q, section, task })))
  );
  const [snap, setSnap] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState("正在连接…");
  const [sheet, setSheet] = useState(false),
    [passage, setPassage] = useState(true),
    [confirm, setConfirm] = useState(false),
    [paused, setPaused] = useState(false),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false),
    [tick, setTick] = useState(Date.now());
  const live = useRef<Snapshot | null>(null),
    key = useRef(""),
    pending = useRef<Promise<void> | null>(null),
    submitting = useRef(false),
    offset = useRef(0),
    sequence = useRef(0),
    passageRef = useRef<HTMLDivElement>(null),
    questionRef = useRef<HTMLDivElement>(null);
  const operations = useRef({ sync: async () => {}, submit: async () => {} });

  function persist(next: Snapshot) {
    live.current = next;
    setSnap(next);
    try {
      if (key.current) localStorage.setItem(key.current, JSON.stringify(next));
    } catch {
      setError("本机存储空间不足，请保持联网并等待保存成功。");
    }
  }
  function edit(change: Partial<Draft>) {
    if (!live.current || live.current.session.status === "submitted" || submitting.current) return;
    sequence.current++;
    persist({ ...live.current, draft: { ...live.current.draft, ...change }, dirty: true });
    setStatus(navigator.onLine ? "已存本机 · 等待同步" : "离线 · 已存本机");
  }
  async function reload(force = false) {
    const current = live.current;
    const data = await request<{ session: Session; serverNow: number }>("/api/exam-session", {
      method: "POST",
      body: JSON.stringify({
        paperId: paper.id,
        mode,
        sessionId: current?.session.id || requestedSession || undefined,
      }),
    });
    offset.current = data.serverNow - Date.now();
    // Never discard unsent edits when an asynchronous refresh finishes.
    const latest = live.current;
    if (latest?.dirty && !force && data.session.status !== "submitted") {
      if (data.session.revision !== latest.draft.revision) {
        setConflict(true);
        setError("另一台设备已有新进度。本机草稿已保留，请载入最新进度后继续。");
      }
      return;
    }
    if (latest?.dirty && key.current)
      localStorage.setItem(`${key.current}:backup:${Date.now()}`, JSON.stringify(latest));
    const restored = fromSession(data.session);
    if (
      mode === "practice" &&
      latest?.session.id === data.session.id &&
      data.session.status === "in_progress"
    )
      restored.elapsed = Math.max(restored.elapsed, latest.draft.elapsed);
    persist({ session: data.session, draft: restored, dirty: false });
    setStatus("已同步");
    setConflict(false);
    setError("");
  }
  async function sync() {
    if (pending.current || submitting.current || conflict || !live.current || !navigator.onLine)
      return;
    const current = live.current;
    if (current.session.status === "submitted") return;
    pending.current = (async () => {
      try {
        if (!current.dirty) {
          await reload();
          return;
        }
        const seq = sequence.current;
        const { session } = await request<{ session: Session }>(
          `/api/exam-session/${current.session.id}/save`,
          { method: "PUT", body: JSON.stringify(current.draft) }
        );
        const latest = live.current!;
        persist({
          ...latest,
          session,
          draft: { ...latest.draft, revision: session.revision },
          dirty: sequence.current !== seq,
        });
        setStatus(sequence.current === seq ? "已同步" : "已存本机 · 等待同步");
        setError("");
      } catch (e) {
        const fault = e as Error & { status?: number };
        if (fault.status === 409) setConflict(true);
        setStatus("已存本机 · 尚未同步");
        setError(fault.status ? fault.message : "网络暂不可用，联网后会自动重试。");
      }
    })().finally(() => {
      pending.current = null;
    });
    await pending.current;
  }
  async function submit() {
    if (submitting.current || !live.current || live.current.session.status === "submitted") return;
    submitting.current = true;
    setBusy(true);
    setConfirm(false);
    try {
      await pending.current;
      const current = live.current!;
      const { session } = await request<{ session: Session }>(
        `/api/exam-session/${current.session.id}/submit`,
        { method: "POST", body: JSON.stringify(current.draft) }
      );
      persist({ session, draft: fromSession(session), dirty: false });
      setError("");
    } catch (e) {
      setError((e as Error).message || "交卷失败，答案已保留，请联网后重试。");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  operations.current = { sync, submit };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await connect();
        if (!active) return;
        key.current = `shorepass:draft:${user.userId}:${paper.id}:${mode}${requestedSession ? `:${requestedSession}` : ""}`;
        const stored = localStorage.getItem(key.current);
        if (stored) {
          try {
            const saved = JSON.parse(stored) as Snapshot;
            if (
              saved.session?.id &&
              saved.draft &&
              !(fresh && !requestedSession && saved.session.status === "submitted")
            )
              persist(saved);
          } catch {
            /* Fetch the authoritative session if a cache is malformed. */
          }
        }
        await reload();
        if (fresh && live.current) {
          const url = new URL(window.location.href);
          url.searchParams.delete('new');
          url.searchParams.set('session', live.current.session.id);
          window.history.replaceState(window.history.state, '', url);
        }
      } catch (e) {
        if (active) {
          setError(live.current ? "当前离线，本机草稿已恢复。" : (e as Error).message);
          setStatus("离线 · 已存本机");
        }
      }
    })();
    const timer = setInterval(() => operations.current.sync(), 4000);
    const online = () => operations.current.sync();
    const unload = (e: BeforeUnloadEvent) => {
      if (live.current?.dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", unload);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", unload);
    };
    // A mounted exam owns one session; mutable callbacks live in operations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper.id, mode, requestedSession, fresh]);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
      if (
        mode === "practice" &&
        !paused &&
        live.current?.session.status === "in_progress" &&
        !submitting.current
      ) {
        const next = {
          ...live.current,
          draft: { ...live.current.draft, elapsed: live.current.draft.elapsed + 1 },
        };
        persist(next);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, paused]);
  const remaining = snap
    ? (new Date(snap.session.endTime).getTime() - tick - offset.current) / 1000
    : 0;
  useEffect(() => {
    if (
      mode === "mock" &&
      snap?.session.status === "in_progress" &&
      remaining <= 0 &&
      navigator.onLine
    )
      operations.current.submit();
  }, [mode, remaining, snap?.session.status]);
  const index = Math.min(snap?.draft.currentIndex || 0, questions.length - 1),
    q = questions[index];
  useEffect(() => {
    questionRef.current?.scrollTo({ top: 0 });
    const target = passageRef.current?.querySelector("mark");
    if (target && passageRef.current)
      passageRef.current.scrollTop =
        (target as HTMLElement).offsetTop - passageRef.current.offsetTop - 20;
  }, [index, passage]);
  if (!snap)
    return (
      <main className="page">
        <h1>{paper.title}</h1>
        <p className="notice" role="status">
          {error || "正在恢复答题进度…"}
        </p>
        <button className="button" onClick={() => window.location.reload()}>
          重新连接
        </button>
      </main>
    );
  if (snap.session.status === "submitted")
    return <ExamResults paper={paper} session={snap.session} verified={verified} />;
  if (!q) return <main className="page">暂无可作答题目。</main>;
  const { draft } = snap;
  const disabled = busy || paused || conflict || (mode === "mock" && remaining <= 0);
  const missing = questions.filter((item) => !draft.answers[item.id]?.trim()).length;
  return (
    <main className="exam-shell">
      <div className="exam-toolbar">
        <div className="exam-caption">
          <h1>{paper.title}</h1>
          <div className="save-status" role="status">
            {verified ? (mode === "mock" ? "全真模考" : "自主练习") : "待核验预览"} · {index + 1} /{" "}
            {questions.length} · {status}
          </div>
        </div>
        <div className="exam-tools">
          <span className="timer">
            <Clock size={16} />
            {formatTime(mode === "mock" ? remaining : draft.elapsed)}
          </span>
          {mode === "practice" && (
            <button
              className="icon-button"
              title={paused ? "继续练习" : "暂停练习"}
              aria-label={paused ? "继续练习" : "暂停练习"}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          )}
          <button className="button" onClick={() => setSheet(true)}>
            <Grid2X2 size={16} />
            答题卡
          </button>
          <button
            className="button primary"
            onClick={() => setConfirm(true)}
            disabled={busy || conflict}
          >
            {busy ? "提交中…" : "交卷"}
          </button>
        </div>
      </div>
      {error && (
        <div className="notice error" style={{ margin: 0 }} role="alert">
          {error}
          {conflict && (
            <button
              className="button"
              onClick={() => reload(true).catch((e) => setError(e.message))}
            >
              载入最新进度
            </button>
          )}
        </div>
      )}
      <div className="exam-main">
        <section className={`passage-panel ${passage ? "" : "collapsed"}`}>
          <button
            className="passage-toggle"
            aria-expanded={passage}
            onClick={() => setPassage(!passage)}
          >
            <span>阅读原文 · {typeLabels[q.section.type]}</span>
            {passage ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <div className="passage-text" ref={passageRef}>
            {q.section.passage
              ? q.section.passage
                  .replace(/(?<!\n)\n(?!\n|[①②③④⑤⑥⑦⑧⑨⑩]| {2,})/g, " ")
                  .split(new RegExp(`(\\[${q.questionNumber}\\])`, "g"))
                  .map((text, i) =>
                    text === `[${q.questionNumber}]` ? <mark key={i}>{text}</mark> : text
                  )
              : "本题无独立阅读材料。"}
          </div>
        </section>
        <section className="question-panel" ref={questionRef}>
          <div className="paper-meta">
            <span className="badge">{typeLabels[q.section.type]}</span>
            <span>{q.scoreValue} 分</span>
          </div>
          {q.task.title && <p className="muted mt-3">{q.task.title}</p>}
          {(q.task.instructions || q.section.instructions) && (
            <p className="muted mt-3">{q.task.instructions || q.section.instructions}</p>
          )}
          <h2>
            {q.questionNumber}. {q.stem}
          </h2>
          {paused ? (
            <div className="empty">
              <Pause size={28} />
              <p>练习已暂停</p>
              <button className="button primary mt-4" onClick={() => setPaused(false)}>
                继续练习
              </button>
            </div>
          ) : (
            <AnswerInput
              question={q}
              type={q.section.type}
              pool={q.section.options}
              value={draft.answers[q.id] || ""}
              disabled={disabled}
              onChange={(value) =>
                edit({ answers: { ...live.current!.draft.answers, [q.id]: value } })
              }
            />
          )}
        </section>
      </div>
      <footer className="exam-footer">
        <button
          className="button"
          disabled={index === 0}
          onClick={() => edit({ currentIndex: index - 1 })}
        >
          <ChevronLeft size={18} />
          上一题
        </button>
        <button
          className="icon-button"
          title={draft.marked.includes(q.id) ? "取消标记" : "标记此题"}
          aria-label="标记此题"
          aria-pressed={draft.marked.includes(q.id)}
          style={{ color: draft.marked.includes(q.id) ? "#bd7730" : undefined }}
          onClick={() =>
            edit({
              marked: draft.marked.includes(q.id)
                ? draft.marked.filter((id) => id !== q.id)
                : [...draft.marked, q.id],
            })
          }
        >
          <Flag size={22} />
        </button>
        <button
          className="button primary"
          disabled={index === questions.length - 1}
          onClick={() => edit({ currentIndex: index + 1 })}
        >
          下一题
          <ChevronRight size={18} />
        </button>
      </footer>
      {sheet && (
        <Dialog title="答题卡" onClose={() => setSheet(false)}>
          <div className="paper-meta">
            <span className="badge good">已答 {questions.length - missing}</span>
            <span className="badge">未答 {missing}</span>
            <span className="badge warn">已标记 {draft.marked.length}</span>
          </div>
          {paper.sections.map((section) => (
            <section key={section.id}>
              <h3 className="mt-5">{typeLabels[section.type]}</h3>
              <div className="sheet-grid">
                {section.tasks
                  .flatMap((t) => t.questions)
                  .map((question) => (
                    <button
                      key={question.id}
                      aria-label={`第 ${question.questionNumber} 题`}
                      className={`${draft.answers[question.id]?.trim() ? "answered" : ""} ${draft.marked.includes(question.id) ? "marked" : ""} ${question.id === q.id ? "current" : ""}`}
                      onClick={() => {
                        edit({ currentIndex: questions.findIndex((x) => x.id === question.id) });
                        setSheet(false);
                      }}
                    >
                      {question.questionNumber}
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </Dialog>
      )}
      {confirm && (
        <Dialog title="确认交卷" onClose={() => setConfirm(false)}>
          <p>
            {missing ? `还有 ${missing} 道题未作答。` : "所有题目均已作答。"}交卷后答案不能修改。
          </p>
          <div className="actions mt-5">
            <button className="button" onClick={() => setConfirm(false)}>
              继续答题
            </button>
            <button className="button primary" onClick={submit}>
              确认交卷
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
