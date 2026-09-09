import { test, expect } from '@playwright/test';

test.describe('Practice Exam Interactions', () => {
  test('should navigate to paper, start practice, and test interactions', async ({ page, isMobile }) => {
    // Navigate to papers list
    await page.goto('/papers');
    
    // Find the first paper link and click
    const paperLink = page.locator('a[href^="/papers/"]').first();
    const paperUrl = await paperLink.getAttribute('href');
    await paperLink.click();
    
    // Click Start Practice
    await page.getByText('开始练习 (Practice)').click();
    
    // We are on /practice/[id]
    await expect(page.locator('h1')).toBeVisible();
    await page.getByRole('link', { name: '开始练习 (Practice)' }).click();
    
    // We are on /practice/[id]/exam
    await expect(page.locator('button', { has: page.locator('svg.lucide-menu') }).first()).toBeVisible();
    
    // Answer first question
    const firstQuestionLabel = page.locator('label').first();
    if (await firstQuestionLabel.isVisible()) {
      await firstQuestionLabel.click();
    }
    
    // Open Answer Sheet
    await page.locator('button', { has: page.locator('svg.lucide-menu') }).first().click();
    await expect(page.locator('text=答题卡')).toBeVisible();
    
    // Click a question in answer sheet to jump (if available)
    const qsButton = page.locator('.grid button');
    if (await qsButton.count() > 5) {
        await qsButton.nth(5).click();
    } else if (await qsButton.count() > 0) {
        await qsButton.first().click();
    }
    
    // Mark a question
    await page.locator('button', { has: page.locator('svg.lucide-flag') }).click();
    
    // Refresh to verify draft restore
    await page.reload();
    
    // Verify answer sheet state is restored
    await page.locator('button', { has: page.locator('svg.lucide-menu') }).first().click();
    // Check if the marked question is still marked
    await expect(page.locator('button.bg-orange-100').first()).toBeVisible();
    
    // Close Answer Sheet
    await page.getByRole('button', { name: '×' }).or(page.locator('button', { has: page.locator('svg.lucide-menu') }).nth(1)).first().click();

    // Mobile drawer testing
    if (isMobile) {
      if (await page.locator('text=展开阅读原文').isVisible()) {
          await page.getByText('展开阅读原文').click();
          await expect(page.locator('text=阅读材料').first()).toBeVisible();
          // collapse it
          await page.locator('button', { has: page.locator('svg.lucide-chevron-up') }).first().click();
      }
    }
    
    // Submit
    page.on('dialog', dialog => dialog.accept());
    await page.getByText('交卷').click();
    
    // Check results page
    await expect(page.getByText('Exam Results')).toBeVisible();
  });
});
