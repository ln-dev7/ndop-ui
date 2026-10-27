import { expect, test, type Locator } from '@playwright/test';
import { gotoHydrated } from '../navigation';

const families = [
  {
    name: 'dropdown-menu',
    trigger: 'button:has-text("Open")',
    root: '[ndDropdownMenuContent]',
    sub: '[ndDropdownMenuSubContent]',
    subTrigger: '[role="menuitem"]:has-text("Invite users")',
  },
  {
    name: 'context-menu',
    trigger: '[aria-label="Page preview"]',
    root: '[ndContextMenuContent]',
    sub: '[ndContextMenuSubContent]',
    subTrigger: '[role="menuitem"]:has-text("More tools")',
  },
  {
    name: 'menubar',
    trigger: '[role="menuitem"]:has-text("File")',
    root: '[ndMenubarContent]',
    sub: '[ndMenubarSubContent]',
    subTrigger: '[role="menuitem"]:has-text("Share")',
  },
];

async function observeExit(content: Locator) {
  await content.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations()
        .filter((animation) =>
          Number.isFinite(animation.effect?.getComputedTiming().endTime),
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    );
    element.addEventListener('animationstart', (event) => {
      if (
        event.target === element &&
        (event as AnimationEvent).animationName === 'exit'
      )
        element.setAttribute(
          'data-exit-display',
          getComputedStyle(element).display,
        );
    });
  });
}

async function expectExit(content: Locator, retainsOverlay: boolean) {
  await expect(content).toHaveAttribute('data-state', 'closed');
  await expect(content).toBeAttached();
  if (retainsOverlay)
    await expect(content).toHaveAttribute('data-exit-display', /^(?!none$).+/);
  else await expect(content).not.toHaveAttribute('data-exit-display');
  expect(
    await content.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(false);
  await expect
    .poll(() =>
      content.evaluate((element) => getComputedStyle(element).display),
    )
    .toBe('none');
}

for (const family of families) {
  for (const close of ['API', 'Escape', 'light dismiss'] as const) {
    test(`${family.name} retains closed root/submenu state after ${close}`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await gotoHydrated(page, `/examples/${family.name}-demo`);
      const retainsOverlay = await page.evaluate(
        () =>
          CSS.supports('overlay', 'auto') &&
          CSS.supports('transition-behavior', 'allow-discrete'),
      );
      const trigger = page.locator(family.trigger).first();
      await trigger.click({
        button: family.name === 'context-menu' ? 'right' : 'left',
      });
      const root = page.locator(family.root).first();
      await expect(root).toHaveAttribute('data-state', 'open');
      await observeExit(root);
      await page.locator(family.subTrigger).first().hover();
      const sub = page.locator(family.sub).first();
      await expect(sub).toBeVisible();
      await expect(sub).toHaveAttribute('data-state', 'open');
      await observeExit(sub);
      if (close === 'API')
        await root.evaluate((element) =>
          (element as HTMLElement).hidePopover(),
        );
      else if (close === 'light dismiss')
        await page
          .getByRole('heading', { name: `${family.name}-demo`, exact: true })
          .click();
      else {
        await sub.getByRole('menuitem').first().focus();
        await page.keyboard.press('Escape');
        await expectExit(sub, retainsOverlay);
        await expect(root).toHaveAttribute('data-state', 'open');
        await page.keyboard.press('Escape');
      }
      await expectExit(sub, retainsOverlay);
      await expectExit(root, retainsOverlay);
      await trigger.click({
        button: family.name === 'context-menu' ? 'right' : 'left',
      });
      await expect(root).toHaveAttribute('data-state', 'open');
      await expect(root).toBeVisible();
    });
  }
}
