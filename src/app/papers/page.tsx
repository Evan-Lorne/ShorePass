import Link from "next/link";
import { BookOpen, ArrowRight, Filter } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { paperInclude, previewReady, published } from "@/lib/paper";
import PaperProgress from "@/components/PaperProgress";
import Select from "@/components/Select";
export const dynamic = "force-dynamic";
export default async function PapersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const text = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const year = Number(text("year")) || undefined;
  const papers = await prisma.paper.findMany({
    where: {
      ...(year ? { year } : {}),
      ...(text("region") ? { region: text("region") } : {}),
      ...(text("courseCode") ? { courseCode: text("courseCode") } : {}),
      ...(text("paperType") ? { paperType: text("paperType") } : {}),
    },
    include: paperInclude,
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  const visible = papers.filter(
    (p) =>
      !/^(test|example)[_-]/i.test(p.id) &&
      !p.sections.some((s) =>
        s.tasks.some((t) => t.questions.some((q) => q.stem === "Sample stem"))
      )
  );
  const previewableCount = visible.filter(previewReady).length;
  const blockedPreviewCount = visible.length - previewableCount;
  return (
    <main className="page">
      <div className="page-title">
        <div>
          <h1>试卷库</h1>
          <p className="muted">英语（二） / 英语专升本 · 00015 / 13000</p>
        </div>
        <BookOpen size={30} color="#72958a" />
      </div>
      <form className="filters">
        <div>
          <label htmlFor="year" className="field-label">
            年份
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min="2000"
            max="2100"
            placeholder="全部年份"
            defaultValue={year || ""}
          />
        </div>
        <div>
          <label htmlFor="region" className="field-label">
            地区
          </label>
          <Select id="region" name="region" defaultValue={text("region")}>
            <option value="">全部地区</option>
            <option value="national">全国卷</option>
            <option value="jiangsu">江苏卷</option>
          </Select>
        </div>
        <div>
          <label htmlFor="courseCode" className="field-label">
            课程
          </label>
          <Select id="courseCode" name="courseCode" defaultValue={text("courseCode")}>
            <option value="">全部课程</option>
            <option value="00015">00015 英语（二）</option>
            <option value="13000">13000 英语专升本</option>
          </Select>
        </div>
        <div>
          <label htmlFor="paperType" className="field-label">
            试卷类型
          </label>
          <Select id="paperType" name="paperType" defaultValue={text("paperType")}>
            <option value="">全部类型</option>
            <option value="exam">历年真题</option>
            <option value="prediction">模拟 / 押题</option>
          </Select>
        </div>
        <button className="button primary">
          <Filter size={16} />
          筛选
        </button>
        <Link className="button" href="/papers">
          重置
        </Link>
      </form>
      {visible.length > 0 && !visible.some(published) && (
        <p className="notice">
          当前无已核验试卷；{previewableCount} 套可作为待核验练习预览，暂不提供正式模考。
        </p>
      )}
      {blockedPreviewCount > 0 && (
        <p className="notice error">
          另有 {blockedPreviewCount} 套含缺失原文或占位题目，已暂停练习并标记为“待整理”。
        </p>
      )}
      <div className="paper-list">
        {visible.map((p) => {
          const count = p.sections.flatMap((s) => s.tasks.flatMap((t) => t.questions)).length;
          const ready = published(p);
          const canPreview = previewReady(p);
          return (
            <article className="paper-item" key={p.id}>
              <div className="paper-meta">
                <span className={`badge ${ready ? "good" : "warn"}`}>
                  {ready ? "已核验" : canPreview ? "待核验预览" : "待整理"}
                </span>
                <span>
                  {p.paperType === "exam" ? "历年真题" : "模拟 / 押题"} · {p.courseCode}
                </span>
              </div>
              <h2>{p.title}</h2>
              <div className="paper-meta">
                <span>{p.region === "national" ? "全国卷" : "江苏卷"}</span>
                <span>{count} 题</span>
                <span>{p.totalScore} 分</span>
                <span>{p.suggestedMinutes} 分钟</span>
              </div>
              <PaperProgress paperId={p.id} />
              <footer>
                <span className="muted">{p.sections.length} 个题型部分</span>
                <Link className={`button ${canPreview ? "primary" : ""}`} href={`/papers/${p.id}`}>
                  查看试卷
                  <ArrowRight size={16} />
                </Link>
              </footer>
            </article>
          );
        })}
      </div>
      {visible.length === 0 && (
        <div className="empty">
          <BookOpen size={32} />
          <p>没有符合条件的试卷</p>
          <Link href="/papers" className="button mt-4">
            重置筛选
          </Link>
        </div>
      )}
    </main>
  );
}
