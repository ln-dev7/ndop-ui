import type { SearchEntry } from './search-entry';
import { score, search } from './search';

const entry = (
  kind: SearchEntry['kind'],
  title: string,
  context = '',
): SearchEntry => ({
  kind,
  title,
  context,
  description: '',
  url: `/${title}`,
});

const entries = [
  entry('component', 'Dialog'),
  entry('component', 'Popover'),
  entry('prop', 'closeOnEscape', 'Dialog · NdDialog'),
  entry('prop', 'side', 'Popover · PopoverContent'),
  entry('page', 'Installation', 'Guide'),
  entry('heading', 'Angular CLI', 'Installation'),
];

describe('score', () => {
  it('ranks exact, prefix, word and substring matches in that order', () => {
    const words = (query: string) => query.split(' ');
    expect(score(entry('page', 'dialog'), words('dialog'))).toBeGreaterThan(
      score(entry('page', 'dialogs'), words('dialog')),
    );
    expect(score(entry('page', 'dialogs'), words('dialog'))).toBeGreaterThan(
      score(entry('page', 'a dialog'), words('dialog')),
    );
    expect(score(entry('page', 'a dialog'), words('dialog'))).toBeGreaterThan(
      score(entry('page', 'subdialog'), words('dialog')),
    );
    expect(score(entry('page', 'x', 'dialog'), words('dialog'))).toBe(5);
    expect(score(entry('page', 'dialog'), words('dialog nope'))).toBe(0);
  });

  it('matches keywords below the title and above the context', () => {
    const dialog = { ...entry('component', 'Dialog'), keywords: ['modal'] };
    expect(score(dialog, ['modal'])).toBe(30);
    expect(score(dialog, ['mod'])).toBe(30);
    expect(score(dialog, ['odal'])).toBe(0);
  });
});

describe('search', () => {
  it('groups matches by kind, in a fixed order', () => {
    expect(
      search(entries, 'dialog').map((group) => [
        group.title,
        group.entries.map((result) => result.title),
      ]),
    ).toEqual([
      ['Components', ['Dialog']],
      ['Props', ['closeOnEscape']],
    ]);
  });

  it('lists components and guides for an empty query', () => {
    expect(search(entries, '  ').map((group) => group.title)).toEqual([
      'Components',
      'Guides',
    ]);
  });
});
