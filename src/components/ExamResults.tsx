"use client";
import { useState } from "react";
import Link from "next/link";
import type { StudyPaper } from "@/lib/paper";
import type { Session } from "@/lib/study-types";
import { typeLabels } from "@/lib/study-types";
import { subjective } from "@/lib/grading";
export default function ExamResults({
  paper,
  session,
  verified,
}: {
  paper: StudyPaper;
  session: Session;
  verified: boolean;
}) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  const questions = paper.sections.flatMap((s) =>
    s.tasks.flatMap((t) => t.questions.map((q) => ({ ...q, section: s })))
  );
  const objective = session.answers.filter((a) => a.isCorrect !== null),
    correct = objective.filter((a) => a.isCorrect).length;
  let elapsed = Math.max(
    0,
    Math.round(
      (new Date(session.submittedAt || session.endTime).getTime() -
        new Date(session.startTime).getTime()) /
        60000
    )
  );
  if (session.mode === "practice") {
    try {
      elapsed = Math.round((JSON.parse(session.draftState).elapsed || 0) / 60);
    } catch {}
  }
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <h1>交卷结果</h1>
          <p className="muted">{paper.title}</p>
        </div>
        <Link className="button" href="/papers">
          返回试卷库
        </Link>
      </div>
      {!verified && (
        <p className="notice">待核验预览：答案与解析尚未经人工确认，以下仅为练习参考。</p>
      )}
      <div className="stats">
        <div className="stat">
          <span className="muted">客观题得分</span>
          <strong>
            {session.objectiveScore}
            <small> 分</small>
          </strong>
        </div>
        <div className="stat">
          <span className="muted">客观题正确率</span>
          <strong>
            {objective.length ? Math.round((correct / objective.length) * 100) : 0}
            <small>%</small>
          </strong>
        </div>
        <div className="stat">
          <span className="muted">练习用时</span>
          <strong>
            {elapsed}
            <small> 分钟</small>
          </strong>
        </div>
        <div className="stat">
          <span className="muted">总分</span>
          <strong style={{ fontSize: 22 }}>
            {session.subjectivePending ? "待评阅" : (session.finalScore ?? session.objectiveScore)}
          </strong>
        </div>
      </div>
      {session.subjectivePending && (
        <p className="notice">作文 / 翻译待评阅，暂不判定及格与否。参考范文为写作示例。</p>
      )}
      <div className="actions">
        <Link className="button primary" href="/mistakes">
          复习本次错题
        </Link>
        <Link className="button" href={`/practice/${paper.id}`}>
          再次练习
        </Link>
      </div>
      <h2 className="section-title">分题型得分</h2>
      {paper.sections.map((s) => {
        const qs = s.tasks.flatMap((t) => t.questions);
        const max = qs.reduce((n, q) => n + q.scoreValue, 0);
        const score = session.answers
          .filter((a) => qs.some((q) => q.id === a.questionId))
          .reduce((n, a) => n + a.score, 0);
        return (
          <div className="score-row" key={s.id}>
            <span>{typeLabels[s.type]}</span>
            <progress max={max || 1} value={score} aria-label={`${typeLabels[s.type]}得分`} />
            <span>
              {subjective(s.type) && session.subjectivePending ? "待评" : `${score} / ${max}`}
            </span>
          </div>
        );
      })}
      <div className="section-title">
        <h2>答案与解析</h2>
        <label className="muted">
          <input
            type="checkbox"
            checked={onlyWrong}
            onChange={(e) => setOnlyWrong(e.target.checked)}
          />{" "}
          仅看错题
        </label>
      </div>
      {questions
        .filter(
          (q) =>
            !onlyWrong || session.answers.find((a) => a.questionId === q.id)?.isCorrect === false
        )
        .map((q) => {
          const a = session.answers.find((a) => a.questionId === q.id);
          const sub = subjective(q.section.type);
          return (
            <details className="result-item" key={q.id}>
              <summary>
                <span className={`badge ${a?.isCorrect ? "good" : sub || q.answerRules[0]?.disputed ? "warn" : "wrong"}`}>
                  {q.answerRules[0]?.disputed ? '答案有争议 · 未判分' : sub
                    ? "待评 / 主观题"
                    : !a?.userAnswer.trim()
                      ? "未作答"
                      : a?.isCorrect
                        ? "正确"
                        : "答错"}
                </span>
                <span className="ml-3">
                  {q.questionNumber}. {q.stem}
                </span>
              </summary>
              <div className="result-details">
                <p>
                  <strong>你的答案：</strong>
                  {a?.userAnswer || "未作答"}
                </p>
                <p>
                  <strong>{sub ? "参考范文（示例）" : "参考答案"}：</strong>
                  {q.answerRules[0]?.standardAnswer || "暂无"}
                </p>
                <p>
                  <strong>解析：</strong>
                  {q.answerRules[0]?.explanation || "暂无解析"}
                </p>
                {q.section.passage && (
                  <details>
                    <summary>阅读原文</summary>
                    <div className="review-passage">{q.section.passage}</div>
                  </details>
                )}
                {q.sourceReferences.map((s) => (
                  <p className="muted" key={s.id}>
                    来源：{s.sourceFileName} ·{" "}
                    {s.pageNumber ? `第 ${s.pageNumber} 页` : "页码待核验"}
                  </p>
                ))}
              </div>
            </details>
          );
        })}
    </main>
  );
}
