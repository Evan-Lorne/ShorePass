import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaper, published } from "@/lib/paper";
import { typeLabels } from "@/lib/study-types";
export default async function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const paper = await getPaper((await params).id);
  if (!paper) notFound();
  const ready = published(paper);
  return (
    <main className="page">
      <Link className="muted" href="/papers">
        ← 返回试卷库
      </Link>
      <div className="page-title mt-6">
        <div>
          <h1>{paper.title}</h1>
          <p className="muted">
            {paper.courseCode} · {paper.totalScore} 分 · {paper.suggestedMinutes} 分钟
          </p>
        </div>
      </div>
      {!ready && (
        <p className="notice">
          此卷尚未通过完整核验，当前为预览内容。题干、答案与来源可能仍需校订。
        </p>
      )}
      <div className="actions">
        <Link className="button primary" href={`/practice/${paper.id}/exam?mode=practice&new=1`}>
          {ready ? "开始练习" : "开始预览练习"}
        </Link>
        {ready ? (
          <Link className="button" href={`/practice/${paper.id}/exam?mode=mock&new=1`}>
            全真模考
          </Link>
        ) : (
          <button className="button" disabled>
            模考待核验
          </button>
        )}
      </div>
      <h2 className="section-title">试卷结构</h2>
      {paper.sections.map((s) => (
        <div key={s.id} className="record-row">
          <div>
            <h3>{typeLabels[s.type]}</h3>
            <p className="muted">
              {s.tasks.flatMap((t) => t.questions).length} 题 · 每题 {s.scorePerQuestion} 分
            </p>
          </div>
          <span className="badge">
            {s.tasks.flatMap((t) => t.questions).reduce((sum, q) => sum + q.scoreValue, 0)} 分
          </span>
        </div>
      ))}
      <p className="muted mt-6">来源：{paper.sourceFile || "待补充"}</p>
    </main>
  );
}
