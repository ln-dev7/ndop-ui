import { expect, test } from '@playwright/test';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

keyboardContract('form-field', {});

test('a field describes its input and announces its error once touched', async ({
  page,
}) => {
  await gotoHydrated(page, '/primitives/form-field');
  const input = page.getByRole('textbox', { name: 'Email' });
  await expect(input).toHaveAccessibleDescription('We never share it.');
  await expect(page.getByRole('alert')).toBeHidden();
  await input.focus();
  await input.blur();
  await expect(page.getByRole('alert')).toHaveText('Enter your email.');
  await expect(input).toHaveAccessibleDescription(
    'We never share it. Enter your email.',
  );
  await input.fill('ada@');
  await expect(page.getByRole('alert')).toHaveText(
    'Enter a valid email address.',
  );
  await input.fill('ada@example.com');
  await expect(page.getByRole('alert')).toBeHidden();
});
