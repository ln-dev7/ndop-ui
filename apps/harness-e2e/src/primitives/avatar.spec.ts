import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

keyboardContract('avatar', {});

test('an avatar shows its image once loaded, else its fallback', async ({
  page,
}) => {
  await gotoHydrated(page, '/primitives/avatar');
  await expect(page.getByTestId('loads')).toHaveAttribute(
    'data-status',
    'loaded',
  );
  await expect(page.getByRole('img', { name: 'Ada Lovelace' })).toBeVisible();
  await expect(page.getByTestId('fails')).toHaveAttribute(
    'data-status',
    'error',
  );
  await expect(page.getByText('GH')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Grace Hopper' })).toHaveCount(0);
});
