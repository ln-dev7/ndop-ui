import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

// The span trigger is reached with Tab from an input: WebKit, like Safari's
// default, doesn't tab to buttons, so a button trigger would differ there.
async function focusShortcuts(page: Page) {
  await gotoHydrated(page, '/primitives/tooltip');
  await page.getByLabel('Before').focus();
  await page.keyboard.press('Tab');
  const trigger = page.getByText('Shortcuts', { exact: true });
  await expect(trigger).toBeFocused();
  const tooltip = page.getByRole('tooltip', {
    name: 'Press ? to see all shortcuts',
  });
  return { trigger, tooltip };
}

keyboardContract('tooltip', {
  Tab: async ({ page }) => {
    const { tooltip } = await focusShortcuts(page);
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('After')).toBeFocused();
    await expect(tooltip).toBeHidden();
  },
  Escape: async ({ page }) => {
    const { trigger, tooltip } = await focusShortcuts(page);
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await expect(trigger).toBeFocused();
  },
});

test.describe('Tooltip', () => {
  test('is never rendered open on the server', async ({ request }) => {
    const html = await (await request.get('/primitives/tooltip')).text();
    expect(html).not.toContain('role="tooltip"');
  });

  test('opens on hover after the delay and describes its trigger', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/tooltip');
    const trigger = page.getByRole('button', { name: 'Delete' });
    await trigger.hover();
    const tooltip = page.getByRole('tooltip', { name: 'Delete permanently' });
    await expect(tooltip).toBeHidden({ timeout: 400 });
    await expect(tooltip).toBeVisible();
    await expect(trigger).toHaveAccessibleDescription('Delete permanently');
    await expect(tooltip).toHaveAttribute('data-side', 'top');
  });

  test('stays open while the pointer moves onto it', async ({ page }) => {
    await gotoHydrated(page, '/primitives/tooltip');
    await page.getByRole('button', { name: 'Delete' }).hover();
    const tooltip = page.getByRole('tooltip', { name: 'Delete permanently' });
    await expect(tooltip).toBeVisible();
    await tooltip.hover();
    await page.waitForTimeout(500);
    await expect(tooltip).toBeVisible();

    await page.getByRole('heading', { name: 'Tooltip' }).hover();
    await expect(tooltip).toBeHidden();
  });

  test('passes axe while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const { tooltip } = await focusShortcuts(page);
    await expect(tooltip).toBeVisible();
    // `region` (a best-practice rule, not WCAG) flags content outside
    // landmarks; overlays render at the end of <body> by design, and the
    // tooltip's text reaches assistive technology as the trigger's
    // description.
    const result = await new AxeBuilder({ page })
      .disableRules(['region'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
