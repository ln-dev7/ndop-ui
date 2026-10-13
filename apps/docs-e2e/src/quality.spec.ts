import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { open } from './support/open';
import { SiteMap } from './support/site-map';

// One test walks every route, so a retry's trace records the whole site
// and can fill a CI runner's disk; the step names say which route failed.
test.use({ trace: 'off' });

test('every route renders on the server, hydrates cleanly, passes axe and links only to pages that exist', async ({
  page,
  request,
}) => {
  // One test walks the whole site, discovering routes from its links, so
  // its budget grows with each route it finds.
  test.setTimeout(10 * 60_000);
  const site = new SiteMap('/');
  // Linked from nowhere: the service worker answers with it (ADR-0027).
  site.add(['/offline']);

  for (let route = site.next(); route !== undefined; route = site.next()) {
    test.setTimeout(test.info().timeout + 10_000);
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
        // Firefox warns that a preloaded font went unused when a later
        // page in the same session already has it in memory, as the crawl
        // does; a first visit uses the preload.
        if (/preloaded with link preload was not used/.test(message.text())) {
          return;
        }
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
        // Frames hold pages the crawl checks on their own, such as block
        // previews; across frames, axe reads each preview's main as a
        // second, unnamed main of the gallery.
        const axe = await new AxeBuilder({ page }).exclude('iframe').analyze();
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
      // A block preview's links are placeholders for the app it would
      // sit in, such as /login, not pages of this site (ADR-0022).
      if (!/^\/blocks\/[^/]+\/preview$/.test(route)) site.add(links);
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
