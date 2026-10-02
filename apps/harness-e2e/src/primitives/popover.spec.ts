import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function openFilters(page: Page) {
  await gotoHydrated(page, '/primitives/popover');
  const trigger = page.getByRole('button', { name: 'Filters' });
  await trigger.click();
  const content = page.getByRole('dialog', { name: 'Filters' });
  await expect(content).toBeVisible();
  await expect(page.getByLabel('Search')).toBeFocused();
  return { trigger, content };
}

// Text inputs only: WebKit, like Safari's default, doesn't tab to buttons or
// links, so a button-only sequence would differ between engines.
async function openPrice(page: Page) {
  await gotoHydrated(page, '/primitives/popover');
  const trigger = page.getByRole('button', { name: 'Price' });
  await trigger.click();
  const content = page.getByRole('dialog', { name: 'Price' });
  await expect(page.getByLabel('Min')).toBeFocused();
  return { trigger, content };
}

keyboardContract('popover', {
  Escape: async ({ page }) => {
    const { trigger, content } = await openFilters(page);
    await page.keyboard.press('Escape');
    await expect(content).toBeHidden();
    await expect(trigger).toBeFocused();
  },
  Tab: async ({ page }) => {
    const { content } = await openPrice(page);
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Max')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(content).toBeHidden();
    await expect(page.getByLabel('Notes')).toBeFocused();
  },
  'Shift + Tab': async ({ page }) => {
    const { trigger, content } = await openPrice(page);
    await page.keyboard.press('Shift+Tab');
    await expect(content).toBeHidden();
    await expect(trigger).toBeFocused();
  },
});

test.describe('Popover', () => {
  test('is never rendered open on the server', async ({ request }) => {
    const html = await (await request.get('/primitives/popover')).text();
    expect(html).toContain('Filters');
    expect(html).not.toContain('role="dialog"');
  });

  test('sits below the trigger and closes on an outside click', async ({
    page,
  }) => {
    const { trigger, content } = await openFilters(page);
    const triggerBox = await trigger.boundingBox();
    const contentBox = await content.boundingBox();
    expect(contentBox!.y).toBeGreaterThanOrEqual(
      triggerBox!.y + triggerBox!.height,
    );
    await expect(content).toHaveAttribute('data-side', 'bottom');

    await page.getByRole('heading', { name: 'Popover' }).click();
    await expect(content).toBeHidden();
  });

  test('flips to the top when there is no room below', async ({ page }) => {
    await gotoHydrated(page, '/primitives/popover');
    await page.getByRole('button', { name: 'Pinned' }).click();
    const content = page.getByRole('dialog', { name: 'Pinned' });
    await expect(content).toHaveAttribute('data-side', 'top');
  });

  test('places side="end" after the trigger in LTR and before it in RTL', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/popover');
    for (const dir of ['ltr', 'rtl'] as const) {
      const trigger = page.getByRole('button', { name: `Details ${dir}` });
      await trigger.click();
      const content = page.getByRole('dialog', { name: `Details ${dir}` });
      await expect(content).toBeVisible();
      await expect(content).toHaveAttribute('data-side', 'end');
      const triggerBox = (await trigger.boundingBox())!;
      const contentBox = (await content.boundingBox())!;
      if (dir === 'ltr') {
        expect(contentBox.x).toBeGreaterThanOrEqual(
          triggerBox.x + triggerBox.width,
        );
      } else {
        expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(
          triggerBox.x,
        );
      }
      await page.keyboard.press('Escape');
      await expect(content).toBeHidden();
    }
  });

  test('passes axe while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await openFilters(page);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
