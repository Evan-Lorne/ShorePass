/**
 * Seed script for ShorePass.
 *
 * Imports the example paper from prisma/seed-data/example-paper.json.
 * This is NOT real exam data — it is a structural example for schema validation.
 *
 * Usage:
 *   npm run db:seed
 *   # or: npx prisma db seed
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PaperImportSchema } from "../lib/schemas/paper-import";

// Resolve the path to seed data relative to this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SEED_DATA_PATH = resolve(__dirname, "../../prisma/seed-data/example-paper.json");

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  console.log("🌱 Seeding database with example data...");
  console.log(`📂 Reading: ${SEED_DATA_PATH}`);

  const content = readFileSync(SEED_DATA_PATH, "utf-8");
  const rawData = JSON.parse(content);

  const result = PaperImportSchema.safeParse(rawData);
  if (!result.success) {
    console.error("❌ Seed data validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  - [${issue.path.join(".")}] ${issue.message}`);
    }
    process.exit(1);
  }

  const data = result.data;
  const paperId = data.paperId;

  // Check if already seeded
  const existing = await prisma.paper.findUnique({ where: { id: paperId } });
  if (existing) {
    console.log(`⏭️  Paper "${paperId}" already exists. Skipping seed.`);
    return;
  }

  // Use the import logic inline (simplified for seed)
  await prisma.paper.create({
    data: {
      id: paperId,
      title: data.title,
      courseCode: data.courseCode,
      year: data.year,
      month: data.month,
      region: data.region,
      paperType: data.paperType,
      totalScore: data.totalScore,
      suggestedMinutes: data.suggestedMinutes,
      verified: data.verified,
      publishBlocked: data.publishBlocked,
      blockReasons: data.blockReasons.length > 0 ? JSON.stringify(data.blockReasons) : null,
      sourceFile: data.sourceFile ?? null,
    },
  });

  for (const section of data.sections) {
    const sectionId = `${paperId}_s${section.sortOrder}_${section.type}`;

    await prisma.section.create({
      data: {
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

    // Section-level options pool
    for (let oi = 0; oi < section.optionsPool.length; oi++) {
      const opt = section.optionsPool[oi];
      await prisma.option.create({
        data: {
          id: `${sectionId}_opt_${opt.key}`,
          sectionId,
          key: opt.key,
          content: opt.content,
          sortOrder: oi,
        },
      });
    }

    for (const task of section.tasks) {
      const taskId = `${sectionId}_t${task.sortOrder}`;

      await prisma.task.create({
        data: {
          id: taskId,
          sectionId,
          title: task.title ?? null,
          sortOrder: task.sortOrder,
          instructions: task.instructions ?? null,
        },
      });

      for (const question of task.questions) {
        const questionId = `${paperId}_q${question.questionNumber}`;

        await prisma.question.create({
          data: {
            id: questionId,
            taskId,
            questionNumber: question.questionNumber,
            stem: question.stem,
            baseWord: question.baseWord ?? null,
            scoreValue: question.scoreValue,
            verified: question.verified,
          },
        });

        // Question-level options
        for (let oi = 0; oi < question.options.length; oi++) {
          const opt = question.options[oi];
          await prisma.option.create({
            data: {
              id: `${questionId}_opt_${opt.key}`,
              questionId,
              key: opt.key,
              content: opt.content,
              sortOrder: oi,
            },
          });
        }

        // Answer rules
        for (let ai = 0; ai < question.answerRules.length; ai++) {
          const rule = question.answerRules[ai];
          await prisma.answerRule.create({
            data: {
              id:
                question.answerRules.length === 1
                  ? `${questionId}_answer`
                  : `${questionId}_answer_${ai}`,
              questionId,
              standardAnswer: rule.standardAnswer,
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
        for (let si = 0; si < question.sourceReferences.length; si++) {
          const src = question.sourceReferences[si];
          await prisma.sourceReference.create({
            data: {
              id: `${questionId}_src_${si}`,
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

  console.log(`✅ Seed completed: Paper "${data.title}" (${paperId})`);

  // Print summary
  const paperCount = await prisma.paper.count();
  const questionCount = await prisma.question.count();
  const sectionCount = await prisma.section.count();
  console.log(`📊 Database now has ${paperCount} paper(s), ${sectionCount} section(s), ${questionCount} question(s).`);
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
