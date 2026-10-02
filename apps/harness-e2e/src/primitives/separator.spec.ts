import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

keyboardContract('separator', {});

test('separators expose role and orientation after hydration', async ({
  page,
}) => {
  await gotoHydrated(page, '/primitives/separator');
  await expect(page.getByTestId('horizontal')).toHaveAttribute(
    'role',
    'separator',
  );
  await expect(page.getByTestId('vertical')).toHaveAttribute(
    'aria-orientation',
    'vertical',
  );
  await expect(page.getByTestId('decorative')).toHaveAttribute('role', 'none');
  await expect(page.getByRole('separator')).toHaveCount(2);
});
