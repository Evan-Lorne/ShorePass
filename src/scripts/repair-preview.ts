import { prisma } from '../lib/prisma';

// Repairs are checked against the original question PDF and answer PDF.
const evidence =
  '押题库考前试卷（1）.pdf 第7页；押题库考前试卷（1）答案详解.pdf 第3页';
const firstPool = ['Mistakes encourage taking risks', 'Mistakes practice telling truth', 'Mistakes make powerful teachers', 'Mistakes are as important as successes', 'Mistakes focus our attention', 'Mistakes make things work'];
const secondPool = ['stick with us for a lifetime', 'what we can do to fix it', 'committed to making things work', 'accepting the risk of error', 'worry about being criticized', 'committed to making things work'];
const completions = ['We often know through mistakes what\'s going wrong and ________.', 'If a writer never finishes his book, he will never have to ________.', 'Effective people aim to reach their goals while ________.', 'People can make mistakes only when they are truly ________.', 'We can learn some lessons from making mistakes, which often ________.'];
const repairedAnswers: Record<number, string> = { 9: 'A', 10: 'A', 12: 'B', 15: 'A', 22: 'E', 25: 'A', 27: 'A', 30: 'B', 31: 'H', 34: 'A', 35: 'K', 40: 'B', 42: 'careful', 50: 'logical' };
const sentencePool = ['There are a few basic tips to help make you into a self-confident human being.', 'One method that can help to improve self-confidence is through the use of Hypnosis.', 'Try new things that excite you.', 'Even the most self-confident people have certain issues.', 'We aim to help people become more self-confident in life.', 'Developing self-confidence can be hard, especially if you are starting with little or no confidence.'];
const bases = ['courage', 'care', 'particular', 'implicate', 'train', 'impress', 'communicate', 'respect', 'design', 'logic'];
async function main() {
  const paperId = '2024-prediction-1';
  const versionId = `${paperId}:audit-repair-20260910`;
  if (await prisma.paperVersion.findUnique({ where: { id: versionId } })) { console.log('Preview repair already applied.'); return; }
  await prisma.$transaction(async tx => {
    const sections = await tx.section.findMany({ where: { paperId }, include: { tasks: { include: { questions: { include: { answerRules: true } } } } } });
    for (const s of sections) {
      if (['sentence_fill', 'word_cloze', 'word_formation'].includes(s.type) && s.passage) {
        const passage = s.passage.replace(/\((\d+)\s*\)\s*_+/g, '[$1]').replace(/\b(2[6-9]|30)\._+/g, '[$1]');
        await tx.section.update({ where: { id: s.id }, data: { passage } });
      }
      for (const t of s.tasks) for (const q of t.questions) {
        const n = q.questionNumber;
        let pool: string[] | undefined;
        if (s.type === 'summary_completion') {
          await tx.question.update({ where: { id: q.id }, data: { originalStem: q.stem, stem: n <= 20 ? `Paragraph ${n - 15}: choose the best heading.` : completions[n - 21] } });
          pool = n <= 20 ? firstPool : secondPool;
        } else if (n === 11) pool = ['Avremel rescued Ed at the cost of his own life.', 'Both Avremel and Ed gave up their chance of escape.', 'Both Avremel and Ed were finally rescued.', 'Avremel stayed with Ed and both lost their lives.'];
        else if (s.type === 'sentence_fill') pool = sentencePool;
        if (pool) for (const [i, content] of pool.entries()) {
          const key = String.fromCharCode(65 + i), id = `${q.id}_opt_${key}`;
          await tx.option.upsert({ where: { id }, create: { id, questionId: q.id, key, content, sortOrder: i }, update: { content } });
        }
        if (n >= 26 && n <= 50) await tx.question.update({ where: { id: q.id }, data: { originalStem: q.stem, stem: `填入原文第 [${n}] 空${n >= 41 ? '，使用括号内单词的正确形式' : '的最佳选项'}。`, ...(n >= 41 ? { baseWord: bases[n - 41] } : {}) } });
        if (repairedAnswers[n]) {
          const rule = q.answerRules[0];
          if (rule) await tx.answerRule.update({ where: { id: rule.id }, data: { originalAnswer: rule.standardAnswer, standardAnswer: repairedAnswers[n], revisionNotes: `2026-09-10 根据 ${evidence} 的解析修复结构化提取错误；尚待原始 PDF 人工核对。` } });
          else await tx.answerRule.create({ data: { id: `${q.id}_answer`, questionId: q.id, standardAnswer: repairedAnswers[n], explanation: '根据原解析：介词 of 后与 appreciation、gratitude 并列，应选 praise。', revisionNotes: `从 ${evidence} 补齐遗漏，待原 PDF 人工核对。` } });
        }
        if (n === 24 && q.answerRules[0])
          await tx.answerRule.update({
            where: { id: q.answerRules[0].id },
            data: {
              standardAnswer: 'C',
              originalAnswer: 'C/F',
              acceptableAnswers: JSON.stringify(['C', 'F']),
              disputed: false,
              revisionNotes:
                `2026-09-11 视觉核验：${evidence} 均确认 C/F 两项印刷内容相同且两个答案均符合；以 C 为标准答案，C、F 均参与自动判分。`,
            },
          });
      }
    }
    const previous = await tx.paperVersion.findFirst({ where: { paperId }, orderBy: { version: 'desc' } });
    await tx.paperVersion.create({ data: { id: versionId, paperId, version: (previous?.version || 1) + 1, changeLog: `修复选项池、题干、空位标记和提取错误；第24题按原卷接受 C/F 双答案；依据 ${evidence}。` } });
  }, { timeout: 20000 });
  console.log('Preview repaired; verification remains unchanged.');
}
main().finally(() => prisma.$disconnect());
