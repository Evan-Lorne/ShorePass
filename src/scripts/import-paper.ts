/**
 * Paper import script for ShorePass.
 *
 * Reads a JSON file, validates it with Zod, and writes to SQLite via Prisma.
 *
 * Usage:
 *   npx tsx src/scripts/import-paper.ts <json-file-path>
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { prisma } from "@/lib/prisma";
import {
  PaperImportSchema,
  generateSectionId,
  generateTaskId,
  generateQuestionId,
  generateOptionId,
  generateAnswerRuleId,
  generateSourceReferenceId,
} from "../lib/schemas/paper-import";
import type { PaperImport } from "../lib/schemas/paper-import";


/**
 * Import a validated paper object into the database.
 */
export async function importPaper(data: PaperImport): Promise<void> {
  const paperId = data.paperId;

  await prisma.$transaction(async (tx) => {
    // 1. Create Paper
    await tx.paper.upsert({
      where: { id: paperId },
      update: {
        title: data.title,
        courseCode: data.courseCode,
        year: data.year,
        month: data.month,
        region: data.region,
        paperType: data.paperType,
        totalScore: data.totalScore,
        suggestedMinutes: data.suggestedMinutes,
        status: data.status,
        verified: data.verified,
        publishBlocked: data.publishBlocked,
        blockReasons: data.blockReasons.length > 0 ? JSON.stringify(data.blockReasons) : null,
        sourceFile: data.sourceFile ?? null,
      },
      create: {
        id: paperId,
        title: data.title,
        courseCode: data.courseCode,
        year: data.year,
        month: data.month,
        region: data.region,
        paperType: data.paperType,
        totalScore: data.totalScore,
        suggestedMinutes: data.suggestedMinutes,
        status: data.status,
        verified: data.verified,
        publishBlocked: data.publishBlocked,
        blockReasons: data.blockReasons.length > 0 ? JSON.stringify(data.blockReasons) : null,
        sourceFile: data.sourceFile ?? null,
      },
    });

    // 2. Create Sections, Tasks, Questions, Options, AnswerRules, SourceReferences
    for (const section of data.sections) {
      const sectionId = generateSectionId(paperId, section.sortOrder, section.type);

      await tx.section.upsert({
        where: { id: sectionId },
        update: {
          type: section.type,
          title: section.title,
          sortOrder: section.sortOrder,
          passage: section.passage ?? null,
          instructions: section.instructions ?? null,
          scorePerQuestion: section.scorePerQuestion,
        },
        create: {
          id: sectionId,
          paperId,
          type: section.type,
          title: section.title,
          sortOrder: section.sortOrder,
          passage: section.passage ?? null,
          instructions: section.instructions ?? null,
          scorePerQuestion: section.scorePerQuestion,
        },
      });

      // Section-level options pool (e.g., word_cloze 12-word pool)
      const sectionOptionIds = (section.optionsPool || []).map((option) =>
        generateOptionId(sectionId, option.key),
      );
      await tx.option.deleteMany({
        where: {
          sectionId,
          ...(sectionOptionIds.length > 0 ? { id: { notIn: sectionOptionIds } } : {}),
        },
      });
      for (let oi = 0; oi < (section.optionsPool || []).length; oi++) {
        const opt = section.optionsPool[oi];
        const optionId = generateOptionId(sectionId, opt.key);

        await tx.option.upsert({
          where: { id: optionId },
          update: {
            key: opt.key,
            content: opt.content,
            sortOrder: oi,
          },
          create: {
            id: optionId,
            sectionId,
            key: opt.key,
            content: opt.content,
            sortOrder: oi,
          },
        });
      }

      for (const task of section.tasks) {
        const taskId = generateTaskId(sectionId, task.sortOrder);

        await tx.task.upsert({
          where: { id: taskId },
          update: {
            title: task.title ?? null,
            sortOrder: task.sortOrder,
            instructions: task.instructions ?? null,
          },
          create: {
            id: taskId,
            sectionId,
            title: task.title ?? null,
            sortOrder: task.sortOrder,
            instructions: task.instructions ?? null,
          },
        });

        for (const question of task.questions) {
          const questionId = generateQuestionId(paperId, question.questionNumber);

          await tx.question.upsert({
            where: { id: questionId },
            update: {
              taskId,
              questionNumber: question.questionNumber,
              stem: question.stem,
              originalStem: question.originalStem ?? null,
              baseWord: question.baseWord ?? null,
              scoreValue: question.scoreValue,
              verified: question.verified,
            },
            create: {
              id: questionId,
              taskId,
              questionNumber: question.questionNumber,
              stem: question.stem,
              originalStem: question.originalStem ?? null,
              baseWord: question.baseWord ?? null,
              scoreValue: question.scoreValue,
              verified: question.verified,
            },
          });

          // Question-level options
          const questionOptionIds = (question.options || []).map((option) =>
            generateOptionId(questionId, option.key),
          );
          await tx.option.deleteMany({
            where: {
              questionId,
              ...(questionOptionIds.length > 0
                ? { id: { notIn: questionOptionIds } }
                : {}),
            },
          });
          for (let oi = 0; oi < (question.options || []).length; oi++) {
            const opt = question.options[oi];
            const optionId = generateOptionId(questionId, opt.key);

            await tx.option.upsert({
              where: { id: optionId },
              update: {
                key: opt.key,
                content: opt.content,
                sortOrder: oi,
              },
              create: {
                id: optionId,
                questionId,
                key: opt.key,
                content: opt.content,
                sortOrder: oi,
              },
            });
          }

          // Answer rules
          for (let ai = 0; ai < (question.answerRules || []).length; ai++) {
            const rule = question.answerRules[ai];
            const ruleId =
              (question.answerRules || []).length === 1
                ? generateAnswerRuleId(questionId)
                : `${generateAnswerRuleId(questionId)}_${ai}`;

            await tx.answerRule.upsert({
              where: { id: ruleId },
              update: {
                standardAnswer: rule.standardAnswer,
                originalAnswer: rule.originalAnswer ?? null,
                revisionNotes: rule.revisionNotes ?? null,
                acceptableAnswers:
                  rule.acceptableAnswers.length > 0
                    ? JSON.stringify(rule.acceptableAnswers)
                    : null,
                caseSensitive: rule.caseSensitive,
                explanation: rule.explanation ?? null,
                disputed: rule.disputed,
              },
              create: {
                id: ruleId,
                questionId,
                standardAnswer: rule.standardAnswer,
                originalAnswer: rule.originalAnswer ?? null,
                revisionNotes: rule.revisionNotes ?? null,
                acceptableAnswers:
                  rule.acceptableAnswers.length > 0
                    ? JSON.stringify(rule.acceptableAnswers)
                    : null,
                caseSensitive: rule.caseSensitive,
                explanation: rule.explanation ?? null,
                disputed: rule.disputed,
              },
            });
          }

          // Source references
          for (let si = 0; si < (question.sourceReferences || []).length; si++) {
            const src = question.sourceReferences[si];
            const srcId = generateSourceReferenceId(questionId, si);

            await tx.sourceReference.upsert({
              where: { id: srcId },
              update: {
                sourceFileName: src.sourceFileName,
                pageNumber: src.pageNumber ?? null,
                extractionMethod: src.extractionMethod ?? null,
                correctionNotes: src.correctionNotes ?? null,
              },
              create: {
                id: srcId,
                questionId,
                sourceFileName: src.sourceFileName,
                pageNumber: src.pageNumber ?? null,
                extractionMethod: src.extractionMethod ?? null,
                correctionNotes: src.correctionNotes ?? null,
              },
            });
          }
        }
      }
    }
  });

  console.log(`✅ Paper "${data.title}" (${paperId}) imported successfully.`);
}

/**
 * CLI entry point.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npx tsx src/scripts/import-paper.ts <json-file-path>");
    process.exit(1);
  }

  const filePath = resolve(args[0]);
  console.log(`📂 Reading: ${filePath}`);

  let rawData: unknown;
  try {
    const content = readFileSync(filePath, "utf-8");
    rawData = JSON.parse(content);
  } catch (err) {
    console.error(`❌ Failed to read or parse JSON file: ${err}`);
    process.exit(1);
  }

  console.log("🔍 Validating with Zod schema...");
  const result = PaperImportSchema.safeParse(rawData);

  if (!result.success) {
    console.error("❌ Validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  - [${issue.path.join(".")}] ${issue.message}`);
    }
    process.exit(1);
  }

  console.log("✅ Validation passed.");
  await importPaper(result.data);
}

if (require.main === module) {
main()
  .catch((err) => {
    console.error("❌ Import failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
}
