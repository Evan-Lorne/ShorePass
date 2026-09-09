import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { subjective } from "@/lib/grading";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    requireAdmin(request);
    const { answerId } = await params;
    const { score, gradeReason, gradeTier, gradedBy } = await request.json();

    const answer = await prisma.examAnswer.findUnique({
      where: { id: answerId },
      include: {
        examSession: true,
        question: { include: { task: { include: { section: true } } } },
      },
    });

    if (!answer) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    if (
      !subjective(answer.question.task.section.type) ||
      answer.examSession.status !== "submitted" ||
      typeof score !== "number" ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > answer.question.scoreValue
    )
      return NextResponse.json({ error: "评分对象或分数不正确" }, { status: 400 });

    const updatedAnswer = await prisma.examAnswer.update({
      where: { id: answerId },
      data: {
        score,
        gradeReason,
        gradeTier,
        gradedBy,
        gradeVersion: { increment: 1 },
        isCorrect: score > 0, // null implies pending, > 0 implies graded and true if we want, or we leave it true/false based on threshold
      },
    });

    // Update Session overall scores
    const session = await prisma.examSession.findUnique({
      where: { id: answer.examSessionId },
      include: { answers: true },
    });

    let newFinal = 0;
    let newAiScore = 0;
    let subjectivePending = false;

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // Recalculate
    for (const ans of session.answers) {
      if (ans.gradedBy === "AI") {
        newAiScore += ans.score;
      }

      // Let's rely on finalScore
      newFinal += ans.score;

      // Subjective pending check
      // For subjective questions, if gradedBy is empty and it's essay, it's pending.
      // But we don't have question section type here easily unless we join.
      // We'll just assume if there's any answer with `isCorrect === null` it's pending.
      if (ans.isCorrect === null) {
        subjectivePending = true;
      }
    }

    await prisma.examSession.update({
      where: { id: session.id },
      data: {
        aiScore: newAiScore,
        finalScore: subjectivePending ? null : newFinal,
        subjectivePending,
      },
    });

    return NextResponse.json({ success: true, answer: updatedAnswer });
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
