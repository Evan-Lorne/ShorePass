import type { ExamSession, ExamAnswer, ReviewRecord } from "@prisma/client";
import type { StudyQuestion, StudyPaper } from "./paper";
type Json<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Json<U>[]
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;
export type Session = Json<ExamSession & { answers: ExamAnswer[]; paper?: { title: string } }>;
export type Mistake = Json<ReviewRecord> & {
  question: StudyQuestion & {
    task: {
      section: StudyPaper["sections"][number] & { paper: { title: string; verified: boolean } };
    };
  };
};
export type StudyData = {
  userId: string;
  sessions: Session[];
  mistakes: Mistake[];
  lastSyncAt: string | null;
};
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
