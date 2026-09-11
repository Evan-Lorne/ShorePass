const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function cleanTestData() {
  console.log("🧹 Step 1: Cleaning test and placeholder data...");
  const testIds = [
    'test-2024-04',
    'example-2099-01-national',
    'test_paper_1',
    'test_paper_2',
    '2024-04-jiangsu' // old dummy paper to be replaced with real Jiangsu exam
  ];

  for (const id of testIds) {
    const existing = await prisma.paper.findUnique({ where: { id } });
    if (existing) {
      console.log(`  Deleting test/dummy paper: ${id} (${existing.title})`);
      
      // Get all question IDs
      const sections = await prisma.section.findMany({
        where: { paperId: id },
        include: { tasks: { include: { questions: true } } }
      });
      const qIds = sections.flatMap(s => s.tasks.flatMap(t => t.questions.map(q => q.id)));

      await prisma.$transaction(async (tx) => {
        // Delete review records & exam answers
        if (qIds.length > 0) {
          await tx.reviewRecord.deleteMany({ where: { questionId: { in: qIds } } });
          await tx.examAnswer.deleteMany({ where: { questionId: { in: qIds } } });
          await tx.answerRule.deleteMany({ where: { questionId: { in: qIds } } });
          await tx.sourceReference.deleteMany({ where: { questionId: { in: qIds } } });
          await tx.option.deleteMany({ where: { questionId: { in: qIds } } });
          await tx.question.deleteMany({ where: { id: { in: qIds } } });
        }
        await tx.examSession.deleteMany({ where: { paperId: id } });
        await tx.paperVersion.deleteMany({ where: { paperId: id } });
        await tx.option.deleteMany({ where: { section: { paperId: id } } });
        await tx.task.deleteMany({ where: { section: { paperId: id } } });
        await tx.section.deleteMany({ where: { paperId: id } });
        await tx.paper.delete({ where: { id } });
      });
    }
  }
}

async function importPaper(data) {
  const paperId = data.paperId;

  await prisma.$transaction(async (tx) => {
    // Upsert Paper
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
        blockReasons: data.blockReasons && data.blockReasons.length > 0 ? JSON.stringify(data.blockReasons) : null,
        sourceFile: data.sourceFile || null,
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
        blockReasons: data.blockReasons && data.blockReasons.length > 0 ? JSON.stringify(data.blockReasons) : null,
        sourceFile: data.sourceFile || null,
      },
    });

    // Sections
    for (const section of data.sections) {
      const sectionId = `${paperId}_s${section.sortOrder}_${section.type}`;

      await tx.section.upsert({
        where: { id: sectionId },
        update: {
          type: section.type,
          title: section.title,
          sortOrder: section.sortOrder,
          passage: section.passage || null,
          instructions: section.instructions || null,
          scorePerQuestion: section.scorePerQuestion,
        },
        create: {
          id: sectionId,
          paperId,
          type: section.type,
          title: section.title,
          sortOrder: section.sortOrder,
          passage: section.passage || null,
          instructions: section.instructions || null,
          scorePerQuestion: section.scorePerQuestion,
        },
      });

      // Section optionsPool
      if (section.optionsPool) {
        for (let oi = 0; oi < section.optionsPool.length; oi++) {
          const opt = section.optionsPool[oi];
          const optionId = `${sectionId}_opt_${opt.key}`;
          await tx.option.upsert({
            where: { id: optionId },
            update: { key: opt.key, content: opt.content, sortOrder: oi },
            create: { id: optionId, sectionId, key: opt.key, content: opt.content, sortOrder: oi },
          });
        }
      }

      // Tasks
      for (const task of section.tasks) {
        const taskId = `${sectionId}_t${task.sortOrder}`;

        await tx.task.upsert({
          where: { id: taskId },
          update: {
            title: task.title || null,
            sortOrder: task.sortOrder,
            instructions: task.instructions || null,
          },
          create: {
            id: taskId,
            sectionId,
            title: task.title || null,
            sortOrder: task.sortOrder,
            instructions: task.instructions || null,
          },
        });

        // Questions
        for (const question of task.questions) {
          const questionId = `${paperId}_q${question.questionNumber}`;

          await tx.question.upsert({
            where: { id: questionId },
            update: {
              questionNumber: question.questionNumber,
              stem: question.stem,
              originalStem: question.originalStem || null,
              baseWord: question.baseWord || null,
              scoreValue: question.scoreValue,
              verified: question.verified || false,
            },
            create: {
              id: questionId,
              taskId,
              questionNumber: question.questionNumber,
              stem: question.stem,
              originalStem: question.originalStem || null,
              baseWord: question.baseWord || null,
              scoreValue: question.scoreValue,
              verified: question.verified || false,
            },
          });

          // Question options
          if (question.options) {
            for (let oi = 0; oi < question.options.length; oi++) {
              const opt = question.options[oi];
              const optionId = `${questionId}_opt_${opt.key}`;
              await tx.option.upsert({
                where: { id: optionId },
                update: { key: opt.key, content: opt.content, sortOrder: oi },
                create: { id: optionId, questionId, key: opt.key, content: opt.content, sortOrder: oi },
              });
            }
          }

          // Answer rules
          if (question.answerRules) {
            for (let ai = 0; ai < question.answerRules.length; ai++) {
              const rule = question.answerRules[ai];
              const ruleId = question.answerRules.length === 1 ? `${questionId}_answer` : `${questionId}_answer_${ai}`;
              await tx.answerRule.upsert({
                where: { id: ruleId },
                update: {
                  standardAnswer: rule.standardAnswer,
                  originalAnswer: rule.originalAnswer || null,
                  revisionNotes: rule.revisionNotes || null,
                  acceptableAnswers: rule.acceptableAnswers && rule.acceptableAnswers.length > 0 ? JSON.stringify(rule.acceptableAnswers) : null,
                  caseSensitive: rule.caseSensitive || false,
                  explanation: rule.explanation || null,
                  disputed: rule.disputed || false,
                },
                create: {
                  id: ruleId,
                  questionId,
                  standardAnswer: rule.standardAnswer,
                  originalAnswer: rule.originalAnswer || null,
                  revisionNotes: rule.revisionNotes || null,
                  acceptableAnswers: rule.acceptableAnswers && rule.acceptableAnswers.length > 0 ? JSON.stringify(rule.acceptableAnswers) : null,
                  caseSensitive: rule.caseSensitive || false,
                  explanation: rule.explanation || null,
                  disputed: rule.disputed || false,
                },
              });
            }
          }

          // Source references
          if (question.sourceReferences) {
            for (let si = 0; si < question.sourceReferences.length; si++) {
              const src = question.sourceReferences[si];
              const srcId = `${questionId}_src_${si}`;
              await tx.sourceReference.upsert({
                where: { id: srcId },
                update: {
                  sourceFileName: src.sourceFileName,
                  pageNumber: src.pageNumber || null,
                  extractionMethod: src.extractionMethod || null,
                  correctionNotes: src.correctionNotes || null,
                },
                create: {
                  id: srcId,
                  questionId,
                  sourceFileName: src.sourceFileName,
                  pageNumber: src.pageNumber || null,
                  extractionMethod: src.extractionMethod || null,
                  correctionNotes: src.correctionNotes || null,
                },
              });
            }
          }
        }
      }
    }
  }, { timeout: 30000 });
}

async function main() {
  await cleanTestData();

  console.log("\n📦 Step 2: Importing 29 papers from JSON...");
  const papersDir = path.resolve(__dirname, '../prisma/seed-data/all-papers');
  const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.json')).sort();

  let imported = 0;
  for (const file of files) {
    const filePath = path.join(papersDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    await importPaper(data);
    imported++;
    console.log(`  [${String(imported).padStart(2, '0')}/${files.length}] Imported: ${data.paperId} - ${data.title}`);
  }

  console.log("\n📊 Step 3: Database Verification Summary:");
  const allPapers = await prisma.paper.findMany({
    include: {
      sections: {
        include: {
          tasks: {
            include: {
              questions: true
            }
          }
        }
      }
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' },
      { id: 'asc' }
    ]
  });

  console.log(`Total papers in database: ${allPapers.length}`);
  console.log("--------------------------------------------------------------------------------");
  console.log("ID".padEnd(25) + "Year".padEnd(6) + "Region".padEnd(10) + "Type".padEnd(12) + "Sections".padEnd(10) + "Questions".padEnd(10) + "Title");
  console.log("--------------------------------------------------------------------------------");
  for (const p of allPapers) {
    const qCount = p.sections.flatMap(s => s.tasks.flatMap(t => t.questions)).length;
    console.log(
      p.id.padEnd(25) +
      String(p.year).padEnd(6) +
      p.region.padEnd(10) +
      p.paperType.padEnd(12) +
      String(p.sections.length).padEnd(10) +
      String(qCount).padEnd(10) +
      p.title
    );
  }
  console.log("--------------------------------------------------------------------------------");
}

main()
  .catch(err => {
    console.error("❌ Batch import failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
