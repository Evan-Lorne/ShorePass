"use client";
import Link from "next/link";
import { BookOpen, BookMarked, ArrowRight } from "lucide-react";
import { useStudy } from "@/lib/use-study";
export default function Home() {
  const { data, error, refresh } = useStudy();
  const completed = data?.sessions.filter((s) => s.status === "submitted") || [];
  const answered = completed.flatMap((s) => s.answers).filter((a) => a.userAnswer.trim());
  const objective = answered.filter((a) => a.isCorrect !== null);
  const mistakes = data?.mistakes.filter((m) => m.masteryStatus !== "mastered").length || 0;
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <h1>今天，向上岸再近一步</h1>
          <p className="muted">自考英语 · 我的学习记录</p>
        </div>
        <span className="badge good">ShorePass</span>
      </div>
      {error && (
        <p role="alert" className="notice error">
          {error}
          <button className="button ml-3" onClick={refresh}>
            重试
          </button>
        </p>
      )}
      <div className="stats">
        <div className="stat">
          <span className="muted">累计作答</span>
          <strong>
            {data ? answered.length : "—"}
            <small> 题</small>
          </strong>
        </div>
        <div className="stat">
          <span className="muted">客观题正确率</span>
          <strong>
            {objective.length
              ? Math.round((objective.filter((a) => a.isCorrect).length / objective.length) * 100)
              : "—"}
            <small> %</small>
          </strong>
        </div>
        <div className="stat">
          <span className="muted">待复习错题</span>
          <strong>
            {data ? mistakes : "—"}
            <small> 题</small>
          </strong>
        </div>
        <div className="stat">
          <span className="muted">完成练习</span>
          <strong>
            {data ? completed.length : "—"}
            <small> 次</small>
          </strong>
        </div>
      </div>
      <div className="actions">
        <Link href="/papers" className="button primary">
          <BookOpen size={18} />
          开始做题
        </Link>
        <Link href="/mistakes" className="button">
          <BookMarked size={18} />
          复习错题
        </Link>
      </div>
      <div className="section-title">
        <h2>继续学习</h2>
        <Link href="/papers" className="muted">
          全部试卷 <ArrowRight size={14} className="inline" />
        </Link>
      </div>
      {!data ? (
        <p className="empty">正在加载学习记录…</p>
      ) : !data.sessions.length ? (
        <div className="empty">
          <BookOpen size={36} />
          <p>还没有做题记录</p>
          <Link className="button mt-4" href="/papers">
            选择一套试卷
          </Link>
        </div>
      ) : (
        data.sessions.slice(0, 20).map((s) => (
          <article className="record-row" key={s.id}>
            <div>
              <h3>{s.paper?.title}</h3>
              <p className="muted">
                {s.mode === "mock" ? "模考" : "练习"} ·{" "}
                {new Date(s.startTime).toLocaleDateString("zh-CN")} ·{" "}
                {s.status === "submitted"
                  ? `客观题 ${s.objectiveScore} 分${s.subjectivePending ? " · 主观题待评" : ""}`
                  : `已答 ${s.answers.filter((a) => a.userAnswer.trim()).length} 题`}
              </p>
            </div>
            <Link
              className="button"
              href={`/practice/${s.paperId}/exam?mode=${s.mode}&session=${s.id}`}
            >
              {s.status === "submitted" ? "查看结果" : "继续做题"}
              <ArrowRight size={16} />
            </Link>
          </article>
        ))
      )}
    </main>
  );
}
