import { prisma } from '../lib/prisma';
const id = 'acceptance-fixture';
async function main() {
  if (!process.env.DATABASE_URL?.includes('/tmp/shorepass-acceptance-')) throw new Error('Acceptance fixtures must use an isolated /tmp database.');
  if (!(await prisma.paper.findUnique({ where: { id } }))) {
    const types = ['reading_judgment', 'reading_comprehension', 'summary_completion', 'sentence_fill', 'word_cloze', 'word_formation', 'essay'];
    let number = 0;
    await prisma.paper.create({ data: {
      id, title: '验收专用试卷（合成数据，非真题）', courseCode: '13000', year: 2026, month: 4, region: 'national', paperType: 'prediction', totalScore: 40, suggestedMinutes: 150, verified: true, status: 'verified', publishBlocked: false,
      sections: { create: types.map((type, i) => ({ id: `${id}:s${i}`, type, title: `第 ${i + 1} 部分`, sortOrder: i, scorePerQuestion: [1, 2, 1, 2, 1.5, 1.5, 30][i], passage: 'Learning English every day helps us remember more.\n\nPractice [5] builds confidence. A learner is [7] (travel) around the world.',
        options: ['sentence_fill', 'word_cloze'].includes(type) ? { create: ['A', 'B', 'C'].map((key, j) => ({ id: `${id}:s${i}:${key}`, key, content: ['Regular practice', 'daily', 'never'][j], sortOrder: j })) } : undefined,
        tasks: { create: Array.from({ length: type === 'summary_completion' ? 2 : 1 }, (_, task) => {
          const n = ++number;
          return { id: `${id}:t${i}:${task}`, title: `Task ${task + 1}`, sortOrder: task, questions: { create: [{ id: `${id}:q${n}`, questionNumber: n, stem: type === 'essay' ? 'Write about your English learning plan.' : type === 'word_formation' ? 'Complete [7] using travel.' : `Choose the correct answer for question ${n}.`, baseWord: type === 'word_formation' ? 'travel' : null, scoreValue: [1, 2, 1, 2, 1.5, 1.5, 30][i], verified: true,
            options: ['reading_judgment', 'reading_comprehension', 'summary_completion'].includes(type) ? { create: ['A', 'B', 'C'].map((key, j) => ({ id: `${id}:q${n}:${key}`, key, content: task ? ['Finish the sentence', 'One choice', 'Review every day'][j] : ['True', 'False', 'Not given'][j], sortOrder: j })) } : undefined,
            answerRules: { create: [{ id: `${id}:a${n}`, standardAnswer: ['A', 'B', 'B', 'C', 'A', 'B', 'traveling', 'Sample essay for comparison.'][n - 1], acceptableAnswers: type === 'word_formation' ? '["travelling"]' : '[]', explanation: '这是验收用解析，用于验证答案展示与评分流程。' }] },
            sourceReferences: { create: [{ id: `${id}:r${n}`, sourceFileName: 'acceptance-fixture (synthetic)', pageNumber: 1, extractionMethod: 'manual' }] },
          }] } };
        }) },
      })) },
    } });
    console.log('Created isolated eight-question acceptance fixture.');
  }
  // An existing but unverified paper: the mock-mode gate must reject it (403).
  if (!(await prisma.paper.findUnique({ where: { id: 'test_paper_1' } }))) {
    await prisma.paper.create({
      data: {
        id: 'test_paper_1',
        title: '未核验测试卷（合成数据，非真题）',
        courseCode: '13000',
        year: 2026,
        month: 4,
        region: 'national',
        paperType: 'prediction',
        totalScore: 100,
        suggestedMinutes: 150,
        verified: false,
        status: 'draft',
        publishBlocked: true,
        sections: {
          create: [
            {
              id: 'test_paper_1:s0',
              type: 'reading_judgment',
              title: '第 1 部分',
              sortOrder: 0,
              scorePerQuestion: 1,
              passage: 'Synthetic passage for the unverified test paper.',
              tasks: {
                create: [
                  {
                    id: 'test_paper_1:t0',
                    sortOrder: 0,
                    questions: {
                      create: [
                        {
                          id: 'test_paper_1:q1',
                          questionNumber: 1,
                          stem: 'Synthetic statement.',
                          scoreValue: 1,
                          verified: false,
                          options: {
                            create: ['A', 'B', 'C'].map((key, j) => ({
                              id: `test_paper_1:q1:${key}`,
                              key,
                              content: ['True', 'False', 'Not given'][j],
                              sortOrder: j,
                            })),
                          },
                          answerRules: {
                            create: [
                              {
                                id: 'test_paper_1:a1',
                                standardAnswer: 'A',
                                acceptableAnswers: '[]',
                                explanation: 'Synthetic.',
                              },
                            ],
                          },
                          sourceReferences: {
                            create: [
                              {
                                id: 'test_paper_1:r1',
                                sourceFileName: 'test_paper_1 (synthetic)',
                                pageNumber: 1,
                                extractionMethod: 'manual',
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log('Created unverified test_paper_1 for the mock-mode gate.');
  }
}
main().finally(() => prisma.$disconnect());
