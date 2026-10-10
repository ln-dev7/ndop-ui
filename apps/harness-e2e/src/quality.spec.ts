import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { harnessRoutes } from './routes';

// One test walks every route, so a retry's trace records the whole site
// and can fill a CI runner's disk; the step names say which route failed.
test.use({ trace: 'off' });

test('every route renders on the server, hydrates cleanly and passes axe', async ({
  page,
  request,
}) => {
  const routes = await harnessRoutes(page);
  expect(routes).toContain('/tokens');
  // One test walks every route, so its budget grows with the route count.
  test.setTimeout(routes.length * 10_000);

  // Every server render first: a route's first render compiles its files,
  // and on a cold dev server (as on CI) that invalidated modules a page
  // still open in the browser was loading. Pages open only once the dev
  // server has compiled everything.
  for (const route of routes) {
    await test.step(`${route} (server)`, async () => {
      // A new connection each time: the dev server closes idle keep-alive
      // sockets after Node's 5 s default, and a request that reuses one
      // as it closes fails with ECONNRESET.
      const serverHtml = await (
        await request.get(route, { headers: { connection: 'close' } })
      ).text();
      // `ngh` is Angular's hydration annotation: its presence shows the
      // page was rendered on the server with hydration enabled.
      expect(serverHtml, 'server-rendered content').toContain('<main');
      expect(serverHtml, 'hydration annotations').toContain('ngh=');
    });
  }

  for (const route of routes) {
    await test.step(route, async () => {
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
