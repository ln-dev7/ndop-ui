import { expect, test } from '@playwright/test';
import { open } from './support/open';

test('the navigation groups components and lists the primitives', async ({
  page,
}) => {
  await open(page, '/docs/getting-started/introduction');
  const navigation = page.getByRole('navigation', { name: 'Docs' });
  await expect(navigation.getByText('Overlays', { exact: true })).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Dialog', exact: true }).first(),
  ).toHaveAttribute('href', '/docs/components/dialog');
  await navigation
    .getByRole('link', { name: 'Dialog', exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/docs\/primitives\/dialog$/);
});

test("a primitive page shows its import, contract and every part's API", async ({
  page,
  request,
}) => {
  await open(page, '/docs/primitives/dialog');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dialog primitive' }),
  ).toBeVisible();
  await expect(page.getByText("from '@ndop/primitives/dialog'")).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keyboard' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 3, name: 'NdDialogContent' }),
  ).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Dialog', exact: true }),
  ).toHaveAttribute('href', '/docs/components/dialog');

  const twin = await request.get('/docs/primitives/dialog.md');
  expect(await twin.text()).toMatch(/^# Dialog primitive\n/);
});
