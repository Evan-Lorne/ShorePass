import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importPaper } from '../import-paper';
import { PaperImportSchema } from '@/lib/schemas/paper-import';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (callback) => {
      const tx = {
        paper: { upsert: vi.fn() },
        section: { upsert: vi.fn() },
        task: { upsert: vi.fn() },
        question: { upsert: vi.fn() },
        option: { upsert: vi.fn() },
        answerRule: { upsert: vi.fn() },
        sourceReference: { upsert: vi.fn() }
      };
      await callback(tx);
      return tx;
    }),
  }
}));

describe('importPaper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import a paper correctly', async () => {
    const dummyPaper: z.input<typeof PaperImportSchema> = {
      paperId: 'test-2024-04',
      title: 'Test Paper',
      courseCode: '00015',
      year: 2024,
      month: 4,
      region: 'national',
      paperType: 'exam',
      totalScore: 100,
      suggestedMinutes: 150,
      status: 'draft',
      publishBlocked: true,
      blockReasons: [{ code: 'missing_answer', description: 'test' }],
      sections: [
        {
          type: 'reading_judgment',
          title: 'Section 1',
          sortOrder: 1,
          scorePerQuestion: 2,
          tasks: [
            {
              sortOrder: 1,
              questions: [
                {
                  questionNumber: 1,
                  stem: 'Q1',
                  scoreValue: 2,
                  answerRules: [{ standardAnswer: 'T' }]
                }
              ]
            }
          ]
        }
      ]
    };

    const parsed = PaperImportSchema.parse(dummyPaper);
    await importPaper(parsed);
    
    expect(prisma.$transaction).toHaveBeenCalled();
    const mockTx = await (prisma.$transaction as import("vitest").Mock).mock.results[0].value;
    
    // Check paper upsert
    expect(mockTx.paper.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'test-2024-04' },
      create: expect.objectContaining({ title: 'Test Paper', status: 'draft' })
    }));
    
    // Check section upsert
    expect(mockTx.section.upsert).toHaveBeenCalled();
    // Check question upsert
    expect(mockTx.question.upsert).toHaveBeenCalled();
  });
});
