import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Checks a native dialog's Tab boundary without trapping browser chrome.
 * The inert page must remain unreachable; returning from browser controls
 * resumes at the appropriate edge of the modal.
 *
 * @param page - The browser page.
 * @param dialog - The active native modal.
 * @param destination - The first or last sequentially focusable control.
 * @param reverse - Whether to navigate backward.
 */
export async function nativeDialogBoundary(
  page: Page,
  dialog: Locator,
  destination: Locator,
  reverse = false,
): Promise<void> {
  const key = reverse ? 'Shift+Tab' : 'Tab';
  await page.keyboard.press(key);
  const state = await dialog.evaluate((element) => ({
    inside: element.contains(document.activeElement),
    browserUI: !document.hasFocus(),
    modal: element.matches(':modal'),
  }));
  expect(state.modal).toBe(true);
  expect(state.inside || state.browserUI).toBe(true);
  for (
    let step = 0;
    step < 5 && !(await page.evaluate(() => document.hasFocus()));
    step++
  ) {
    await page.keyboard.press(key);
  }
  // WebKit re-enters at the dialog itself before its first control.
  if (await dialog.evaluate((element) => document.activeElement === element)) {
    await page.keyboard.press(key);
  }
  await expect(destination).toBeFocused();
}
