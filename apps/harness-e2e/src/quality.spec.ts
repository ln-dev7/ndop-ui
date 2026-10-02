import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { harnessRoutes } from './routes';

test('every route renders on the server, hydrates cleanly and passes axe', async ({
  page,
  request,
}) => {
  const routes = await harnessRoutes(page);
  expect(routes).toContain('/tokens');

  for (const route of routes) {
    await test.step(route, async () => {
      const serverHtml = await (await request.get(route)).text();
      // `ngh` is Angular's hydration annotation: its presence shows the
      // page was rendered on the server with hydration enabled.
      expect(serverHtml, 'server-rendered content').toContain('<main');
      expect(serverHtml, 'hydration annotations').toContain('ngh=');

      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          problems.push(`${message.type()}: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => problems.push(`pageerror: ${error}`));

      // Angular logs this in dev mode once hydration completes, which both
      // proves the page hydrated and marks when its console is settled.
      const hydrated = page.waitForEvent('console', (message) =>
        message.text().startsWith('Angular hydrated'),
      );
      await page.goto(route);
      await hydrated;
      expect(problems).toEqual([]);

      const axe = await new AxeBuilder({ page }).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
    });
  }
});
