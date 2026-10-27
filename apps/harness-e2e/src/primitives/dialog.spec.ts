import { expect, test, type Page } from '@playwright/test';
import { nativeDialogBoundary } from '../native-dialog';
import { keyboardContract } from '../keyboard';
import { gotoHydrated } from '../navigation';

async function openDialog(page: Page) {
  await gotoHydrated(page, '/primitives/dialog');
  const trigger = page.getByRole('button', { name: 'Edit profile' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Edit profile' });
  await expect(dialog).toBeVisible();
  return { trigger, dialog };
}

keyboardContract('dialog', {
  Tab: async ({ page }) => {
    const { dialog } = await openDialog(page);
    await page.getByRole('button', { name: 'Save' }).focus();
    await nativeDialogBoundary(
      page,
      dialog,
      page.getByLabel('Name', { exact: true }),
    );
  },
  'Shift + Tab': async ({ page, browserName }) => {
    const { dialog } = await openDialog(page);
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
    await nativeDialogBoundary(
      page,
      dialog,
      browserName === 'webkit'
        ? page.getByLabel('Username')
        : page.getByRole('button', { name: 'Save' }),
      true,
    );
  },
  Escape: async ({ page }) => {
    const { trigger, dialog } = await openDialog(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId('state')).toHaveText('closed');
  },
});

test.describe('Dialog', () => {
  test('is never rendered open on the server', async ({ request }) => {
    const html = await (await request.get('/primitives/dialog')).text();
    expect(html).toContain('Edit profile');
    expect(html).not.toContain('role="dialog"');
  });

  test('applies an initially bound open state only after hydration', async ({
    page,
    request,
  }) => {
    const url = '/primitives/dialog?open=true';
    const html = await (await request.get(url)).text();
    expect(html).not.toMatch(/<dialog[^>]*\sopen(?:[=\s>])/);
    await gotoHydrated(page, url);
    const dialog = page.getByRole('dialog', { name: 'Edit profile' });
    await expect
      .poll(() => dialog.evaluate((element) => element.matches(':modal')))
      .toBe(true);
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  });

  test('uses native modality and synchronizes browser close', async ({
    page,
  }) => {
    const { trigger, dialog } = await openDialog(page);
    await expect(dialog).toHaveJSProperty('tagName', 'DIALOG');
    await expect
      .poll(() => dialog.evaluate((node) => node.matches(':modal')))
      .toBe(true);
    await dialog.evaluate((node) => (node as HTMLDialogElement).close());
    await expect(page.getByTestId('state')).toHaveText('closed');
    await expect(trigger).toBeFocused();
  });

  test('focuses the first focusable element on open', async ({ page }) => {
    await openDialog(page);
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  });

  test('closes on an overlay click and returns focus', async ({ page }) => {
    const { trigger, dialog } = await openDialog(page);
    await page.mouse.click(10, 10);
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('ignores panel padding clicks and drags out to the backdrop', async ({
    page,
  }) => {
    const { dialog } = await openDialog(page);
    const bounds = await dialog.boundingBox();
    if (!bounds) throw new Error('The dialog has no bounds.');
    await page.mouse.click(bounds.x + 3, bounds.y + 3);
    await expect(dialog).toBeVisible();
    await page.mouse.move(bounds.x + 3, bounds.y + 3);
    await page.mouse.down();
    await page.mouse.move(10, 10);
    await page.mouse.up();
    await expect(dialog).toBeVisible();
  });

  test('blocks page scroll while open', async ({ page }) => {
    await openDialog(page);
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('preserves the document position and styles when the last modal closes', async ({
    page,
  }) => {
    await gotoHydrated(page, '/primitives/dialog');
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);
    await page.locator('body').evaluate((element) => {
      (element as HTMLElement).style.setProperty(
        'position',
        'relative',
        'important',
      );
    });
    const original = await page.locator('body').getAttribute('style');
    await page
      .getByRole('button', { name: 'Edit profile' })
      .evaluate((element) => (element as HTMLElement).click());
    const dialog = page.getByRole('dialog', { name: 'Edit profile' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);
    expect((await page.locator('body').getAttribute('style')) || null).toBe(
      original || null,
    );
  });

  test('keeps the page inert when focus is requested behind the modal', async ({
    page,
  }) => {
    const { trigger, dialog } = await openDialog(page);
    await trigger.evaluate((element) => element.focus());
    await expect
      .poll(() =>
        dialog.evaluate((element) => element.contains(document.activeElement)),
      )
      .toBe(true);
  });

  test('skips controls that become disabled or hidden', async ({ page }) => {
    const { dialog } = await openDialog(page);
    await dialog.evaluate((element) => {
      element
        .querySelector('[aria-label="Username"]')
        ?.insertAdjacentHTML(
          'afterend',
          '<input aria-label="Dynamic control">',
        );
    });
    await page.getByLabel('Username').evaluate((element) => {
      (element as HTMLInputElement).disabled = true;
    });
    await page.getByLabel('Name', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Dynamic control')).toBeFocused();
    await page.getByLabel('Dynamic control').evaluate((element) => {
      (element as HTMLElement).hidden = true;
    });
    await page.getByLabel('Username').evaluate((element) => {
      (element as HTMLInputElement).disabled = false;
    });
    await page.getByLabel('Name', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Username')).toBeFocused();
  });

  test('keeps nested dialogs modal and restores each trigger', async ({
    page,
  }) => {
    const { dialog, trigger } = await openDialog(page);
    const nestedTrigger = page.getByRole('button', {
      name: 'Nested dialog',
      exact: true,
    });
    await nestedTrigger.click();
    const nested = page.getByRole('dialog', { name: 'Nested question' });
    await expect(nested).toBeVisible();
    await expect
      .poll(() => nested.evaluate((element) => element.matches(':modal')))
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(nested).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(nestedTrigger).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('survives rapid native close and reopen', async ({ page }) => {
    const { dialog } = await openDialog(page);
    await dialog.evaluate((element) => {
      element
        .querySelectorAll<HTMLElement>('input, button')
        .forEach((control) => {
          control.hidden = true;
        });
      const native = element as HTMLDialogElement;
      native.close();
      native.showModal();
    });
    await expect
      .poll(() => dialog.evaluate((element) => element.matches(':modal')))
      .toBe(true);
    await expect(page.getByTestId('state')).toHaveText('open');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('state')).toHaveText('closed');
  });

  test('focuses a modal with no interactive children', async ({ page }) => {
    await gotoHydrated(page, '/primitives/dialog');
    const trigger = page.getByRole('button', {
      name: 'Empty dialog',
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Empty question' });
    await expect(dialog).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('passes axe while open', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await openDialog(page);
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
