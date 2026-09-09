import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: 'file:/tmp/shorepass-acceptance-20260910.db' } } });
test.afterAll(() => db.$disconnect());

test('mock deadline is enforced and expired sessions are graded, not discarded', async ({ request }) => {
  await request.post('/api/device');
  expect((await request.post('/api/exam-session', { data: { paperId: 'test_paper_1', mode: 'mock' } })).status()).toBe(403);
  const session = (await (await request.post('/api/exam-session', { data: { paperId: 'acceptance-fixture', mode: 'mock' } })).json()).session;
  const draft = { revision: 0, answers: { 'acceptance-fixture:q1': 'A' }, marked: [], currentIndex: 0, elapsed: 0 };
  expect((await request.put(`/api/exam-session/${session.id}/save`, { data: draft })).ok()).toBeTruthy();
  await db.examSession.update({ where: { id: session.id }, data: { endTime: new Date(Date.now() - 1000) } });
  const restored = (await (await request.post('/api/exam-session', { data: { paperId: 'acceptance-fixture', mode: 'mock' } })).json()).session;
  expect(restored.id).toBe(session.id);
  expect((await request.put(`/api/exam-session/${session.id}/save`, { data: { ...draft, revision: 1 } })).status()).toBe(410);
  const submitted = (await (await request.post(`/api/exam-session/${session.id}/submit`, { data: { ...draft, revision: 1, answers: { 'acceptance-fixture:q1': 'B' } } })).json()).session;
  expect(submitted.objectiveScore).toBe(1);
  expect(submitted.answers.find((a: { questionId: string }) => a.questionId === 'acceptance-fixture:q1').userAnswer).toBe('A');
});

test('expired pairing credentials fail and word progress is durable', async ({ request }) => {
  await request.post('/api/device');
  const code = (await (await request.post('/api/sync/code/generate')).json()).code;
  await db.syncCode.update({ where: { code }, data: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await request.post('/api/sync/code/consume', { data: { code } })).status()).toBe(400);
  const word = await db.word.upsert({ where: { word: 'acceptance-learning' }, create: { word: 'acceptance-learning', translation: '验收词条' }, update: {} });
  expect((await request.post('/api/words/progress', { data: { wordId: word.id, status: 'known' } })).ok()).toBeTruthy();
  const data = await (await request.get('/api/words/progress')).json();
  expect(data.progress.find((p: { wordId: string }) => p.wordId === word.id).status).toBe('known');
});
