import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function trigger(page: Page) {
  await gotoHydrated(page, '/primitives/collapsible');
  const button = page.getByRole('button', { name: 'Repositories' });
  await button.focus();
  return button;
}

keyboardContract('collapsible', {
  Enter: async ({ page }) => {
    const button = await trigger(page);
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByRole('link', { name: 'angular/angular' }),
    ).toBeVisible();
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  },
  Space: async ({ page }) => {
    const button = await trigger(page);
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(button).toBeFocused();
  },
});

test.describe('Collapsible', () => {
  test('renders an initially open collapsible open on the server', async ({
    request,
  }) => {
    const html = await (await request.get('/primitives/collapsible')).text();
    expect(html).toContain('Shown from the start.');
    expect(html).toMatch(
      /data-testid="open"[^>]*data-state="open"|data-state="open"[^>]*data-testid="open"/,
    );
  });

  test('hidden content is out of the tab order', async ({
    page,
    browserName,
  }) => {
    // WebKit, like Safari's default, doesn't tab to buttons or links.
    test.skip(browserName === 'webkit', 'Safari skips buttons and links');
    const button = await trigger(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Details' })).toBeFocused();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('link', { name: 'angular/angular' }),
    ).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'angular/angular' }),
    ).toBeFocused();
  });

  test('a disabled trigger does nothing', async ({ page }) => {
    await gotoHydrated(page, '/primitives/collapsible');
    await expect(page.getByRole('button', { name: 'Locked' })).toBeDisabled();
    await expect(page.getByText('Never shown.')).toBeHidden();
  });
});
