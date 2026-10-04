import { expect, test, type Page } from '@playwright/test';

/** Every component the registry publishes, in navigation order. */
const COMPONENTS = [
  'badge',
  'button',
  'dialog',
  'input',
  'label',
  'popover',
  'separator',
  'tooltip',
];

/**
 * Opens a page and waits until Angular has hydrated it, so clicks reach
 * the app rather than the prerendered markup.
 *
 * @param page - A Playwright page.
 * @param url - Route to open.
 */
async function open(page: Page, url: string): Promise<void> {
  const hydrated = page.waitForEvent('console', (message) =>
    message.text().startsWith('Angular hydrated'),
  );
  await page.goto(url);
  await hydrated;
}

for (const name of COMPONENTS) {
  test(`the ${name} page renders and hydrates without errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await open(page, `/docs/components/${name}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'API reference' }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('the navigation lists every component', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/docs/components/dialog');
  const links = page
    .getByRole('navigation', { name: 'Docs' })
    .getByRole('link')
    .filter({
      hasText: /^(Badge|Button|Dialog|Input|Label|Popover|Separator|Tooltip)$/,
    });
  await expect(links).toHaveCount(COMPONENTS.length);
});

test('installation tabs follow the WAI-ARIA tabs pattern', async ({ page }) => {
  await open(page, '/docs/components/dialog');
  const tabs = page.getByRole('tablist', { name: 'Installation' });
  await tabs.getByRole('tab', { name: 'CLI' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Manual' })).toBeFocused();
  await expect(tabs.getByRole('tab', { name: 'Manual' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tabpanel', { name: 'Manual' })).toContainText(
    'src/app/ui/dialog/dialog.ts',
  );
});

test('trying the keyboard marks the key just pressed', async ({ page }) => {
  await open(page, '/docs/components/dialog');
  await page.getByRole('button', { name: 'Try the keyboard' }).click();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('docs-keyboard-table kbd[data-active]')).toHaveText(
    ['Shift', 'Tab'],
  );
});

test('a long file in the manual steps expands and stays expanded', async ({
  page,
}) => {
  await open(page, '/docs/components/popover');
  await page.getByRole('tab', { name: 'Manual' }).click();
  const file = page.locator('figure.code-frame-collapsible').first();
  const expand = file.getByRole('button', { name: 'Expand' });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expand.click();
  await expect(file.getByRole('button', { name: 'Collapse' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  // Another render, such as from switching tabs, keeps it expanded.
  await page.getByRole('tab', { name: 'CLI' }).click();
  await page.getByRole('tab', { name: 'Manual' }).click();
  await expect(file).toHaveAttribute('data-expanded', '');
});

test('the header uses the registry badge and button', async ({ page }) => {
  await open(page, '/docs/components/dialog');
  await expect(
    page.getByRole('list', { name: 'Facts' }).locator('[data-slot="badge"]'),
  ).not.toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Copy page', exact: true }),
  ).toHaveAttribute('data-slot', 'button');
});

test("a preview's overlays follow the site's direction", async ({ page }) => {
  await open(page, '/docs/components/popover');
  await page.getByRole('button', { name: 'Right-to-left' }).click();
  await page
    .locator('docs-example-preview')
    .first()
    .getByRole('button', { name: 'Open popover' })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((element) => getComputedStyle(element).direction),
  ).toBe('rtl');
});

test('the playground updates the preview, the snippet and the URL', async ({
  page,
}) => {
  await open(page, '/docs/components/button');
  const playground = page.locator('docs-playground');
  const fieldset = playground.getByRole('group', { name: 'variant' });
  // The radios are visually hidden behind their segments.
  await fieldset.getByText('secondary', { exact: true }).click();
  await expect(
    fieldset.getByRole('radio', { name: 'secondary' }),
  ).toBeChecked();
  await playground.getByRole('switch', { name: 'disabled' }).check();
  await expect(playground.locator('.preview-backdrop button')).toHaveAttribute(
    'data-variant',
    'secondary',
  );
  await expect(playground.locator('.preview-backdrop button')).toBeDisabled();
  await expect(playground.locator('pre')).toHaveText(
    '<button ndButton variant="secondary" [disabled]="true">Button</button>',
  );
  await expect(page).toHaveURL(/\?variant=secondary&disabled=true$/);
});

test('a playground link opens with its values', async ({ page }) => {
  await open(page, '/docs/components/popover?side=top&sideOffset=12');
  const playground = page.locator('docs-playground');
  await expect(
    playground.getByRole('radio', { name: 'top', exact: true }).first(),
  ).toBeChecked();
  await expect(
    playground.getByRole('slider', { name: 'sideOffset' }),
  ).toHaveValue('12');
  await expect(playground.locator('pre')).toContainText(
    'side="top" [sideOffset]="12"',
  );
});
