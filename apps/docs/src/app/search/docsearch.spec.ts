import { pagesOf, sectionOf } from './docsearch';

describe('sectionOf', () => {
  it('names a docs page by its section', () => {
    expect(sectionOf('/docs/getting-started/cli')).toBe('Getting started');
    expect(sectionOf('/docs/components/dialog')).toBe('Components');
  });

  it('names other pages by their first segment', () => {
    expect(sectionOf('/blog/updating-code-you-own')).toBe('Blog');
    expect(sectionOf('/blocks')).toBe('Blocks');
    expect(sectionOf('/')).toBe('Home');
  });
});

describe('pagesOf', () => {
  it('keeps pages, without the site name, in order', () => {
    expect(
      pagesOf([
        {
          title: 'Dialog primitive · Ndop UI',
          path: '/docs/primitives/dialog',
        },
        { title: 'Blog · Ndop UI', path: '/blog' },
      ]),
    ).toEqual([
      {
        title: 'Dialog primitive',
        path: '/docs/primitives/dialog',
        section: 'Primitives',
      },
      { title: 'Blog', path: '/blog', section: 'Blog' },
    ]);
  });

  it('drops files, registry items, duplicates and records without a route', () => {
    expect(
      pagesOf([
        { title: 'Dialog', path: '/docs/components/dialog.md' },
        { title: 'llms.txt', path: '/llms.txt' },
        { title: 'Registry', path: '/r/index' },
        { title: 'Dialog', path: '/docs/components/dialog' },
        { title: 'Dialog again', path: '/docs/components/dialog' },
        { title: 'Elsewhere', path: 'https://example.com/' },
        { title: 'No path' },
      ]).map((page) => page.title),
    ).toEqual(['Dialog']);
  });
});
