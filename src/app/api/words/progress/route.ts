import { z } from "zod";
import { device } from "@/lib/auth";
import { api } from "@/lib/http";
import { prisma } from "@/lib/prisma";
export async function GET(request: Request) {
  return api(async () => {
    const owner = await device(request);
    return { progress: await prisma.wordProgress.findMany({ where: { userId: owner.userId } }) };
  });
}
export async function POST(request: Request) {
  return api(async () => {
    const owner = await device(request);
    const { wordId, status } = z
      .object({ wordId: z.string(), status: z.enum(["known", "forgotten"]) })
      .parse(await request.json());
    return prisma.wordProgress.upsert({
      where: { userId_wordId: { userId: owner.userId, wordId } },
      create: { userId: owner.userId, wordId, status },
      update: { status, lastSeenAt: new Date() },
    });
  });
}
