import { prisma } from "@/lib/prisma";
import { device } from "@/lib/auth";
import { api } from "@/lib/http";
import { submitSession, saveDraft } from "@/lib/session";
import { draftSchema } from "@/lib/draft-schema";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const owner = await device(request),
      { id } = await params;
    const raw = await request.text();
    const input = raw ? draftSchema.parse(JSON.parse(raw)) : undefined;
    const session = await prisma.$transaction(
      async (tx) => {
        const current = await tx.examSession.findFirst({ where: { id, userId: owner.userId } });
        if (
          current?.status === "in_progress" &&
          input &&
          (current.mode !== "mock" || current.endTime.getTime() > Date.now())
        )
          await saveDraft(tx, id, owner.userId, input);
        return submitSession(tx, id, owner.userId);
      },
      { timeout: 20000 }
    );
    return { session };
  });
}
