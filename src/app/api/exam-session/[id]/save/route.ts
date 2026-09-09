import { prisma } from "@/lib/prisma";
import { device } from "@/lib/auth";
import { api } from "@/lib/http";
import { saveDraft } from "@/lib/session";
import { draftSchema } from "@/lib/draft-schema";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const owner = await device(request),
      { id } = await params;
    const input = draftSchema.parse(await request.json());
    const session = await prisma.$transaction((tx) => saveDraft(tx, id, owner.userId, input), {
      timeout: 15000,
    });
    await prisma.deviceToken.update({ where: { id: owner.id }, data: { lastSyncAt: new Date() } });
    return { session };
  });
}
