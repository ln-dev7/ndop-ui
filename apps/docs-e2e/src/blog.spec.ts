import { expect, test } from '@playwright/test';
import { open } from './support/open';
import { readSeo, SITE, sitemapPaths } from './support/seo';

// The blog (ADR-0016, amendment 16; ADR-0029): its index, a post's byline
// and structured data, the feed and the links to it.

const POST = '/blog/updating-code-you-own';
const TITLE = 'Updating code you own: three-way merges in a component registry';
const FEED = `<link rel="alternate" type="application/rss+xml" title="Ndop UI blog" href="${SITE}/blog/rss.xml">`;

test('the index lists the post with its date and author', async ({ page }) => {
  await open(page, '/blog');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blog');
  const post = page.getByRole('article', { name: TITLE });
  await expect(post.locator('time')).toHaveAttribute('datetime', '2026-10-15');
  await expect(post.locator('time')).toHaveText('October 15, 2026');
  await expect(post).toContainText('Valery Melou');
  await post.getByRole('link', { name: TITLE }).click();
  await expect(page).toHaveURL(POST);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
});

test('a post has a byline, a canonical link and BlogPosting data', async ({
  request,
}) => {
  const html = await (await request.get(POST)).text();
  const seo = readSeo(html);
  expect(seo.canonicals).toEqual([SITE + POST]);
  expect(seo.ogUrl).toBe(SITE + POST);
  expect(html).toContain('<meta property="og:type" content="article">');
  expect(html).toContain(FEED);
  expect(html).toMatch(
    /<a[^>]*href="https:\/\/x\.com\/valerymelou"[^>]*>\s*Valery Melou\s*<\/a>/,
  );
  expect(html).toMatch(/<time[^>]*datetime="2026-10-15"[^>]*>/);
  expect(seo.structuredData).toEqual([
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: TITLE,
      description: expect.any(String),
      datePublished: '2026-10-15',
      author: [
        {
          '@type': 'Person',
          name: 'Valery Melou',
          url: 'https://x.com/valerymelou',
        },
      ],
      image: [`${SITE}/og${POST}.jpg`],
      url: SITE + POST,
    },
  ]);
  const image = await request.get(`/og${POST}.jpg`);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/jpeg');
});

test('the blog is in the sitemap, and its pages link the feed', async ({
  request,
}) => {
  const paths = await sitemapPaths(request);
  expect(paths).toContain('/blog');
  expect(paths).toContain(POST);
  expect(await (await request.get('/blog')).text()).toContain(FEED);
  expect(
    await (await request.get('/docs/components/button')).text(),
  ).not.toContain('application/rss+xml');
});

test('the feed is RSS 2.0 and lists the post', async ({ request }) => {
  const response = await request.get('/blog/rss.xml');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe(
    'application/rss+xml; charset=utf-8',
  );
  const xml = await response.text();
  expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss /);
  expect(xml).toContain('version="2.0"');
  expect(xml).toContain(`<link>${SITE}/blog</link>`);
  const item = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, body = '']) => body)
    .find((body) => body.includes(`<link>${SITE}${POST}</link>`));
  expect(item).toContain(`<title>${TITLE}</title>`);
  expect(item).toContain('<dc:creator>Valery Melou</dc:creator>');
  expect(item).toContain('<pubDate>Thu, 15 Oct 2026 00:00:00 GMT</pubDate>');
});

test('the post has a Markdown twin kept out of the index', async ({
  request,
}) => {
  const response = await request.get(`${POST}.md`);
  expect(response.status()).toBe(200);
  expect(response.headers()['x-robots-tag']).toBe('noindex');
  expect(await response.text()).toMatch(
    new RegExp(`^# ${TITLE}\\n\\n> .+\\n\\nBy Valery Melou, 2026-10-15\\.\\n`),
  );
});
