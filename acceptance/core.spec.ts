import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const paperId = 'acceptance-fixture';
const baseURL = process.env.ACCEPTANCE_URL || 'http://127.0.0.1:3211';
const captureEvidence = process.env.UPDATE_ACCEPTANCE_EVIDENCE === '1';
const answers = Object.fromEntries(['B', 'B', 'B', 'C', 'A', 'B', ' TRAVELLING ', 'I practice English every day.'].map((a, i) => [`${paperId}:q${i + 1}`, a]));

test('normal-network UI has no browser or HTTP errors', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];
  const canceledNextPrefetches: Array<{
    method: string;
    url: string;
    errorText: string;
    headers: { rsc: string; nextRouterPrefetch: string };
  }> = [];
  const failedRequests: string[] = [];
  const httpErrors: string[] = [];

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'unknown failure';
    const headers = request.headers();
    const isCanceledNextPrefetch = request.method() === 'GET'
      && new URL(request.url()).searchParams.has('_rsc')
      && headers.rsc === '1'
      && headers['next-router-prefetch'] === '1'
      && failure === 'net::ERR_ABORTED';
    const detail = `${request.method()} ${request.url()}: ${failure}`;

    if (isCanceledNextPrefetch) {
      canceledNextPrefetches.push({
        method: request.method(),
        url: request.url(),
        errorText: failure,
        headers: {
          rsc: headers.rsc,
          nextRouterPrefetch: headers['next-router-prefetch']
        }
      });
      return;
    }
    failedRequests.push(detail);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今天，向上岸再近一步' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.goto('/papers');
  await expect(page.getByRole('heading', { name: '试卷库' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.goto(`/practice/${paperId}/exam?mode=practice`);
  await expect(page.getByRole('button', { name: '答题卡', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');

  if (canceledNextPrefetches.length > 0) {
    await testInfo.attach('canceled-next-prefetch-requests', {
      body: JSON.stringify(canceledNextPrefetches, null, 2),
      contentType: 'application/json'
    });
  }

  expect.soft(consoleErrors, `console.error messages:\n${consoleErrors.join('\n')}`).toEqual([]);
  expect.soft(consoleWarnings, `console.warn messages:\n${consoleWarnings.join('\n')}`).toEqual([]);
  expect.soft(pageErrors, `page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  expect.soft(failedRequests, `failed requests:\n${failedRequests.join('\n')}`).toEqual([]);
  expect.soft(httpErrors, `HTTP error responses:\n${httpErrors.join('\n')}`).toEqual([]);
});

test('identity, atomic grading, review mastery, pairing and conflict protection', async ({ playwright }) => {
  const a = await playwright.request.newContext({ baseURL });
  const b = await playwright.request.newContext({ baseURL });
  expect((await a.get('/api/study')).status()).toBe(401);
  await a.post('/api/device'); await b.post('/api/device');
  const { session } = await (await a.post('/api/exam-session', { data: { paperId, mode: 'practice' } })).json();
  const draft = { revision: 0, answers, marked: [`${paperId}:q2`], currentIndex: 6, elapsed: 123 };
  expect((await b.put(`/api/exam-session/${session.id}/save`, { data: draft })).status()).toBe(404);
  expect((await a.put(`/api/exam-session/${session.id}/save`, { data: { ...draft, answers: { 'foreign-question': 'A' } } })).status()).toBe(400);
  const saved = await (await a.put(`/api/exam-session/${session.id}/save`, { data: draft })).json();
  expect(saved.session.revision).toBe(1);
  expect((await a.put(`/api/exam-session/${session.id}/save`, { data: draft })).status()).toBe(409);
  const submission = await (await a.post(`/api/exam-session/${session.id}/submit`, { data: { ...draft, revision: 1 } })).json();
  expect(submission.session.objectiveScore).toBe(9);
  expect(submission.session.subjectivePending).toBe(true);
  expect(submission.session.finalScore).toBeNull();
  expect(submission.session.answers).toHaveLength(8);
  expect((await a.post(`/api/exam-session/${session.id}/submit`)).ok()).toBeTruthy();
  expect((await a.put(`/api/exam-session/${session.id}/save`, { data: { ...draft, revision: 2 } })).status()).toBe(409);
  const study = await (await a.get('/api/study')).json();
  expect(study.mistakes).toHaveLength(1);
  expect((await (await b.get('/api/study')).json()).mistakes).toHaveLength(0);
  const recordId = study.mistakes[0].id, attemptId = randomUUID();
  const first = await (await a.post('/api/mistakes/review', { data: { recordId, answer: 'A', attemptId } })).json();
  expect(first.record.masteryStatus).toBe('consolidating');
  const repeat = await (await a.post('/api/mistakes/review', { data: { recordId, answer: 'A', attemptId } })).json();
  expect(repeat.record.consecutiveCorrect).toBe(1);
  const second = await (await a.post('/api/mistakes/review', { data: { recordId, answer: 'A', attemptId: randomUUID() } })).json();
  expect(second.record.masteryStatus).toBe('mastered');
  const wrong = await (await a.post('/api/mistakes/review', { data: { recordId, answer: 'B', attemptId: randomUUID() } })).json();
  expect(wrong.record.consecutiveCorrect).toBe(0);
  const code = await (await a.post('/api/sync/code/generate')).json();
  expect((await b.post('/api/sync/code/consume', { data: { code: code.code } })).ok()).toBeTruthy();
  expect((await (await b.get('/api/study')).json()).mistakes[0].id).toBe(recordId);
  expect((await b.post('/api/sync/code/consume', { data: { code: code.code } })).status()).toBe(400);
  expect((await a.post('/api/admin/papers/acceptance-fixture/publish', { data: { action: 'unpublish' } })).status()).toBe(403);
  const newSession = (await (await a.post('/api/exam-session', { data: { paperId, mode: 'practice' } })).json()).session;
  const fresh = { ...draft, revision: 0 };
  expect((await b.put(`/api/exam-session/${newSession.id}/save`, { data: fresh })).ok()).toBeTruthy();
  expect((await a.put(`/api/exam-session/${newSession.id}/save`, { data: fresh })).status()).toBe(409);
  const pulled = (await (await a.post('/api/exam-session', { data: { paperId, mode: 'practice', sessionId: newSession.id } })).json()).session;
  expect(JSON.parse(pulled.draftState).marked).toEqual(draft.marked);
  await a.dispose(); await b.dispose();
});

test('responsive exam, local drafts, results, independent mistake reviews', async ({ page, isMobile }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/papers');
  await expect(page.getByRole('navigation').getByRole('link', { name: '错题本' })).toBeVisible();
  if (captureEvidence) await page.screenshot({ path: `acceptance-evidence/${info.project.name}-papers.png`, fullPage: true });
  await page.goto(`/practice/${paperId}/exam?mode=practice`);
  await expect(page.getByRole('button', { name: '答题卡', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'B False', exact: true }).click();
  await page.getByRole('button', { name: '标记此题', exact: true }).click();
  await expect(page.locator('.save-status')).toContainText('已同步');
  await page.reload();
  await expect(page.getByRole('button', { name: 'B False', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '标记此题', exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (isMobile) { await page.locator('.passage-toggle').click(); await expect(page.locator('.passage-text')).not.toBeVisible(); await page.locator('.passage-toggle').click(); }
  await page.getByRole('button', { name: '答题卡', exact: true }).click();
  await page.getByRole('button', { name: '第 4 题', exact: true }).click();
  await expect(page.getByRole('button', { name: 'C Review every day' })).toBeVisible();
  await page.getByRole('button', { name: '答题卡', exact: true }).click();
  await page.getByRole('button', { name: '第 6 题', exact: true }).click();
  await page.getByRole('button', { name: 'B daily', exact: true }).click();
  await expect(page.locator('.save-status')).toContainText('已同步');
  if (captureEvidence) await page.screenshot({ path: `acceptance-evidence/${info.project.name}-exam.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const next = await page.getByRole('button', { name: '下一题' }).boundingBox(); expect(next!.y + next!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.getByRole('button', { name: '下一题' }).click();
  await page.context().setOffline(true);
  await page.getByRole('textbox').fill(' TRAVELLING ');
  await page.context().setOffline(false);
  await expect(page.locator('.save-status')).toContainText('已同步');
  await page.reload();
  await expect(page.getByRole('textbox')).toHaveValue(' TRAVELLING ');
  await page.getByRole('button', { name: '交卷', exact: true }).click();
  await page.getByRole('button', { name: '确认交卷', exact: true }).click();
  await expect(page.getByRole('heading', { name: '交卷结果' })).toBeVisible();
  if (captureEvidence) await page.screenshot({ path: `acceptance-evidence/${info.project.name}-results.png`, fullPage: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: '交卷结果' })).toBeVisible();
  await page.getByRole('link', { name: '复习本次错题' }).click();
  await expect(page.getByRole('button', { name: '重新练习' }).first()).toBeVisible();
  if (captureEvidence) await page.screenshot({ path: `acceptance-evidence/${info.project.name}-mistakes.png`, fullPage: true });
  await page.locator('article').filter({ has: page.getByRole('heading', { name: '1. Choose the correct answer for question 1.', exact: true }) }).getByRole('button', { name: '重新练习' }).click();
  await page.locator('dialog').getByRole('button', { name: 'A True', exact: true }).click();
  await page.getByRole('button', { name: '提交答案', exact: true }).click();
  await expect(page.getByText('答对了 · 巩固中 1 / 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '再次练习', exact: true }).click();
  await page.locator('dialog').getByRole('button', { name: 'A True', exact: true }).click();
  await page.getByRole('button', { name: '提交答案', exact: true }).click();
  await expect(page.getByText('已掌握 · 连续答对 2 次', { exact: true })).toBeVisible();
  if (captureEvidence) await page.screenshot({ path: `acceptance-evidence/${info.project.name}-review.png` });
  expect(errors).toEqual([]);
});
