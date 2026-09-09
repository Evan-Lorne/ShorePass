/* eslint-disable @typescript-eslint/no-explicit-any */
export function runQualityCheck(paper: any) {
  const errors = [];
  
  if (!paper.verified) {
    errors.push("Paper is not marked as verified (verified=false).");
  }

  if (!paper.sections || paper.sections.length === 0) {
    errors.push("Missing sections.");
  }

  let expectedQNum = 1;

  for (const section of paper.sections || []) {
    if (!section.tasks || section.tasks.length === 0) {
      errors.push(`Section ${section.title} has no tasks.`);
    }

    if (!['essay', 'translation'].includes(section.type) && (!section.passage || section.passage.trim() === '')) {
      errors.push(`Section ${section.title} is missing passage text.`);
    }

    for (const task of section.tasks || []) {
      for (const q of task.questions || []) {
        if (!q.verified) errors.push(`Question ${q.questionNumber} is not verified.`);
        const options = q.options?.length ? q.options : section.options || section.optionsPool || [];
        if (options.some((o: any) => !o.content?.trim() || /图片或空白选项/.test(o.content))) errors.push(`Question ${q.questionNumber} has placeholder options.`);
        if (new Set(options.map((o: any) => o.key)).size !== options.length) errors.push(`Question ${q.questionNumber} has duplicate option keys.`);
        if (options.length && !options.some((o: any) => o.key === q.answerRules?.[0]?.standardAnswer)) errors.push(`Question ${q.questionNumber} answer does not match an option.`);
        if (!q.stem?.trim() || /^(Sample stem|Q\d+|\[见短文原文\])$/.test(q.stem)) errors.push(`Question ${q.questionNumber} has a placeholder stem.`);
        if (!['essay', 'translation', 'word_formation'].includes(section.type) && !(q.options?.length || section.options?.length || section.optionsPool?.length)) errors.push(`Question ${q.questionNumber} has no options.`);
        if (q.questionNumber !== expectedQNum) {
          errors.push(`Question number discontinuity: Expected ${expectedQNum}, got ${q.questionNumber} (Question ID: ${q.id}).`);
        }
        expectedQNum++;

        if (!q.sourceReferences || q.sourceReferences.length === 0 || !q.sourceReferences[0].pageNumber) {
          errors.push(`Question ${q.questionNumber} is missing source reference or page number.`);
        }

        if (!q.answerRules || q.answerRules.length === 0) {
          errors.push(`Question ${q.questionNumber} has no answer rules.`);
        } else {
          const rule = q.answerRules[0];
          if (rule.disputed) {
            errors.push(`Question ${q.questionNumber} has a disputed answer.`);
          }
          if (!rule.standardAnswer) {
             errors.push(`Question ${q.questionNumber} missing standard answer.`);
          }
        }

        if (['reading_judgment', 'reading_comprehension'].includes(section.type)) {
          if (!q.options || q.options.length < 3) {
            errors.push(`Question ${q.questionNumber} has insufficient options.`);
          }
        }
      }
    }
  }

  return errors;
}
