import { prisma } from "./prisma";
import { runPreviewQualityCheck, runQualityCheck } from "./qualityCheck";

export const paperInclude = {
  sections: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      options: { orderBy: { sortOrder: "asc" as const } },
      tasks: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          questions: {
            orderBy: { questionNumber: "asc" as const },
            include: {
              options: { orderBy: { sortOrder: "asc" as const } },
              answerRules: true,
              sourceReferences: true,
            },
          },
        },
      },
    },
  },
};
export function getPaper(id: string) {
  return prisma.paper.findUnique({ where: { id }, include: paperInclude });
}
export type StudyPaper = NonNullable<Awaited<ReturnType<typeof getPaper>>>;
export type StudyQuestion = StudyPaper["sections"][number]["tasks"][number]["questions"][number];
export function previewReady(paper: StudyPaper) {
  return runPreviewQualityCheck(paper).length === 0;
}
export function published(paper: StudyPaper) {
  return (
    paper.verified &&
    !paper.publishBlocked &&
    paper.status === "verified" &&
    runQualityCheck(paper).length === 0
  );
}
export const typeLabels: Record<string, string> = {
  reading_judgment: "阅读判断",
  reading_comprehension: "阅读选择",
  summary_completion: "概括大意与补全句子",
  sentence_fill: "填句补文",
  word_cloze: "填词补文",
  word_formation: "完形补文",
  essay: "短文写作",
  translation: "翻译",
};
