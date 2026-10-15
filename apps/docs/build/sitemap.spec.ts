import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { indexedPages } from './indexed-pages';
import { sitemapXml, writeSitemap } from './sitemap';

/** A page as the prerender writes it. */
const page = (title: string, robots = '') =>
  `<!DOCTYPE html><html lang="en"><head>${robots ? `<meta name="robots" content="${robots}">` : ''}<meta property="og:title" content="${title}"></head><body><main><h1>${title}</h1></main></body></html>`;

describe('the sitemap', () => {
  let site: string;
  const write = (file: string, body: string) => {
    mkdirSync(dirname(join(site, file)), { recursive: true });
    writeFileSync(join(site, file), body);
  };

  beforeEach(() => {
    site = mkdtempSync(join(tmpdir(), 'ndop-sitemap-'));
    write('index.html', page('Ndop UI'));
    write('docs/components/button.html', page('Button'));
    write('docs/components/button.md', '# Button');
    write('docs/components/button/changelog.html', page('Button changelog'));
    write('blocks/login-01.html', page('Login 01'));
    write('blocks/login-01/preview.html', page('Login 01 preview', 'noindex'));
    write('offline.html', page("You're offline", 'noindex'));
    write('404.html', page('Page not found', 'noindex'));
    write('themes.html', page('Themes &amp; colors'));
    // A layout with no page of its own sets no share card.
    write('docs.html', '<html><head><title>Ndop UI</title></head></html>');
    write('r/index.html', page('Not a page'));
    write('assets/x.html', page('Not a page'));
  });

  afterEach(() => rmSync(site, { recursive: true, force: true }));

  it('lists indexable pages only, sorted, with their titles', () => {
    expect(indexedPages(site)).toEqual([
      { path: '/', title: 'Ndop UI' },
      { path: '/blocks/login-01', title: 'Login 01' },
      { path: '/docs/components/button', title: 'Button' },
      { path: '/docs/components/button/changelog', title: 'Button changelog' },
      { path: '/themes', title: 'Themes & colors' },
    ]);
  });

  it('writes their canonical addresses in the sitemap protocol', () => {
    expect(writeSitemap(site)).toBe(5);
    expect(readFileSync(join(site, 'sitemap.xml'), 'utf-8')).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>\n    <loc>https://ndop.dev/</loc>\n  </url>',
        '  <url>\n    <loc>https://ndop.dev/blocks/login-01</loc>\n  </url>',
        '  <url>\n    <loc>https://ndop.dev/docs/components/button</loc>\n  </url>',
        '  <url>\n    <loc>https://ndop.dev/docs/components/button/changelog</loc>\n  </url>',
        '  <url>\n    <loc>https://ndop.dev/themes</loc>\n  </url>',
        '</urlset>',
        '',
      ].join('\n'),
    );
  });

  it('escapes URLs for XML', () => {
    expect(sitemapXml(["/a&b'"])).toContain(
      '<loc>https://ndop.dev/a&amp;b&apos;</loc>',
    );
  });

  it('refuses to write an empty sitemap', () => {
    const empty = mkdtempSync(join(tmpdir(), 'ndop-sitemap-'));
    try {
      expect(() => writeSitemap(empty)).toThrow(/No indexable pages/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
