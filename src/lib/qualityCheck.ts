/* eslint-disable @typescript-eslint/no-explicit-any */
const placeholderOption =
  /^(?:Option|Heading|Completion|Sentence option) [A-L]$|^word_[a-l]$|^图片或空白选项$|(?:精准解析|标准答案)/i;
const placeholderStem =
  /^(?:Sample stem|Q\d+|Question \d+|\[见短文原文\]|Sentence \d+: complete the statement\.)$/i;
const placeholderPassage = /^###\s*(?:备选词汇池|备选项|短文原文|题目)\s*$/i;

export function runPreviewQualityCheck(paper: any) {
  const errors: string[] = [];

  if (!paper.sections || paper.sections.length === 0) errors.push("Missing sections.");

  let expectedQuestionNumber = 1;

  for (const section of paper.sections || []) {
    if (!section.tasks || section.tasks.length === 0) {
      errors.push(`Section ${section.title} has no tasks.`);
    }

    if (
      !["essay", "translation"].includes(section.type) &&
      (!section.passage ||
        section.passage.trim() === "" ||
        placeholderPassage.test(section.passage.trim()))
    ) {
      errors.push(`Section ${section.title} is missing passage text.`);
    }

    for (const task of section.tasks || []) {
      for (const question of task.questions || []) {
        const options = question.options?.length
          ? question.options
          : section.options || section.optionsPool || [];
        const rule = question.answerRules?.[0];

        if (
          options.some(
            (option: any) =>
              !option.content?.trim() || placeholderOption.test(option.content.trim()),
          )
        ) {
          errors.push(`Question ${question.questionNumber} has placeholder options.`);
        }
        if (new Set(options.map((option: any) => option.key)).size !== options.length) {
          errors.push(`Question ${question.questionNumber} has duplicate option keys.`);
        }
        if (
          options.length &&
          !rule?.disputed &&
          !options.some((option: any) => option.key === rule?.standardAnswer)
        ) {
          errors.push(`Question ${question.questionNumber} answer does not match an option.`);
        }
        if (!question.stem?.trim() || placeholderStem.test(question.stem.trim())) {
          errors.push(`Question ${question.questionNumber} has a placeholder stem.`);
        }
        if (
          !["essay", "translation", "word_formation"].includes(section.type) &&
          !options.length
        ) {
          errors.push(`Question ${question.questionNumber} has no options.`);
        }
        if (question.questionNumber !== expectedQuestionNumber) {
          errors.push(
            `Question number discontinuity: Expected ${expectedQuestionNumber}, got ${question.questionNumber} (Question ID: ${question.id}).`,
          );
        }
        expectedQuestionNumber++;

        if (!question.answerRules || question.answerRules.length === 0) {
          errors.push(`Question ${question.questionNumber} has no answer rules.`);
        } else if (!rule.standardAnswer) {
          errors.push(`Question ${question.questionNumber} missing standard answer.`);
        }

        if (
          ["reading_judgment", "reading_comprehension"].includes(section.type) &&
          (!question.options || question.options.length < 3)
        ) {
          errors.push(`Question ${question.questionNumber} has insufficient options.`);
        }
      }
    }
  }

  return errors;
}

export function runQualityCheck(paper: any) {
  const errors = runPreviewQualityCheck(paper);

  if (!paper.verified) errors.push("Paper is not marked as verified (verified=false).");

  for (const section of paper.sections || []) {
    for (const task of section.tasks || []) {
      for (const question of task.questions || []) {
        if (!question.verified) {
          errors.push(`Question ${question.questionNumber} is not verified.`);
        }
        if (!question.sourceReferences?.some((reference: any) => reference.pageNumber)) {
          errors.push(
            `Question ${question.questionNumber} is missing source reference or page number.`,
          );
        }
        if (question.answerRules?.[0]?.disputed) {
          errors.push(`Question ${question.questionNumber} has a disputed answer.`);
        }
      }
    }
  }

  return errors;
}
