import {
  blockEntry,
  componentEntries,
  guideEntries,
  postEntries,
} from './search-index';

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

  it('numbers repeats across every heading level, as the page does', () => {
    const markdown = [
      '---',
      'title: Verify',
      '---',
      '',
      '## Options',
      '',
      '#### Options',
      '',
      '### Options',
    ].join('\n');
    expect(
      guideEntries(markdown, '/docs/x')
        .slice(1)
        .map((entry) => entry.url),
    ).toEqual(['/docs/x#options', '/docs/x#options-2']);
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

describe('blockEntry', () => {
  it('finds a block by its name and category, and links its page', () => {
    expect(
      blockEntry({
        name: 'login-01',
        title: 'Login 01',
        description: 'A sign-in form in a `card`.',
        category: 'Authentication',
      }),
    ).toEqual({
      kind: 'block',
      title: 'Login 01',
      context: 'Block · Authentication',
      description: 'A sign-in form in a card.',
      keywords: ['login-01', 'authentication'],
      url: '/blocks/login-01',
    });
  });
});

describe('postEntries', () => {
  it('lists the post under the blog, then its sections', () => {
    expect(
      postEntries({
        url: '/blog/a-post',
        title: 'A post: with a colon',
        description: 'About it.',
        date: '2026-10-15',
        author: 'Valery Melou',
        body: '## First\n\nText.\n\n### Second',
      }),
    ).toEqual([
      {
        kind: 'page',
        title: 'A post: with a colon',
        context: 'Blog',
        description: 'About it.',
        url: '/blog/a-post',
      },
      {
        kind: 'heading',
        title: 'First',
        context: 'A post: with a colon',
        description: '',
        url: '/blog/a-post#first',
      },
      {
        kind: 'heading',
        title: 'Second',
        context: 'A post: with a colon',
        description: '',
        url: '/blog/a-post#second',
      },
    ]);
  });
});

describe('primitive property discovery', () => {
  it('links behavior-only bindings to the actual primitive API anchor', () => {
    const entries = componentEntries(
      {
        name: 'dialog',
        title: 'Dialog primitive',
        description: 'Native modal behavior.',
        keyboard: [],
        parts: [
          {
            name: 'NdDialog',
            inputs: [
              {
                name: 'closeOnEscape',
                type: 'boolean',
                description: 'Closes on Escape.',
              },
            ],
            models: [],
            outputs: [],
          },
        ],
      },
      '/docs/primitives/dialog',
      'Primitive',
    );
    expect(entries[0]?.context).toBe('Primitive');
    expect(entries.find((entry) => entry.kind === 'prop')?.url).toBe(
      '/docs/primitives/dialog#api-NdDialog',
    );
  });
});
