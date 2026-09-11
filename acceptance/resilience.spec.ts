import { test, expect } from '@playwright/test';
const paperId = 'acceptance-fixture';
const captureEvidence = process.env.UPDATE_ACCEPTANCE_EVIDENCE === '1';

test('offline reload, practice pause, failed submission and restart', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(`/practice/${paperId}/exam?mode=practice`);
  await expect(page.getByRole('button', { name: '答题卡', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'A True', exact: true }).click();
  await expect(page.locator('.save-status')).toContainText('已同步');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'CACHE_PAGE', url: location.href, assets: [...Array.from(document.scripts, s => s.src), ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), s => s.href)].filter(Boolean) });
  });
  await expect.poll(() => page.evaluate(async () => (await caches.match(location.href))?.status)).toBe(200);
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'B False', exact: true }).click();
  page.on('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(page.getByRole('button', { name: 'B False', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '交卷', exact: true }).click();
  await page.getByRole('button', { name: '确认交卷', exact: true }).click();
  await expect(page.getByRole('heading', { name: '交卷结果' })).not.toBeVisible();
  await page.context().setOffline(false);
  await expect(page.locator('.save-status')).toContainText('已同步');
  await page.getByRole('button', { name: '暂停练习' }).click();
  const before = await page.locator('.timer').innerText();
  await page.waitForTimeout(5000);
  expect(await page.locator('.timer').innerText()).toBe(before);
  await page.getByRole('button', { name: '继续练习', exact: true }).first().click();
  await expect.poll(async () => (await page.locator('.timer').innerText()) !== before).toBeTruthy();
  await page.getByRole('button', { name: '交卷', exact: true }).click();
  await page.getByRole('button', { name: '确认交卷', exact: true }).click();
  await expect(page.getByRole('heading', { name: '交卷结果' })).toBeVisible();
  await page.getByRole('link', { name: '再次练习' }).click();
  await page.getByRole('link', { name: '开始练习', exact: true }).click();
  await expect(page.getByRole('button', { name: '答题卡', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'B False', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('320px layout and sync dialog keyboard behavior', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of ['/', '/papers', '/mistakes', '/flashcards']) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.getByRole('button', { name: '设备同步' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  if (captureEvidence) await page.screenshot({ path: `acceptance-evidence/${info.project.name}-320px.png`, fullPage: true });
});
