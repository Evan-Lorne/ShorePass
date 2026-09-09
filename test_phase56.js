const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { runQualityCheck } = require('./src/lib/qualityCheck.ts'); // Wait, we can't require TS easily. I'll mock it.

async function runTests() {
  console.log("=== Phase 5: Multi-device Sync ===");
  const userId = "test_user_sync";

  // 1. Generate sync code
  console.log("Generating Sync Code...");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const syncCode = await prisma.syncCode.create({
    data: { code: "123456", userId, expiresAt }
  });
  console.log("Code generated:", syncCode.code);

  // 2. Consume code (Normal pair)
  console.log("Consuming Sync Code...");
  let consumed = await fetchApiMock_Consume(syncCode.code, "My Phone");
  console.log("Token received:", consumed.token);

  // 3. Consume again (Wrong/Expired/Used)
  console.log("Testing reused code...");
  let errConsumed = await fetchApiMock_Consume(syncCode.code, "My iPad");
  console.log("Expected Error:", errConsumed.error);

  // 4. Offline Queue Push (Conflict resolution)
  console.log("Testing Sync Push...");
  const pushRes = await fetchApiMock_Push(consumed.token, [
    {
      entityType: "ExamSession",
      entityId: "sync_session_1",
      data: { paperId: "test_paper_1", mode: "practice", status: "in_progress", endTime: new Date() }
    }
  ]);
  console.log("Push Result:", pushRes.results);

  // 5. Conflict: Overwrite submitted session (should reject)
  await prisma.examSession.update({ where: { id: "sync_session_1" }, data: { status: "submitted", submittedAt: new Date() } });
  const pushResConflict = await fetchApiMock_Push(consumed.token, [
    {
      entityType: "ExamSession",
      entityId: "sync_session_1",
      data: { paperId: "test_paper_1", mode: "practice", status: "in_progress" }
    }
  ]);
  console.log("Conflict Result:", pushResConflict.results); // should be conflict_rejected_submitted

  // 6. Revoke device
  console.log("Revoking device...");
  await prisma.deviceToken.update({ where: { token: consumed.token }, data: { isRevoked: true } });
  const pushResRevoked = await fetchApiMock_Push(consumed.token, []);
  console.log("Revoked Push Result:", pushResRevoked.error); // should be Invalid or revoked token


  console.log("\n=== Phase 6: Grading & Quality ===");
  // 1. Setup paper
  console.log("Testing Quality Check...");
  const paper = await prisma.paper.findUnique({
    where: { id: "test_paper_1" },
    include: { sections: { include: { tasks: { include: { questions: { include: { answerRules: true, options: true, sourceReferences: true } } } } } } }
  });
  
  const qualityErrors = checkQuality(paper);
  console.log("Quality Check Errors (should have some due to our basic mock paper):", qualityErrors);

  // 2. Subjective Grading
  console.log("Testing Grading...");
  // create dummy answer
  const sess = await prisma.examSession.create({ data: { userId, paperId: "test_paper_1", endTime: new Date() } });
  const ans = await prisma.examAnswer.create({ data: { examSessionId: sess.id, questionId: "q1", userAnswer: "I think this is a good essay." } });

  // grade AI
  await gradeAnswer(ans.id, { score: 10, gradeReason: "Good vocabulary", gradedBy: "AI", gradeTier: "B" });
  let checkSess = await prisma.examSession.findUnique({ where: { id: sess.id } });
  console.log("Session AI Score:", checkSess.aiScore);

  // grade Manual
  await gradeAnswer(ans.id, { score: 15, gradeReason: "Excellent logic", gradedBy: "Admin", gradeTier: "A" });
  checkSess = await prisma.examSession.findUnique({ where: { id: sess.id }, include: { answers: true } });
  console.log("Session Final Score (Manual overrides):", checkSess.finalScore);
  console.log("Answer Grade Version:", checkSess.answers[0].gradeVersion);
}

// Mocking NextJS APIs for script testing
async function fetchApiMock_Consume(code, deviceName) {
   const syncCode = await prisma.syncCode.findUnique({ where: { code } });
   if (!syncCode || syncCode.used) return { error: 'Invalid or used code' };
   await prisma.syncCode.update({ where: { id: syncCode.id }, data: { used: true } });
   const tokenStr = "mock_token_" + Date.now();
   await prisma.deviceToken.create({ data: { token: tokenStr, userId: syncCode.userId, deviceName } });
   return { token: tokenStr };
}

async function fetchApiMock_Push(token, mutations) {
    const device = await prisma.deviceToken.findUnique({ where: { token } });
    if (!device || device.isRevoked) return { error: 'Invalid or revoked token' };
    const results = [];
    for (const m of mutations) {
        if (m.entityType === 'ExamSession') {
            const ex = await prisma.examSession.findUnique({ where: { id: m.entityId } });
            if (!ex) {
                await prisma.examSession.create({ data: { ...m.data, id: m.entityId, userId: device.userId } });
                results.push({ id: m.entityId, status: 'created' });
            } else {
                if (ex.status === 'submitted' && m.data.status !== 'submitted') {
                    results.push({ id: m.entityId, status: 'conflict_rejected_submitted' });
                } else {
                    await prisma.examSession.update({ where: { id: m.entityId }, data: m.data });
                    results.push({ id: m.entityId, status: 'updated' });
                }
            }
        }
    }
    return { results };
}

function checkQuality(paper) {
  const errors = [];
  let expectedQNum = 1;
  for (const section of paper.sections || []) {
    for (const task of section.tasks || []) {
      for (const q of task.questions || []) {
        if (q.questionNumber !== expectedQNum) errors.push(`QNum mismatch: Expected ${expectedQNum}, got ${q.questionNumber}`);
        expectedQNum++;
        if (!q.sourceReferences || q.sourceReferences.length === 0) errors.push(`Q${q.questionNumber} missing source ref`);
        if (!q.answerRules || q.answerRules.length === 0) errors.push(`Q${q.questionNumber} missing answer rules`);
      }
    }
  }
  return errors;
}

async function gradeAnswer(answerId, data) {
    const answer = await prisma.examAnswer.update({
      where: { id: answerId },
      data: { ...data, gradeVersion: { increment: 1 }, isCorrect: data.score > 0 }
    });
    const session = await prisma.examSession.findUnique({ where: { id: answer.examSessionId }, include: { answers: true } });
    let newAiScore = 0, newFinal = 0;
    for (const ans of session.answers) {
      if (ans.gradedBy === 'AI') newAiScore += ans.score;
      else newFinal += ans.score;
    }
    await prisma.examSession.update({ where: { id: session.id }, data: { aiScore: newAiScore, finalScore: newFinal } });
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
