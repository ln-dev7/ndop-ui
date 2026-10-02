import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function open(page: Page) {
  await gotoHydrated(page, '/primitives/button');
  return {
    buttonCount: page.getByTestId('button-count'),
    linkCount: page.getByTestId('link-count'),
  };
}

keyboardContract('button', {
  Enter: async ({ page }) => {
    const { buttonCount, linkCount } = await open(page);
    await page.getByRole('button', { name: 'Increment' }).press('Enter');
    await expect(buttonCount).toHaveText('1');

    await page.getByRole('link', { name: 'Link', exact: true }).press('Enter');
    await expect(linkCount).toHaveText('1');
    await expect(page).toHaveURL(/#activated$/);

    const disabledLink = page.getByRole('link', { name: 'Disabled link' });
    await disabledLink.focus();
    await disabledLink.press('Enter');
    await expect(linkCount).toHaveText('1');
  },
  Space: async ({ page }) => {
    const { buttonCount, linkCount } = await open(page);
    await page.getByRole('button', { name: 'Increment' }).press(' ');
    await expect(buttonCount).toHaveText('1');

    await page.getByRole('link', { name: 'Link', exact: true }).press(' ');
    await expect(linkCount).toHaveText('0');
  },
});

test('disabled buttons and links leave the tab order', async ({ page }) => {
  await open(page);
  await expect(
    page.getByRole('button', { name: 'Disabled button' }),
  ).toBeDisabled();
  await expect(
    page.getByRole('link', { name: 'Disabled link' }),
  ).toHaveAttribute('tabindex', '-1');

  // WebKit, like Safari's default setting, doesn't tab to links at all, so
  // the check is what Tab never reaches rather than an exact sequence.
  await page.getByRole('button', { name: 'Increment' }).focus();
  const reached: string[] = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    reached.push(
      await page.evaluate(
        () => document.activeElement?.textContent?.trim() ?? '',
      ),
    );
  }
  expect(reached).not.toContain('Disabled button');
  expect(reached).not.toContain('Disabled link');
});
