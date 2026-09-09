import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { device } from "@/lib/auth";
import { api, HttpError } from "@/lib/http";
import { limit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  return api(async () => {
    const owner = await device(request);
    const { code } = z.object({ code: z.string().regex(/^\d{6}$/) }).parse(await request.json());
    await limit(owner.userId, owner.id, "PairConsume", 8);
    return prisma.$transaction(async (tx) => {
      const entry = await tx.syncCode.findUnique({ where: { code } });
      if (!entry || entry.used || entry.expiresAt.getTime() <= Date.now())
        throw new HttpError(400, "同步码无效、已使用或已过期。");
      if (entry.userId === owner.userId)
        throw new HttpError(400, "这两台设备已经属于同一学习账户。");
      await tx.syncCode.update({ where: { id: entry.id }, data: { used: true } });
      await tx.examSession.updateMany({
        where: { userId: owner.userId },
        data: { userId: entry.userId },
      });
      await tx.reviewRecord.updateMany({
        where: { userId: owner.userId },
        data: { userId: entry.userId },
      });
      const words = await tx.wordProgress.findMany({ where: { userId: owner.userId } });
      for (const word of words)
        await tx.wordProgress.upsert({
          where: { userId_wordId: { userId: entry.userId, wordId: word.wordId } },
          create: {
            userId: entry.userId,
            wordId: word.wordId,
            status: word.status,
            lastSeenAt: word.lastSeenAt,
          },
          update: {},
        });
      await tx.deviceToken.updateMany({
        where: { userId: owner.userId },
        data: { userId: entry.userId, lastSyncAt: new Date() },
      });
      return { success: true };
    });
  });
}
