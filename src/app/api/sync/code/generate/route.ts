import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { device } from "@/lib/auth";
import { api, HttpError } from "@/lib/http";
import { limit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  return api(async () => {
    const owner = await device(request);
    await limit(owner.userId, owner.id, "PairGenerate", 10);
    for (let i = 0; i < 5; i++) {
      const code = String(randomInt(100000, 1000000));
      if (await prisma.syncCode.findUnique({ where: { code } })) continue;
      const record = await prisma.syncCode.create({
        data: { code, userId: owner.userId, expiresAt: new Date(Date.now() + 600000) },
      });
      return { code: record.code, expiresAt: record.expiresAt };
    }
    throw new HttpError(503, "请稍后重新生成同步码。");
  });
}
