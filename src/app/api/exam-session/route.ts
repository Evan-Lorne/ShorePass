import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { device } from "@/lib/auth";
import { api, HttpError } from "@/lib/http";
import { getPaper, published } from "@/lib/paper";
export async function POST(request: Request) {
  return api(async () => {
    const owner = await device(request);
    const { paperId, mode, sessionId } = z
      .object({
        paperId: z.string(),
        mode: z.enum(["mock", "practice"]),
        sessionId: z.string().optional(),
      })
      .parse(await request.json());
    const paper = await getPaper(paperId);
    if (!paper) throw new HttpError(404, "试卷不存在。");
    if (mode === "mock" && !published(paper))
      throw new HttpError(403, "试卷尚未通过完整核验，暂不可模考。");
    if (!paper.sections.some((s) => s.tasks.some((t) => t.questions.length)))
      throw new HttpError(400, "试卷暂无题目。");
    const session = await prisma.$transaction(async (tx) => {
      if (sessionId) {
        const found = await tx.examSession.findFirst({
          where: { id: sessionId, userId: owner.userId, paperId, mode },
          include: { answers: true },
        });
        if (found) return found;
        throw new HttpError(404, "答题记录不存在。");
      }
      const found = await tx.examSession.findFirst({
        where: { userId: owner.userId, paperId, mode, status: "in_progress" },
        orderBy: { startTime: "desc" },
        include: { answers: true },
      });
      if (found) return found;
      const version = await tx.paperVersion.findFirst({
        where: { paperId },
        orderBy: { version: "desc" },
      });
      return tx.examSession.create({
        data: {
          userId: owner.userId,
          paperId,
          mode,
          paperVersion: version?.version || 1,
          endTime: new Date(Date.now() + paper.suggestedMinutes * 60000),
        },
        include: { answers: true },
      });
    });
    return { session, serverNow: Date.now() };
  });
}
