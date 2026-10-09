import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

keyboardContract('progress', {});

test('progress bars announce their value, or none while indeterminate', async ({
  page,
}) => {
  await gotoHydrated(page, '/primitives/progress');
  const upload = page.getByRole('progressbar', { name: 'Upload' });
  await expect(upload).toHaveAttribute('aria-valuenow', '40');
  await expect(upload).toHaveAttribute('aria-valuetext', '40%');
  const sync = page.getByRole('progressbar', { name: 'Sync' });
  await expect(sync).not.toHaveAttribute('aria-valuenow');
  await expect(sync).toHaveAttribute('data-state', 'indeterminate');
  await expect(
    page.getByRole('progressbar', { name: 'Install' }),
  ).toHaveAttribute('data-state', 'complete');
});
