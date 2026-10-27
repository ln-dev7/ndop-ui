import { expect, test, type Page } from '@playwright/test';
import { gotoHydrated } from '../navigation';

async function openNested(page: Page) {
  await gotoHydrated(page, '/primitives/dialog');
  await page.getByRole('button', { name: 'Edit profile' }).click();
  const modal = page.getByRole('dialog', { name: 'Edit profile' });
  await page
    .getByRole('button', { name: 'Nested popover', exact: true })
    .click();
  const popover = page.getByRole('dialog', { name: 'Nested filters' });
  await expect(popover).toBeVisible();
  await expect
    .poll(() => popover.evaluate((element) => element.matches(':popover-open')))
    .toBe(true);
  return { modal, popover };
}

test.describe('Native overlay nesting', () => {
  test('keeps a select above its popover and modal, and closes only the select on Escape', async ({
    page,
  }) => {
    const { modal, popover } = await openNested(page);
    const trigger = page.getByRole('combobox', { name: 'Nested choice' });
    await trigger.click();
    const list = page.getByRole('listbox', { name: 'Nested choices' });
    await expect
      .poll(() => list.evaluate((element) => element.matches(':popover-open')))
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(popover).toBeVisible();
    await expect(modal).toBeVisible();
    await trigger.click();
    await page.getByRole('option', { name: 'Two', exact: true }).click();
    await expect(trigger).toHaveText('Two');
    await expect(popover).toBeVisible();
  });

  test('keeps combobox focus and selection inside the parent popover', async ({
    page,
  }) => {
    const { modal, popover } = await openNested(page);
    const field = page.getByRole('combobox', { name: 'Nested framework' });
    await field.fill('ang');
    await expect(
      page.getByRole('option', { name: 'Angular', exact: true }),
    ).toBeVisible();
    await expect(field).toBeFocused();
    await page.getByRole('option', { name: 'Angular', exact: true }).click();
    await expect(field).toHaveValue('Angular');
    await expect(field).toBeFocused();
    await expect(popover).toBeVisible();
    await expect(modal).toBeVisible();
  });

  test('layers nested menus and submenus, retaining native modality and Escape order', async ({
    page,
  }) => {
    const { modal, popover } = await openNested(page);
    await page
      .getByRole('button', { name: 'Nested actions', exact: true })
      .click();
    const menu = page.getByRole('menu', { name: 'Nested actions menu' });
    await expect(menu).toBeVisible();
    await page
      .getByRole('menuitem', { name: 'More actions', exact: true })
      .focus();
    await page.keyboard.press('ArrowRight');
    const submenu = page.getByRole('menu', { name: 'More actions menu' });
    await expect(submenu).toBeVisible();
    await expect
      .poll(() =>
        submenu.evaluate((element) => element.matches(':popover-open')),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(submenu).toBeHidden();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(popover).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(modal).toBeVisible();
  });

  test('opens a right-click context menu inside a popover inside a modal', async ({
    page,
  }) => {
    const { modal, popover } = await openNested(page);
    await page
      .getByLabel('Nested canvas')
      .click({ button: 'right', position: { x: 20, y: 20 } });
    const menu = page.getByRole('menu', { name: 'Nested context menu' });
    await expect(menu).toBeVisible();
    await page.getByRole('menuitem', { name: 'Nested command' }).click();
    await expect(menu).toBeHidden();
    await expect(popover).toBeVisible();
    await expect(modal).toBeVisible();
  });

  for (const fallback of [false, true]) {
    test(`keeps a hint above its parent without focus movement${fallback ? ' with the manual hint fallback' : ''}`, async ({
      page,
    }) => {
      if (fallback) {
        await page.addInitScript(() => {
          const descriptor = Object.getOwnPropertyDescriptor(
            HTMLElement.prototype,
            'popover',
          );
          if (!descriptor?.get || !descriptor.set)
            throw new Error('Native popover support is required.');
          Object.defineProperty(HTMLElement.prototype, 'popover', {
            configurable: true,
            get: descriptor.get,
            set(value: string) {
              descriptor.set?.call(this, value === 'hint' ? 'manual' : value);
            },
          });
        });
      }
      const { modal, popover } = await openNested(page);
      await page.getByRole('button', { name: 'Nested help' }).hover();
      const hint = page.getByRole('tooltip', { name: 'A contextual hint.' });
      await expect(hint).toBeVisible();
      await expect
        .poll(() =>
          hint.evaluate((element) => element.matches(':popover-open')),
        )
        .toBe(true);
      if (fallback) await expect(hint).toHaveAttribute('popover', 'manual');
      await expect(
        page.getByLabel('Nested filter', { exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(hint).toBeHidden();
      await expect(popover).toBeVisible();
      await expect(modal).toBeVisible();
    });
  }

  test('uses JavaScript positioning after scroll/resize when CSS anchors are unavailable, and closes on anchor removal', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = ((property: string, value?: string) =>
        property === 'position-anchor'
          ? false
          : value === undefined
            ? supports(property)
            : supports(property, value)) as typeof CSS.supports;
    });
    await gotoHydrated(page, '/primitives/popover');
    const trigger = page.getByRole('button', { name: 'Filters', exact: true });
    await trigger.click();
    const content = page.getByRole('dialog', { name: 'Filters' });
    await expect(content).toBeVisible();
    await expect
      .poll(() =>
        content.evaluate((element) =>
          (element as HTMLElement).style.getPropertyValue('position-anchor'),
        ),
      )
      .toBe('');
    await page.evaluate(() => {
      document.body.style.minHeight = '200vh';
      window.scrollTo(0, 20);
    });
    await page.setViewportSize({ width: 700, height: 650 });
    await expect
      .poll(async () => {
        const origin = await trigger.boundingBox();
        const panel = await content.boundingBox();
        return Math.abs(panel!.y - origin!.y - origin!.height - 4);
      })
      .toBeLessThan(2);
    await trigger.evaluate((element) => element.remove());
    await expect(content).toBeHidden();
  });
});
