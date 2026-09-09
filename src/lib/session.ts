import { Prisma } from "@prisma/client";
import { HttpError } from "./http";
import { grade, subjective } from "./grading";
import { paperInclude } from "./paper";

export async function saveDraft(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
  input: {
    revision: number;
    answers: Record<string, string>;
    marked: string[];
    currentIndex: number;
    elapsed: number;
  }
) {
  const session = await tx.examSession.findFirst({
    where: { id, userId },
    include: { paper: { include: paperInclude } },
  });
  if (!session) throw new HttpError(404, "答题记录不存在。");
  if (session.status === "submitted") throw new HttpError(409, "这份试卷已交卷，请刷新查看结果。");
  if (session.mode === "mock" && session.endTime.getTime() <= Date.now())
    throw new HttpError(410, "模考时间已结束，将按最后成功保存的答案结算。");
  if (session.revision !== input.revision)
    throw new HttpError(409, "另一台设备已更新答题记录。请先载入最新进度。");
  const validIds = new Set(
    session.paper.sections.flatMap((s) => s.tasks.flatMap((t) => t.questions.map((q) => q.id)))
  );
  if (
    Object.keys(input.answers).some((q) => !validIds.has(q)) ||
    input.marked.some((q) => !validIds.has(q))
  )
    throw new HttpError(400, "题目不属于当前试卷。");
  for (const [questionId, userAnswer] of Object.entries(input.answers)) {
    const existing = await tx.examAnswer.findFirst({ where: { examSessionId: id, questionId } });
    if (existing) await tx.examAnswer.update({ where: { id: existing.id }, data: { userAnswer } });
    else await tx.examAnswer.create({ data: { examSessionId: id, questionId, userAnswer } });
  }
  return tx.examSession.update({
    where: { id },
    data: {
      revision: { increment: 1 },
      draftState: JSON.stringify({
        marked: input.marked,
        currentIndex: input.currentIndex,
        elapsed: input.elapsed,
      }),
    },
    include: { answers: true },
  });
}
export async function submitSession(tx: Prisma.TransactionClient, id: string, userId: string) {
  const session = await tx.examSession.findFirst({
    where: { id, userId },
    include: { answers: true, paper: { include: paperInclude } },
  });
  if (!session) throw new HttpError(404, "答题记录不存在。");
  if (session.status === "submitted") return session;
  let objectiveScore = 0,
    subjectivePending = false;
  for (const section of session.paper.sections)
    for (const task of section.tasks)
      for (const q of task.questions) {
        const existing = session.answers.find((a) => a.questionId === q.id);
        const value = existing?.userAnswer || "";
        const isCorrect = grade(section.type, value, q.answerRules[0]);
        const score = isCorrect ? q.scoreValue : 0;
        objectiveScore += score;
        if (subjective(section.type)) subjectivePending = true;
        if (existing)
          await tx.examAnswer.update({ where: { id: existing.id }, data: { isCorrect, score } });
        else
          await tx.examAnswer.create({
            data: { examSessionId: id, questionId: q.id, userAnswer: "", isCorrect, score },
          });
        // Only independent mistake reviews advance mastery; a new error always resets it.
        if (isCorrect === false) {
          const previous = await tx.reviewRecord.findFirst({
            where: { userId, questionId: q.id },
            orderBy: { attemptedAt: "desc" },
          });
          const data = {
            userAnswer: value,
            isCorrect: false,
            consecutiveCorrect: 0,
            masteryStatus: "unmastered",
            paperVersion: session.paperVersion,
            sessionId: id,
            attemptedAt: new Date(),
          };
          if (previous) await tx.reviewRecord.update({ where: { id: previous.id }, data });
          else
            await tx.reviewRecord.create({
              data: { ...data, id: crypto.randomUUID(), userId, questionId: q.id },
            });
        }
      }
  return tx.examSession.update({
    where: { id },
    data: {
      status: "submitted",
      submittedAt: new Date(),
      objectiveScore,
      subjectivePending,
      finalScore: subjectivePending ? null : objectiveScore,
      revision: { increment: 1 },
    },
    include: { answers: true },
  });
}
