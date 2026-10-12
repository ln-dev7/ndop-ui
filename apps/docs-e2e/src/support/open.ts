import type { Page } from '@playwright/test';

/**
 * Opens a page and waits until Angular has hydrated it and settled, so
 * clicks reach the app rather than the prerendered markup. The docs mark
 * `<html>` with `data-hydrated` then (`app.config.ts`), since production
 * builds log nothing.
 *
 * @param page - A Playwright page.
 * @param url - Route to open.
 */
export async function open(page: Page, url: string): Promise<void> {
  await settleFrames(page);
  await page.goto(url);
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
}

/**
 * Waits for every frame that has started loading, such as a block preview,
 * to hydrate. Leaving a page while a frame still loads its scripts makes
 * Firefox and Safari abort them, and the frame's app logs the aborted
 * imports as errors, which the console checks would blame on the next
 * page. Lazy frames that never started are skipped.
 *
 * @param page - A Playwright page.
 */
export async function settleFrames(page: Page): Promise<void> {
  const started = page
    .frames()
    .filter(
      (frame) =>
        frame !== page.mainFrame() &&
        /^https?:/.test(frame.url()) &&
        !frame.isDetached(),
    );
  await Promise.all(
    started.map((frame) =>
      frame
        .locator('html[data-hydrated]')
        .waitFor({ state: 'attached', timeout: 20_000 })
        // A frame that navigates or detaches meanwhile has nothing left
        // to abort.
        .catch(() => undefined),
    ),
  );
}
