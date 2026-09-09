import { notFound } from "next/navigation";
import { getPaper, published } from "@/lib/paper";
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
  const mode = (await searchParams).mode === "mock" ? "mock" : "practice";
  return <ExamClient paper={paper} mode={mode} verified={published(paper)} />;
}
