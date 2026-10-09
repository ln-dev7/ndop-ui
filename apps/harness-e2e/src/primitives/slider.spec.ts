import { expect, test, type Page } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function volume(page: Page) {
  await gotoHydrated(page, '/primitives/slider');
  const thumb = page.getByRole('slider', { name: 'Volume' });
  await thumb.focus();
  return thumb;
}

keyboardContract('slider', {
  ArrowRight: async ({ page }) => {
    const thumb = await volume(page);
    await page.keyboard.press('ArrowRight');
    await expect(thumb).toHaveAttribute('aria-valuenow', '31');
    await expect(page.getByText('Volume: 31')).toBeVisible();
    const balance = page.getByRole('slider', { name: 'Balance' });
    await balance.focus();
    await page.keyboard.press('ArrowRight');
    await expect(balance).toHaveAttribute('aria-valuenow', '49');
  },
  ArrowUp: async ({ page }) => {
    const thumb = await volume(page);
    await page.keyboard.press('ArrowUp');
    await expect(thumb).toHaveAttribute('aria-valuenow', '31');
  },
  ArrowLeft: async ({ page }) => {
    const thumb = await volume(page);
    await page.keyboard.press('ArrowLeft');
    await expect(thumb).toHaveAttribute('aria-valuenow', '29');
    const balance = page.getByRole('slider', { name: 'Balance' });
    await balance.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(balance).toHaveAttribute('aria-valuenow', '51');
  },
  ArrowDown: async ({ page }) => {
    const thumb = await volume(page);
    await page.keyboard.press('ArrowDown');
    await expect(thumb).toHaveAttribute('aria-valuenow', '29');
  },
  PageUp: async ({ page }) => {
    const thumb = await volume(page);
    await page.keyboard.press('PageUp');
    await expect(thumb).toHaveAttribute('aria-valuenow', '40');
  },
  PageDown: async ({ page }) => {
    const thumb = await volume(page);
    await page.keyboard.press('PageDown');
    await expect(thumb).toHaveAttribute('aria-valuenow', '20');
  },
  Home: async ({ page }) => {
    await gotoHydrated(page, '/primitives/slider');
    const high = page.getByRole('slider', { name: 'Maximum price' });
    await high.focus();
    await page.keyboard.press('Home');
    await expect(high).toHaveAttribute('aria-valuenow', '100');
  },
  End: async ({ page }) => {
    await gotoHydrated(page, '/primitives/slider');
    const low = page.getByRole('slider', { name: 'Minimum price' });
    await low.focus();
    await page.keyboard.press('End');
    await expect(low).toHaveAttribute('aria-valuenow', '300');
  },
});

test.describe('Slider', () => {
  test('pressing the track moves the nearest thumb there and focuses it', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/slider');
    const slider = page.getByTestId('volume');
    const box = await slider.boundingBox();
    if (!box) throw new Error('The slider has no box.');
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
    const thumb = page.getByRole('slider', { name: 'Volume' });
    await expect(thumb).toBeFocused();
    await expect(thumb).toHaveAttribute('aria-valuenow', '80');
  });

  test('a disabled slider is out of the tab order', async ({ page }) => {
    await gotoHydrated(page, '/primitives/slider');
    const thumb = page.getByRole('slider', { name: 'Brightness' });
    await expect(thumb).toHaveAttribute('aria-disabled', 'true');
    await expect(thumb).not.toHaveAttribute('tabindex');
  });
});
