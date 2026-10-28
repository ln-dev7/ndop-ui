import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Checks a native dialog's Tab boundary without trapping browser chrome.
 * The inert page must remain unreachable; the first control reached after
 * browser chrome must be the appropriate edge of the modal.
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
  const progression = [];
  try {
    for (let step = 0; step < 20; step++) {
      await page.keyboard.press(key);
      // Browser-chrome focus notifications can follow the key protocol reply.
      // Sample after they settle rather than sending another key on stale state.
      await page.waitForTimeout(50);
      const state = await dialog.evaluate((element) => ({
        inside: element.contains(document.activeElement),
        browserUI: !document.hasFocus(),
        modal: element.matches(':modal'),
        container: document.activeElement === element,
        active: document.activeElement?.outerHTML.slice(0, 200),
      }));
      progression.push(state);
      expect(state.modal).toBe(true);
      expect(state.inside || state.browserUI).toBe(true);
      if (state.browserUI || state.container) continue;
      // Stop at the first actual control. Traversing further could conceal
      // an incorrect re-entry edge or a direction-specific focus regression.
      await expect(destination).toBeFocused();
      return;
    }
    throw new Error('Native Tab navigation did not return from browser chrome');
  } catch (error) {
    await test.info().attach('native-dialog-focus-progression', {
      body: JSON.stringify({ key, progression }, null, 2),
      contentType: 'application/json',
    });
    throw error;
  }
}
