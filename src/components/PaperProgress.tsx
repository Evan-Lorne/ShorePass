"use client";
import { useStudy } from "@/lib/use-study";
export default function PaperProgress({ paperId }: { paperId: string }) {
  const { data } = useStudy();
  const sessions =
    data?.sessions.filter((s) => s.paperId === paperId && s.status === "submitted") || [];
  return (
    <p className="muted">
      已完成 {sessions.length} 次
      {sessions.length
        ? ` · 最高客观题 ${Math.max(...sessions.map((s) => s.objectiveScore))} 分 · 最近 ${sessions[0].objectiveScore} 分`
        : ""}
    </p>
  );
}
