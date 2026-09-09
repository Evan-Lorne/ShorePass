import { z } from "zod";
import { api, HttpError } from "@/lib/http";
import { device } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { grade, mastery } from "@/lib/grading";
export async function POST(request: Request) {
  return api(async () => {
    const owner = await device(request);
    const input = z
      .object({
        recordId: z.string(),
        answer: z.string().trim().min(1).max(20000),
        attemptId: z.string().uuid(),
      })
      .parse(await request.json());
    return prisma.$transaction(async (tx) => {
      const record = await tx.reviewRecord.findFirst({
        where: { id: input.recordId, userId: owner.userId },
        include: {
          question: {
            include: {
              answerRules: true,
              task: {
                include: {
                  section: {
                    include: {
                      paper: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!record) throw new HttpError(404, "错题不存在。");
      const receiptId = `review:${owner.userId}:${input.attemptId}`;
      const previous = await tx.syncLog.findUnique({ where: { id: receiptId } });
      if (previous) {
        if (previous.entityId !== record.id) throw new HttpError(409, "重复的复练编号。");
        return JSON.parse(previous.action);
      }
      const correct = grade(
        record.question.task.section.type,
        input.answer,
        record.question.answerRules[0]
      );
      if (correct === null) throw new HttpError(400, "主观题或有争议的答案不能自动判分。");
      const version = record.question.task.section.paper.versions[0]?.version || 1;
      const updated = await tx.reviewRecord.update({
        where: { id: record.id },
        data: {
          userAnswer: input.answer,
          isCorrect: correct,
          ...mastery(record.consecutiveCorrect, correct, record.paperVersion === version),
          attemptedAt: new Date(),
          paperVersion: version,
        },
      });
      const result = { correct, record: updated, rule: record.question.answerRules[0] };
      await tx.syncLog.create({
        data: {
          id: receiptId,
          userId: owner.userId,
          deviceId: owner.id,
          entityType: "ReviewAttempt",
          entityId: record.id,
          action: JSON.stringify(result),
        },
      });
      return result;
    });
  });
}
