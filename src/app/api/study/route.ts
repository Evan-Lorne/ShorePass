import { api } from "@/lib/http";
import { device } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(request: Request) {
  return api(async () => {
    const owner = await device(request);
    const sessions = await prisma.examSession.findMany({
      where: { userId: owner.userId },
      orderBy: { startTime: "desc" },
      include: { paper: { select: { title: true } }, answers: true },
    });
    const mistakes = await prisma.reviewRecord.findMany({
      where: { userId: owner.userId },
      orderBy: { attemptedAt: "desc" },
      include: {
        question: {
          include: {
            options: true,
            answerRules: true,
            sourceReferences: true,
            task: {
              include: {
                section: {
                  include: {
                    options: true,
                    paper: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
                  },
                },
              },
            },
          },
        },
      },
    });
    const seen = new Set<string>();
    return {
      userId: owner.userId,
      sessions,
      mistakes: mistakes
        .filter((r) => {
          if (seen.has(r.questionId)) return false;
          seen.add(r.questionId);
          return true;
        })
        .map((r) =>
          r.paperVersion === (r.question.task.section.paper.versions[0]?.version || 1)
            ? r
            : { ...r, consecutiveCorrect: 0, masteryStatus: "unmastered" }
        ),
      lastSyncAt: owner.lastSyncAt,
    };
  });
}
