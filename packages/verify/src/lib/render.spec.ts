import { chromium, type Browser } from 'playwright-core';
import { emptyIcons } from './render';

describe('emptyIcons', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('waits for icons to draw, then reports the ones that stay empty', async () => {
    const page = await browser.newPage();
    await page.setContent(`
      <svg ndIcon="check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
      <svg ndIcon="late" viewBox="0 0 24 24"></svg>
      <svg ndIcon="log-out"></svg>
      <svg ndIcon="unregistered" viewBox="0 0 24 24"></svg>
      <script>
        setTimeout(() => {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          document.querySelector('[ndicon="late"]').append(path);
        }, 200);
      </script>
    `);
    expect(await emptyIcons(page, 1_000)).toEqual([
      { name: 'log-out', applied: false },
      { name: 'unregistered', applied: true },
    ]);
    expect(
      await page.evaluate(
        () => document.querySelector('[ndicon="late"]')?.childElementCount,
      ),
    ).toBe(1);
    await page.close();
  });

  it('returns at once when every icon has drawn', async () => {
    const page = await browser.newPage();
    await page.setContent(
      '<svg ndIcon="x" viewBox="0 0 24 24"><path d="M18 6 6 18" /></svg>',
    );
    const started = performance.now();
    expect(await emptyIcons(page, 5_000)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(2_000);
    await page.close();
  });
});
