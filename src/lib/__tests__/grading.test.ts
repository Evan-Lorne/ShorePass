import { describe, expect, it } from 'vitest';
import { grade, mastery } from '../grading';
import { runQualityCheck } from '../qualityCheck';
const rule = { standardAnswer: 'traveling', acceptableAnswers: '["travelling"]', caseSensitive: false };
describe('grading and review contract', () => {
  it('trims and accepts case and configured spelling variants', () => { expect(grade('word_formation', '  TRAVELLING ', rule)).toBe(true); expect(grade('word_formation', '  traveling ', rule)).toBe(true); });
  it('rejects blank answers and honors caseSensitive', () => { expect(grade('word_formation', ' ', rule)).toBe(false); expect(grade('word_formation', 'Traveling', { ...rule, caseSensitive: true })).toBe(false); });
  it('does not apply word variants to choice questions', () => { expect(grade('word_cloze', 'a', { ...rule, standardAnswer: 'A' })).toBe(false); });
  it('survives invalid optional JSON', () => { expect(grade('word_formation', 'traveling', { ...rule, acceptableAnswers: '{' })).toBe(true); });
  it('leaves subjective and disputed answers ungraded', () => { expect(grade('essay', 'My essay', rule)).toBeNull(); expect(grade('summary_completion', 'C', { ...rule, disputed: true })).toBeNull(); });
  it('uses a consolidation step, resets mistakes and resets on version changes', () => { expect(mastery(0, true, true).masteryStatus).toBe('consolidating'); expect(mastery(1, true, true).masteryStatus).toBe('mastered'); expect(mastery(1, false, true).consecutiveCorrect).toBe(0); expect(mastery(1, true, false).consecutiveCorrect).toBe(1); });
  it('blocks a verified paper with unverified questions', () => { expect(runQualityCheck({ verified: true, sections: [{ type: 'word_formation', title: 'Test', passage: 'A text', tasks: [{ questions: [{ questionNumber: 1, stem: 'word', verified: false, sourceReferences: [{ pageNumber: 1 }], answerRules: [rule] }] }] }] }).join(' ')).toContain('not verified'); });
});
