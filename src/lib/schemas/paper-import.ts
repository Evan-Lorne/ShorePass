/**
 * Zod schemas for importing exam papers into the ShorePass question bank.
 *
 * These schemas validate the structure and content of paper data before
 * it is written to the database. All `verified` fields default to false.
 * Question counts and option pool sizes are dynamic — never hardcoded.
 */

import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────

/** Supported course codes */
export const CourseCodeEnum = z.enum(["00015", "13000"]);
export type CourseCode = z.infer<typeof CourseCodeEnum>;

/** Paper regions */
export const RegionEnum = z.enum(["national", "jiangsu"]);
export type Region = z.infer<typeof RegionEnum>;

/** Paper types: exam (真题) or prediction (押题卷) */
export const PaperTypeEnum = z.enum(["exam", "prediction"]);
export type PaperType = z.infer<typeof PaperTypeEnum>;

/**
 * Section types — the 7 standard question types for 13000/00015
 * plus translation for older or regional papers.
 */
export const SectionTypeEnum = z.enum([
  "reading_judgment", // 阅读判断 (1-10)
  "reading_comprehension", // 阅读选择 (11-15)
  "summary_completion", // 概括段落大意和补全句子 (16-25)
  "sentence_fill", // 填句补文 (26-30)
  "word_cloze", // 填词补文 (31-40)
  "word_formation", // 完形补文 (41-50)
  "essay", // 短文写作 (51)
  "translation", // 翻译 (旧卷/地方卷)
]);
export type SectionType = z.infer<typeof SectionTypeEnum>;

/** Extraction methods for source traceability */
export const ExtractionMethodEnum = z.enum(["manual", "ocr", "ai_assisted"]);

/** Mastery status for review records */
export const MasteryStatusEnum = z.enum(["unmastered", "consolidating", "mastered"]);

// ─── Import sub-schemas ──────────────────────────────────────────

/** Single option for a question or a section-level option pool */
export const OptionImportSchema = z.object({
  key: z.string().min(1, "Option key is required"),
  content: z.string().min(1, "Option content is required"),
});
export type OptionImport = z.infer<typeof OptionImportSchema>;

/** Answer rule — standard answer and acceptable variants */
export const AnswerRuleImportSchema = z.object({
  standardAnswer: z.string().min(1, "Standard answer is required"),
  originalAnswer: z.string().optional(),
  revisionNotes: z.string().optional(),
  acceptableAnswers: z.array(z.string()).optional().default([]),
  caseSensitive: z.boolean().optional().default(false),
  explanation: z.string().optional(),
  disputed: z.boolean().optional().default(false),
});
export type AnswerRuleImport = z.infer<typeof AnswerRuleImportSchema>;

/** Source reference for traceability */
export const SourceReferenceImportSchema = z.object({
  sourceFileName: z.string().min(1, "Source file name is required"),
  pageNumber: z.number().int().positive().optional(),
  extractionMethod: ExtractionMethodEnum.optional(),
  correctionNotes: z.string().optional(),
});
export type SourceReferenceImport = z.infer<typeof SourceReferenceImportSchema>;

/** Single question */
export const QuestionImportSchema = z.object({
  questionNumber: z.number().int().positive(),
  stem: z.string().min(1, "Question stem is required"),
  originalStem: z.string().optional(),
  baseWord: z.string().optional(), // For word_formation (完形补文)
  scoreValue: z.number().positive(),
  verified: z.boolean().optional().default(false),
  options: z.array(OptionImportSchema).optional().default([]),
  answerRules: z.array(AnswerRuleImportSchema).min(1, "At least one answer rule is required"),
  sourceReferences: z.array(SourceReferenceImportSchema).optional().default([]),
});
export type QuestionImport = z.infer<typeof QuestionImportSchema>;

/** Task group (e.g., Task 1 and Task 2 within summary_completion) */
export const TaskImportSchema = z.object({
  title: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  instructions: z.string().optional(),
  questions: z.array(QuestionImportSchema).min(1, "At least one question is required per task"),
});
export type TaskImport = z.infer<typeof TaskImportSchema>;

/** Section — a major part of the paper (one question type) */
export const SectionImportSchema = z.object({
  type: SectionTypeEnum,
  title: z.string().min(1, "Section title is required"),
  sortOrder: z.number().int().nonnegative(),
  passage: z.string().optional(),
  instructions: z.string().optional(),
  scorePerQuestion: z.number().positive(),
  optionsPool: z.array(OptionImportSchema).optional().default([]),
  tasks: z.array(TaskImportSchema).min(1, "At least one task is required per section"),
});
export type SectionImport = z.infer<typeof SectionImportSchema>;

/** Block reason for preventing publication */
export const BlockReasonSchema = z.object({
  code: z.enum([
    "missing_passage", // 缺原文
    "missing_questions", // 缺题
    "missing_answer", // 缺答案
    "disputed_answer", // 答案争议
    "missing_source", // 缺来源信息
    "ocr_unverified", // OCR 未校验
    "incomplete_options", // 选项不完整
    "other",
  ]),
  description: z.string().optional(),
});
export type BlockReason = z.infer<typeof BlockReasonSchema>;

// ─── Top-level paper import schema ───────────────────────────────

/** Complete paper import schema */
export const PaperImportSchema = z
  .object({
    paperId: z.string().min(1, "Paper ID is required"),
    title: z.string().min(1, "Paper title is required"),
    courseCode: CourseCodeEnum,
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    region: RegionEnum,
    paperType: PaperTypeEnum,
    totalScore: z.number().int().positive().default(100),
    suggestedMinutes: z.number().int().positive().default(150),
    verified: z.boolean().optional().default(false),
    status: z.enum(["draft", "partial_verified", "verified", "blocked"]).default("draft"),
    publishBlocked: z.boolean().optional().default(true),
    blockReasons: z.array(BlockReasonSchema).optional().default([]),
    sourceFile: z.string().optional(),
    sections: z.array(SectionImportSchema).min(1, "At least one section is required"),
  })
  .refine(
    (data) => {
      // If verified is true, publishBlocked should be false and no block reasons
      if (data.verified && data.publishBlocked) {
        return false;
      }
      return true;
    },
    {
      message: "A verified paper should not be publish-blocked",
      path: ["publishBlocked"],
    }
  );

export type PaperImport = z.infer<typeof PaperImportSchema>;

// ─── ID generation helpers ───────────────────────────────────────

/**
 * Generate a stable, deterministic ID for a paper.
 * Format: "{year}-{month:02d}-{region}" or "{year}-{month:02d}-{region}-prediction-{n}"
 */
export function generatePaperId(
  year: number,
  month: number,
  region: string,
  paperType: string,
  index?: number
): string {
  const base = `${year}-${String(month).padStart(2, "0")}-${region}`;
  if (paperType === "prediction" && index !== undefined) {
    return `${base}-prediction-${index}`;
  }
  return base;
}

/**
 * Generate a stable section ID.
 */
export function generateSectionId(paperId: string, sortOrder: number, type: string): string {
  return `${paperId}_s${sortOrder}_${type}`;
}

/**
 * Generate a stable task ID.
 */
export function generateTaskId(sectionId: string, sortOrder: number): string {
  return `${sectionId}_t${sortOrder}`;
}

/**
 * Generate a stable question ID.
 */
export function generateQuestionId(paperId: string, questionNumber: number): string {
  return `${paperId}_q${questionNumber}`;
}

/**
 * Generate a stable option ID.
 */
export function generateOptionId(parentId: string, key: string): string {
  return `${parentId}_opt_${key}`;
}

/**
 * Generate a stable answer rule ID.
 */
export function generateAnswerRuleId(questionId: string): string {
  return `${questionId}_answer`;
}

/**
 * Generate a stable source reference ID.
 */
export function generateSourceReferenceId(questionId: string, index: number): string {
  return `${questionId}_src_${index}`;
}
