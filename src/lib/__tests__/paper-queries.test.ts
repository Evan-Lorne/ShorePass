import { describe, it, expect, vi } from 'vitest';
import { getFilteredPapers, getStatusDisplay } from '../paper-queries';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: {
    paper: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', title: 'Paper 1', year: 2024, region: 'national', courseCode: '00015', paperType: 'exam' }
      ])
    }
  }
}));

describe('paper-queries', () => {
  describe('getFilteredPapers', () => {
    it('should build correct where clause with empty params', async () => {
      await getFilteredPapers({});
      expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {}
      }));
    });

    it('should build correct where clause with all params', async () => {
      await getFilteredPapers({
        year: 2024,
        region: 'jiangsu',
        courseCode: '13000',
        paperType: 'prediction'
      });
      expect(prisma.paper.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          year: 2024,
          region: 'jiangsu',
          courseCode: '13000',
          paperType: 'prediction'
        }
      }));
    });
  });

  describe('getStatusDisplay', () => {
    it('returns correct label and color for draft', () => {
      const display = getStatusDisplay('draft');
      expect(display.label).toBe('草稿');
      expect(display.color).toContain('gray');
    });

    it('returns correct label and color for partial_verified', () => {
      const display = getStatusDisplay('partial_verified');
      expect(display.label).toBe('部分核验');
      expect(display.color).toContain('yellow');
    });

    it('returns correct label and color for verified', () => {
      const display = getStatusDisplay('verified');
      expect(display.label).toBe('已核验');
      expect(display.color).toContain('green');
    });

    it('returns correct label and color for blocked', () => {
      const display = getStatusDisplay('blocked');
      expect(display.label).toBe('阻止发布');
      expect(display.color).toContain('red');
    });

    it('returns fallback for unknown status', () => {
      const display = getStatusDisplay('unknown_status');
      expect(display.label).toBe('unknown_status');
      expect(display.color).toContain('gray');
    });
  });
});
