import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { open } from './support/open';
import { SiteMap } from './support/site-map';

test('every route renders on the server, hydrates cleanly, passes axe and links only to pages that exist', async ({
  page,
  request,
}) => {
  // One test walks the whole site, discovering routes from its links.
  test.setTimeout(10 * 60_000);
  const site = new SiteMap('/');

  for (let route = site.next(); route !== undefined; route = site.next()) {
    await test.step(route, async () => {
      const response = await request.get(route);
      expect(response.status(), 'status').toBe(200);
      const serverHtml = await response.text();
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
      // Each scheme on a fresh load: switching in place would let axe
      // sample colors mid-transition.
      for (const colorScheme of ['dark', 'light'] as const) {
        await page.emulateMedia({ colorScheme });
        await open(page, route);
        const axe = await new AxeBuilder({ page }).analyze();
        expect(
          axe.violations.map(
            (violation) => `${colorScheme} ${violation.id}: ${violation.help}`,
          ),
        ).toEqual([]);
      }
      expect(problems, 'console').toEqual([]);

      const links = await page
        .locator('a[href^="/"]')
        .evaluateAll((anchors) =>
          anchors.map((anchor) => anchor.getAttribute('href') ?? ''),
        );
      site.add(links);
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
    });
  }

  expect(site.size, 'routes found').toBeGreaterThan(10);
  for (const file of site.files) {
    expect((await request.get(file)).status(), file).toBe(200);
  }
  for (const fragment of site.fragments) {
    const [path = '', id = ''] = fragment.split('#');
    const html = await (await request.get(path)).text();
    expect(html, `#${id} on ${path}`).toContain(
      `id="${decodeURIComponent(id)}"`,
    );
  }
});
