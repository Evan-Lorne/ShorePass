import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runQualityCheck } from "@/lib/qualityCheck";
import { requireAdmin } from "@/lib/auth";
import { HttpError } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const { action } = await request.json(); // "publish" or "unpublish"

    const paper = await prisma.paper.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            options: true,
            tasks: {
              orderBy: { sortOrder: "asc" },
              include: {
                questions: {
                  orderBy: { questionNumber: "asc" },
                  include: {
                    answerRules: true,
                    options: true,
                    sourceReferences: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    if (action === "publish") {
      // Publishing is the transition that promotes an evidence-complete draft to
      // verified. Validate the target state while still requiring every question,
      // source page and answer rule to pass the full quality check.
      const errors = runQualityCheck({ ...paper, verified: true });

      if (errors.length > 0) {
        // Update block reasons
        await prisma.paper.update({
          where: { id },
          data: {
            publishBlocked: true,
            status: "blocked",
            blockReasons: JSON.stringify(errors),
          },
        });
        return NextResponse.json(
          { success: false, errors, message: "Quality check failed" },
          { status: 400 }
        );
      }

      await prisma.paper.update({
        where: { id },
        data: {
          verified: true,
          publishBlocked: false,
          status: "verified",
          blockReasons: null,
        },
      });
      return NextResponse.json({ success: true, message: "Published successfully" });
    } else if (action === "unpublish") {
      await prisma.paper.update({
        where: { id },
        data: {
          publishBlocked: true,
          status: "draft",
          blockReasons: JSON.stringify(["Unpublished by admin"]),
        },
      });
      return NextResponse.json({ success: true, message: "Unpublished successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
