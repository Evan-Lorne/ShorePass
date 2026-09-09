import { prisma } from "./prisma";
import { HttpError } from "./http";
export async function limit(userId: string, deviceId: string, action: string, maximum: number) {
  await prisma.$transaction(async (tx) => {
    const count = await tx.syncLog.count({
      where: { userId, entityType: action, timestamp: { gte: new Date(Date.now() - 600000) } },
    });
    if (count >= maximum) throw new HttpError(429, "操作过于频繁，请十分钟后重试。");
    await tx.syncLog.create({
      data: { userId, deviceId, entityType: action, entityId: deviceId, action: "attempt" },
    });
  });
}
