import { notFound } from "next/navigation";
import Link from "next/link";
import { getPaper, previewReady, published } from "@/lib/paper";
import ExamClient from "./ExamClient";
export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const paper = await getPaper((await params).id);
  if (!paper) notFound();
  if (!previewReady(paper)) {
    return (
      <main className="page">
        <h1>试卷暂不可练习</h1>
        <p className="notice error">此卷存在缺失原文或占位题目，需要先完成内容整理。</p>
        <Link className="button mt-5" href={`/papers/${paper.id}`}>返回试卷</Link>
      </main>
    );
  }
  const mode = (await searchParams).mode === "mock" ? "mock" : "practice";
  return <ExamClient paper={paper} mode={mode} verified={published(paper)} />;
}
