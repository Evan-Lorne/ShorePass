import { prisma } from '../lib/prisma';

// Content-level repairs across the whole bank, transcribed from the local
// 整理后的试卷库 markdown files. This does NOT establish PDF-level
// verification or permission to publish: verified stays false.

const evidence = '整理后的试卷库/押题库考前试卷（1）.md';
const headingLine =
  /^\s*#{1,6}\s*(题目答案|短文原文及题目|其他答案与解析|备选词汇池|备选词汇|备选句子池|备选句子|备选小标题|备选项|备选选项|范文\/标准答案|参考范文|短文原文|标准答案|题目|答案|范文)\s*[)）(（]?\s*$/i;
const modelMarker =
  /^\s*#{1,6}\s*(参考范文|范文\/标准答案|范文|作文范文\s*\d*)[^\n]*$/im;
const inlineModelMarker = /^\s*\*\*参考范文\*\*\s*:?\s*$/im;
const appendixMarker =
  /^\s*#{1,6}\s*(其他答案与解析|题目答案|答案与解析|答案|标准答案)\s*[^\n]*$/im;

function stripOptionList(stem: string): string {
  const lineAnchor = /^\s*-?\s*[A-F][.、．]\s/m;
  const line = stem.match(lineAnchor);
  if (line && typeof line.index === 'number' && line.index > 0)
    return stem.slice(0, line.index).replace(/\\_/g, '_').trim();
  const inline = stem.search(/\s-\s*A[.、．]\s/);
  if (inline > 0) return stem.slice(0, inline).replace(/\\_/g, '_').trim();
  return stem.replace(/\\_/g, '_').trim();
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(\d+)\*\*/g, '[$1]')
    .replace(/\*\*/g, '')
    .split('\n')
    .filter((l) => !headingLine.test(l) && !/^\s*#{1,6}\s*$/.test(l))
    .join('\n')
    .replace(/<\/?[^>\n]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const inlineModelMarker2 = /^\s*\*?\*?(参考范文|范文|范文\/标准答案)[^\n]*[:：]\s*$/im;
const inlineAnswerMarker2 = /^\s*\*?\*?标准答案[^\n]*[:：]\s*$/im;

function looksLikePlaceholderModel(text: string): boolean {
  const stripped = text.replace(/[\s:：()（）]/g, '');
  return !stripped || stripped === '略' || stripped === '范文略' || stripped === '参考范文略';
}

function modelTextOf(tail: string): string {
  return cleanMarkdown(tail)
    .replace(/^#{1,6}\s*(参考范文|范文\/标准答案|范文|作文范文\s*\d*)[^\n]*/im, '')
    .replace(/^\s*(参考范文|范文\/标准答案|范文|作文范文\s*\d*)\s*[:：]?\s*\n?/im, '')
    .replace(/^\s*作文范文\s*\d*\s*$/im, '')
    .trim();
}

async function repairPaper(paperId: string, versionSuffix: string, changeLog: string) {
  const versionId = `${paperId}:content-repair-${versionSuffix}`;
  if (await prisma.paperVersion.findUnique({ where: { id: versionId } })) {
    console.log(`[skip] ${paperId} already repaired.`);
    return;
  }
  await prisma.$transaction(
    async (tx) => {
      const sections = await tx.section.findMany({
        where: { paperId },
        include: { tasks: { include: { questions: { include: { answerRules: true } } } } },
      });
      for (const s of sections) {
        if (s.passage) {
          const model = s.type === 'essay' ? s.passage.match(modelMarker) : null;
          const inlineModel = s.type === 'essay' ? s.passage.match(inlineModelMarker) : null;
          const appendix = s.passage.match(appendixMarker);
          const cut = Math.min(
            model?.index ?? Infinity,
            inlineModel?.index ?? Infinity,
            appendix?.index ?? Infinity
          );
          let passage = s.passage;
          if (cut !== Infinity) {
            const tail = s.passage.slice(cut);
            passage = s.passage.slice(0, cut);
            if (s.type === 'essay' && (model || inlineModel)) {
              const modelText = modelTextOf(tail);
              const question = s.tasks.flatMap((t) => t.questions)[0];
              const rule = question?.answerRules[0];
              if (
                question &&
                rule &&
                (!rule.standardAnswer || rule.standardAnswer === '略') &&
                modelText
              ) {
                await tx.answerRule.update({
                  where: { id: rule.id },
                  data: {
                    originalAnswer: rule.standardAnswer || null,
                    standardAnswer: modelText,
                    revisionNotes:
                      '2026-09-10 将原文段落中的参考范文提取为参考答案展示；尚待原始 PDF 人工核对。',
                  },
                });
              }
            }
          }
          const cleaned = cleanMarkdown(passage);
          if (cleaned !== s.passage)
            await tx.section.update({ where: { id: s.id }, data: { passage: cleaned } });
        }
        for (const t of s.tasks) {
          for (const q of t.questions) {
            const stem = stripOptionList(q.stem);
            if (stem && stem !== q.stem) {
              await tx.question.update({
                where: { id: q.id },
                data: { originalStem: q.stem, stem },
              });
            }
          }
        }
      }
      const previous = await tx.paperVersion.findFirst({
        where: { paperId },
        orderBy: { version: 'desc' },
      });
      await tx.paperVersion.create({
        data: {
          id: versionId,
          paperId,
          version: (previous?.version || 1) + 1,
          changeLog,
        },
      });
    },
    { timeout: 30000 }
  );
  console.log(`[done] ${paperId}: ${changeLog}`);
}

async function repairPass2(paperId: string) {
  const versionId = `${paperId}:content-repair-20260910b`;
  if (await prisma.paperVersion.findUnique({ where: { id: versionId } })) {
    console.log(`[skip pass2] ${paperId}`);
    return;
  }
  let changed = false;
  await prisma.$transaction(
    async (tx) => {
      const sections = await tx.section.findMany({
        where: { paperId },
        include: { tasks: { include: { questions: { include: { answerRules: true } } } } },
      });
      for (const s of sections) {
        if (!s.passage) continue;
        let passage = s.passage;
        if (s.type === 'essay') {
          const model2 = passage.match(inlineModelMarker2);
          const answer2 = passage.match(inlineAnswerMarker2);
          const cut = Math.min(model2?.index ?? Infinity, answer2?.index ?? Infinity);
          if (cut !== Infinity) {
            const tail = passage.slice(cut);
            passage = passage.slice(0, cut);
            if (model2 || answer2) {
              const modelText = cleanMarkdown(tail)
                .replace(inlineModelMarker2, '')
                .replace(inlineAnswerMarker2, '')
                .replace(/^\s*作文范文\s*\d*\s*$/im, '')
                .trim();
              const question = s.tasks.flatMap((t) => t.questions)[0];
              const rule = question?.answerRules[0];
              if (
                question &&
                rule &&
                (!rule.standardAnswer || rule.standardAnswer === '略') &&
                modelText &&
                !looksLikePlaceholderModel(modelText)
              ) {
                await tx.answerRule.update({
                  where: { id: rule.id },
                  data: {
                    originalAnswer: rule.standardAnswer || null,
                    standardAnswer: modelText,
                    revisionNotes:
                      '2026-09-10 将原文段落中的参考范文提取为参考答案展示；尚待原始 PDF 人工核对。',
                  },
                });
              }
            }
          }
        }
        const cleaned = cleanMarkdown(passage);
        if (cleaned !== s.passage) {
          changed = true;
          await tx.section.update({ where: { id: s.id }, data: { passage: cleaned } });
        }
      }
      if (!changed) return;
      const previous = await tx.paperVersion.findFirst({
        where: { paperId },
        orderBy: { version: 'desc' },
      });
      await tx.paperVersion.create({
        data: {
          id: versionId,
          paperId,
          version: (previous?.version || 1) + 1,
          changeLog:
            '二次清理：截断作文原文中的行内标准答案/参考范文标记与残留标签；范文仍移入参考答案。verified 不变。',
        },
      });
    },
    { timeout: 30000 }
  );
  console.log(`[pass2 ${changed ? 'done' : 'noop'}] ${paperId}`);
}

async function main() {
  const papers = await prisma.paper.findMany({ select: { id: true, title: true } });
  for (const p of papers) {
    await repairPaper(
      p.id,
      '20260910',
      '清理题干中重复的选项文本、原文中的 Markdown 标记、结构标题与答案附录；作文原文截断到题目提示并将范文移入参考答案。verified 不变。'
    );
  }

  // Pass 2: leftover inline markers ("标准答案:" / "参考范文:" without a
  // markdown heading) and trailing artifact tags in essay passages.
  for (const p of papers) {
    await repairPass2(p.id);
  }

  // Targeted fixes for 2024-prediction-1 transcribed from the source file.
  const paperId = '2024-prediction-1';
  const versionId = `${paperId}:content-repair-20260910-options`;
  if (!(await prisma.paperVersion.findUnique({ where: { id: versionId } }))) {
    const q13 = await prisma.question.findUnique({ where: { id: `${paperId}_q13` } });
    const q14 = await prisma.question.findUnique({ where: { id: `${paperId}_q14` } });
    const q13Options: Record<string, string> = {
      A: "Avremel took care of Ed's life after work.",
      B: 'Avremel liked diving when he was young.',
    };
    const q14Options: Record<string, string> = {
      A: 'Because he expected the rescuers to help him.',
      B: 'Because he tried to carry Ed downstairs.',
      C: "Because he didn't want to leave Ed behind.",
      D: 'Because he found it safer to stay inside.',
    };
    await prisma.$transaction(
      async (tx) => {
        if (q13)
          for (const [key, content] of Object.entries(q13Options))
            await tx.option.update({ where: { id: `${q13.id}_opt_${key}` }, data: { content } });
        if (q14)
          for (const [key, content] of Object.entries(q14Options))
            await tx.option.update({ where: { id: `${q14.id}_opt_${key}` }, data: { content } });
        const q24 = await tx.question.findUnique({ where: { id: `${paperId}_q24` } });
        if (q24) {
          await tx.answerRule.update({
            where: { id: `${q24.id}_answer` },
            data: {
              standardAnswer: 'C',
              originalAnswer: 'C/F',
              acceptableAnswers: JSON.stringify(['C', 'F']),
              disputed: false,
              revisionNotes:
                '2026-09-11 视觉核验：押题库考前试卷（1）.pdf 第7页的 C/F 选项内容相同，答案详解.pdf 第3页明确两个答案均符合；C、F 均自动判为正确。',
            },
          });
        }
        await tx.paper.update({
          where: { id: paperId },
          data: {
            blockReasons: null,
          },
        });
        const previous = await tx.paperVersion.findFirst({
          where: { paperId },
          orderBy: { version: 'desc' },
        });
        await tx.paperVersion.create({
          data: {
            id: versionId,
            paperId,
            version: (previous?.version || 1) + 1,
            changeLog: `根据 ${evidence} 补回第 13、14 题真实选项；第24题依据原试题与答案详解接受 C/F 双答案。`,
          },
        });
      },
      { timeout: 20000 }
    );
    console.log(`[done] ${paperId}: options + blockReasons repaired.`);
  } else {
    console.log(`[skip] ${paperId} options already repaired.`);
  }
}

main().finally(() => prisma.$disconnect());
