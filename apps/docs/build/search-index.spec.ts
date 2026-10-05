import { componentEntries, guideEntries, headingId } from './search-index';

describe('headingId', () => {
  it('slugs headings the way the page does', () => {
    const seen = new Map<string, number>();
    expect(headingId("What it's built on", seen)).toBe('what-its-built-on');
    expect(headingId('What `init` changes', seen)).toBe('what-init-changes');
    expect(headingId('What `init` changes', seen)).toBe('what-init-changes-1');
  });
});

describe('guideEntries', () => {
  it('lists the page and its sections, but not step titles or code', () => {
    const markdown = [
      '---',
      'title: Installation',
      'description: Set it up.',
      'order: 2',
      '---',
      '',
      '## Angular CLI',
      '',
      '```md',
      '## Not a heading',
      '```',
      '',
      ':::steps',
      '### A step',
      ':::',
      '',
      '### What `init` changes',
    ].join('\n');
    expect(
      guideEntries(markdown, '/docs/getting-started/installation'),
    ).toEqual([
      {
        kind: 'page',
        title: 'Installation',
        context: 'Guide',
        description: 'Set it up.',
        url: '/docs/getting-started/installation',
      },
      {
        kind: 'heading',
        title: 'Angular CLI',
        context: 'Installation',
        description: '',
        url: '/docs/getting-started/installation#angular-cli',
      },
      {
        kind: 'heading',
        title: 'What init changes',
        context: 'Installation',
        description: '',
        url: '/docs/getting-started/installation#what-init-changes',
      },
    ]);
  });
});

describe('componentEntries', () => {
  it('lists the component, its bindings and its keys', () => {
    const entries = componentEntries({
      name: 'dialog',
      title: 'Dialog',
      description: 'A window over the page.',
      keywords: ['Modal', 'popup'],
      keyboard: [
        {
          keys: ['Escape'],
          action: 'Closes it, unless `closeOnEscape` is false.',
        },
      ],
      parts: [
        {
          name: 'NdDialog',
          inputs: [
            {
              name: 'closeOnEscape',
              type: 'boolean',
              description: 'Whether {@link NdDialog} closes on Escape.',
            },
            { name: 'class', type: 'string', description: '' },
          ],
          models: [],
          outputs: [],
        },
      ],
    });
    expect(
      entries.map((entry) => [entry.kind, entry.title, entry.url]),
    ).toEqual([
      ['component', 'Dialog', '/docs/components/dialog'],
      ['prop', 'closeOnEscape', '/docs/components/dialog#api-NdDialog'],
      ['shortcut', 'Escape', '/docs/components/dialog#keyboard'],
    ]);
    expect(entries[0]?.keywords).toEqual(['modal', 'popup']);
    expect(entries[1]?.description).toBe('Whether NdDialog closes on Escape.');
  });
});
