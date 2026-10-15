import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parsePost,
  postMarkdown,
  readPosts,
  rssDate,
  rssXml,
} from './blog-posts';

const file = (title: string, date: string) =>
  `---\ntitle: '${title}'\ndescription: "Say \\"hi\\"."\ndate: ${date}\nauthor: Valery Melou\n---\n\n## Hello\n\n\`\`\`ts title="a.ts"\nconst a = 1;\n\`\`\`\n`;

describe('parsePost', () => {
  it('reads quoted and plain front matter, and keeps the body', () => {
    expect(parsePost(file("It's: a post", '2026-10-15'), '/blog/a')).toEqual({
      url: '/blog/a',
      title: "It's: a post",
      description: 'Say "hi".',
      date: '2026-10-15',
      author: 'Valery Melou',
      body: '## Hello\n\n```ts title="a.ts"\nconst a = 1;\n```',
    });
  });

  it("doubles a single-quoted string's quotes in YAML", () => {
    expect(parsePost("---\ntitle: 'It''s'\n---\n", '/blog/a').title).toBe(
      "It's",
    );
  });
});

describe('readPosts', () => {
  let folder: string;
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'blog-'));
  });
  afterEach(() => rmSync(folder, { recursive: true, force: true }));

  it('reads every post, newest first', () => {
    writeFileSync(join(folder, 'old.md'), file('Old', '2026-01-02'));
    writeFileSync(join(folder, 'new.md'), file('New', '2026-10-15'));
    mkdirSync(join(folder, 'images'));
    expect(readPosts(folder).map((post) => post.url)).toEqual([
      '/blog/new',
      '/blog/old',
    ]);
  });

  it('reads nothing from a missing folder', () => {
    expect(readPosts(join(folder, 'none'))).toEqual([]);
  });
});

describe('postMarkdown', () => {
  it('gives the twin a title, summary, byline and plain fences', () => {
    expect(postMarkdown(parsePost(file('A', '2026-10-15'), '/blog/a'))).toBe(
      '# A\n\n> Say "hi".\n\nBy Valery Melou, 2026-10-15.\n\n## Hello\n\n`a.ts`:\n\n```ts\nconst a = 1;\n```\n',
    );
  });
});

describe('rssXml', () => {
  it('writes an RSS 2.0 channel with one item per post', () => {
    const xml = rssXml([parsePost(file('A & B', '2026-10-15'), '/blog/a')]);
    expect(xml).toMatch(
      /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0"/,
    );
    expect(xml).toContain('<link>https://ndop.dev/blog</link>');
    expect(xml).toContain(
      '<atom:link href="https://ndop.dev/blog/rss.xml" rel="self" type="application/rss+xml"/>',
    );
    expect(xml).toContain('<title>A &amp; B</title>');
    expect(xml).toContain(
      '<guid isPermaLink="true">https://ndop.dev/blog/a</guid>',
    );
    expect(xml).toContain('<pubDate>Thu, 15 Oct 2026 00:00:00 GMT</pubDate>');
    expect(xml).toContain('<dc:creator>Valery Melou</dc:creator>');
    expect(xml).toContain('<description>Say &quot;hi&quot;.</description>');
    expect(xml.endsWith('</rss>\n')).toBe(true);
  });

  it('dates items as RFC 822 does', () => {
    expect(rssDate('2026-01-02')).toBe('Fri, 02 Jan 2026 00:00:00 GMT');
  });
});
