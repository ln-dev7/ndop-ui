import { expect, test } from '@playwright/test';
import { open } from './support/open';
import { readSeo, SITE, sitemapPaths } from './support/seo';

// Search engine readiness (ADR-0016, amendment 15). The quality crawl
// checks that every route is in the sitemap unless it is noindex; these
// check the pages the sitemap lists, the crawler's files, and the head as
// the app updates it.

/** Google shows about this many characters of a title in its results. */
const TITLE_LENGTH = 60;
/** Google shows about this many characters of a description. */
const DESCRIPTION_LENGTH = 160;

test('every page in the sitemap is served as itself, with unique titles and descriptions', async ({
  request,
}) => {
  test.setTimeout(5 * 60_000);
  const paths = await sitemapPaths(request);
  expect(paths.length, 'pages in the sitemap').toBeGreaterThan(50);
  expect(new Set(paths).size, 'duplicate entries').toBe(paths.length);
  expect(paths, 'trailing slashes').toEqual(
    paths.filter((path) => path === '/' || !path.endsWith('/')),
  );

  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  const long: string[] = [];
  for (const path of paths) {
    await test.step(path, async () => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), 'status').toBe(200);
      expect(response.headers()['content-type']).toMatch(/^text\/html/);
      expect(
        response.headers()['x-robots-tag'],
        'X-Robots-Tag',
      ).toBeUndefined();
      const seo = readSeo(await response.text());
      expect(seo.lang, 'lang').toBe('en');
      expect(seo.noindex, 'noindex').toBe(false);
      expect(seo.canonicals, 'canonical link').toEqual([SITE + path]);
      expect(seo.ogUrl, 'og:url').toBe(SITE + path);
      expect(seo.h1s, 'h1 elements').toBe(1);
      expect(seo.title, 'title').not.toBe('');
      expect(seo.description ?? '', 'description').not.toBe('');
      titles.set(seo.title, [...(titles.get(seo.title) ?? []), path]);
      const description = seo.description ?? '';
      descriptions.set(description, [
        ...(descriptions.get(description) ?? []),
        path,
      ]);
      if (seo.title.length > TITLE_LENGTH) {
        long.push(`title, ${seo.title.length}: ${path} "${seo.title}"`);
      }
      if (description.length > DESCRIPTION_LENGTH) {
        long.push(`description, ${description.length}: ${path}`);
      }
    });
  }
  const shared = (map: Map<string, string[]>) =>
    [...map].filter(([, pages]) => pages.length > 1);
  expect(shared(titles), 'titles shared by pages').toEqual([]);
  expect(shared(descriptions), 'descriptions shared by pages').toEqual([]);
  // Search engines cut long ones short rather than reject them, so they
  // are reported for editing, not failed.
  for (const entry of long) {
    test.info().annotations.push({ type: 'long', description: entry });
  }
});

test('robots.txt allows crawling and names the sitemap', async ({
  request,
}) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^text\/plain/);
  const lines = (await response.text()).split('\n').map((line) => line.trim());
  expect(lines).toContain('User-agent: *');
  expect(lines).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  expect(lines.filter((line) => /^disallow:\s*\S/i.test(line))).toEqual([]);
});

test('the sitemap is XML in the sitemap protocol', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^application\/xml/);
  const xml = await response.text();
  expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n/);
  expect(xml).toContain(
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  );
  expect(xml).toContain(`<loc>${SITE}/</loc>`);
  expect(xml).toContain(`<loc>${SITE}/docs/components/button</loc>`);
});

test('files for tools and agents stay crawlable but out of the index', async ({
  request,
}) => {
  for (const path of [
    '/docs/components/button.md',
    '/docs/getting-started/installation.md',
    '/llms.txt',
    '/llms-full.txt',
    '/r/index.json',
    '/r/button.json',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['x-robots-tag'], path).toBe('noindex');
  }
});

test('the home page names the site in WebSite structured data', async ({
  request,
}) => {
  const seo = readSeo(await (await request.get('/')).text());
  expect(seo.structuredData).toEqual([
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Ndop UI',
      url: `${SITE}/`,
    },
  ]);
  const other = readSeo(
    await (await request.get('/docs/components/button')).text(),
  );
  expect(other.structuredData).toEqual([]);
});

test("a block's page marks up the trail it shows as breadcrumbs", async ({
  request,
}) => {
  const seo = readSeo(await (await request.get('/blocks/login-01')).text());
  expect(seo.structuredData).toEqual([
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Blocks',
          item: `${SITE}/blocks`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Authentication',
          item: `${SITE}/blocks/auth`,
        },
        { '@type': 'ListItem', position: 3, name: 'Login 01' },
      ],
    },
  ]);
});

test('noindex pages have no canonical link and stay out of the sitemap', async ({
  request,
}) => {
  const sitemap = await sitemapPaths(request);
  for (const path of ['/offline', '/404.html', '/blocks/login-01/preview']) {
    const seo = readSeo(await (await request.get(path)).text());
    expect(seo.noindex, path).toBe(true);
    expect(seo.canonicals, path).toEqual([]);
    expect(sitemap, path).not.toContain(path.replace(/\.html$/, ''));
  }
});

test('navigating in the app keeps one canonical link, for the current page', async ({
  page,
}) => {
  const head = () =>
    page.evaluate(() => ({
      canonicals: [
        ...document.head.querySelectorAll('link[rel="canonical"]'),
      ].map((link) => link.getAttribute('href')),
      jsonLd: document.head.querySelectorAll(
        'script[type="application/ld+json"]',
      ).length,
      robots: document.head.querySelector('meta[name="robots"]'),
    }));
  await open(page, '/');
  expect(await head()).toEqual({
    canonicals: [`${SITE}/`],
    jsonLd: 1,
    robots: null,
  });
  // A full load would rebuild the head from the prerendered page; the
  // marker survives only a navigation inside the app.
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-spa', ''),
  );
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Docs', exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/getting-started\/introduction$/);
  await expect(page.locator('html[data-spa]')).toHaveCount(1);
  await expect.poll(head).toEqual({
    canonicals: [`${SITE}/docs/getting-started/introduction`],
    jsonLd: 0,
    robots: null,
  });
});
