"use client";
import { useState } from "react";
import Link from "next/link";
import { BookMarked, RotateCcw } from "lucide-react";
import { useStudy } from "@/lib/use-study";
import { typeLabels, type Mistake } from "@/lib/study-types";
import { request } from "@/lib/client";
import Dialog from "@/components/Dialog";
import AnswerInput from "@/components/AnswerInput";
import { newId } from "@/lib/id";
export default function MistakesPage() {
  const { data, error, refresh } = useStudy();
  const [type, setType] = useState(""),
    [state, setState] = useState("active"),
    [review, setReview] = useState<Mistake | null>(null),
    [answer, setAnswer] = useState(""),
    [attempt, setAttempt] = useState(""),
    [result, setResult] = useState<{
      correct: boolean;
      record: Mistake;
      rule: { standardAnswer: string; explanation: string };
    } | null>(null),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const records =
    data?.mistakes.filter(
      (r) =>
        (!type || r.question.task.section.type === type) &&
        (state === "all" || state === "active"
          ? state === "all" || r.masteryStatus !== "mastered"
          : r.masteryStatus === state)
    ) || [];
  function start(record: Mistake) {
    setReview(record);
    setAnswer("");
    setResult(null);
    setFailure("");
    setAttempt(newId());
  }
  async function submit() {
    if (!review || busy || result) return;
    setBusy(true);
    setFailure("");
    try {
      const value = await request<NonNullable<typeof result>>("/api/mistakes/review", {
        method: "POST",
        body: JSON.stringify({ recordId: review.id, answer, attemptId: attempt }),
      });
      setResult(value);
      await refresh();
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <h1>错题本</h1>
          <p className="muted">
            待复习 {data?.mistakes.filter((r) => r.masteryStatus !== "mastered").length || 0} 题 ·
            已掌握 {data?.mistakes.filter((r) => r.masteryStatus === "mastered").length || 0} 题
          </p>
        </div>
        <BookMarked size={30} color="#a77544" />
      </div>
      <div className="filters">
        <div>
          <label className="field-label" htmlFor="type">
            题型
          </label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">全部题型</option>
            {Object.entries(typeLabels).map(([id, name]) => (
              <option value={id} key={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="mastery">
            掌握状态
          </label>
          <select id="mastery" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="active">待复习</option>
            <option value="unmastered">未掌握</option>
            <option value="consolidating">巩固中</option>
            <option value="mastered">已掌握</option>
            <option value="all">全部</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
          <button className="button" onClick={refresh}>
            重试
          </button>
        </p>
      )}
      {!data ? (
        <p className="empty">正在读取错题…</p>
      ) : !records.length ? (
        <div className="empty">
          <BookMarked size={36} />
          <p>当前筛选下没有错题</p>
          <Link className="button mt-4" href="/papers">
            去做题
          </Link>
        </div>
      ) : (
        records.map((r) => (
          <article className="result-item" key={r.id}>
            <div className="mistake-top">
              <span className="badge">{typeLabels[r.question.task.section.type]}</span>
              <span className={`badge ${r.masteryStatus === "mastered" ? "good" : "warn"}`}>
                {r.masteryStatus === "mastered"
                  ? "已掌握"
                  : r.masteryStatus === "consolidating"
                    ? "巩固中"
                    : "未掌握"}{" "}
                · {r.consecutiveCorrect} / 2
              </span>
            </div>
            <h3>
              {r.question.questionNumber}. {r.question.stem}
            </h3>
            <p className="muted mt-3">
              {r.question.task.section.paper.title}
              {!r.question.verified ? " · 待核验预览" : ""}
            </p>
            <div className="record-row" style={{ border: 0, paddingBottom: 0 }}>
              <p className="muted">上次作答：{r.userAnswer || "未作答"}</p>
              <button className="button primary" onClick={() => start(r)}>
                <RotateCcw size={16} />
                重新练习
              </button>
            </div>
          </article>
        ))
      )}
      {review && (
        <Dialog
          title="错题重练"
          onClose={() => {
            if (!busy) setReview(null);
          }}
        >
          <p className="muted">
            {typeLabels[review.question.task.section.type]} · 第 {review.question.questionNumber} 题
          </p>
          {review.question.task.section.passage && (
            <details>
              <summary className="mt-3">阅读原文</summary>
              <div className="review-passage">{review.question.task.section.passage}</div>
            </details>
          )}
          <h3 className="my-5">{review.question.stem}</h3>
          <AnswerInput
            question={review.question}
            type={review.question.task.section.type}
            pool={review.question.task.section.options}
            value={answer}
            disabled={busy || !!result}
            onChange={setAnswer}
          />
          {failure && (
            <p className="notice error" role="alert">
              {failure}
            </p>
          )}
          {result ? (
            <div className="mt-5">
              <p className={result.correct ? "badge good" : "badge wrong"} role="status">
                {result.correct
                  ? result.record.consecutiveCorrect >= 2
                    ? "已掌握 · 连续答对 2 次"
                    : "答对了 · 巩固中 1 / 2"
                  : "答错了 · 连对次数已重置"}
              </p>
              <p className="mt-4">参考答案：{result.rule.standardAnswer}</p>
              <p className="muted mt-2">{result.rule.explanation || "暂无解析"}</p>
              <div className="actions mt-5">
                <button className="button" onClick={() => setReview(null)}>
                  返回错题本
                </button>
                <button
                  className="button primary"
                  onClick={() => start({ ...review, ...result.record })}
                >
                  再次练习
                </button>
              </div>
            </div>
          ) : (
            <button
              className="button primary mt-5"
              disabled={busy || !answer.trim()}
              onClick={submit}
            >
              {busy ? "保存中…" : "提交答案"}
            </button>
          )}
        </Dialog>
      )}
    </main>
  );
}
