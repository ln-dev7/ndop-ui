import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// The same import as component-docs.ts, which explains why it's a path.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { componentMarkdown } from '../../../packages/metadata/src/lib/markdown';
import {
  guideMarkdown,
  llmsFullTxt,
  llmsTxt,
  parseGuide,
  plainMarkdown,
} from './markdown-twins';

/** The registry build's output, which the docs build reads. */
const registry = join(import.meta.dirname, '../../../dist/registry/r');
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(join(registry, file), 'utf-8')) as T;

describe('plainMarkdown', () => {
  it('turns fence options and steps into plain Markdown', () => {
    expect(
      plainMarkdown(
        [
          '```bash pm',
          'npx ndop init',
          '```',
          '',
          ':::steps',
          '### Write the config',
          '```json title="ndop.json" collapse',
          '{}',
          '```',
          '### Add it',
          ':::',
        ].join('\n'),
      ),
    ).toBe(
      [
        '```bash',
        'npx ndop init',
        '```',
        '',
        '### 1. Write the config',
        '`ndop.json`:',
        '',
        '```json',
        '{}',
        '```',
        '### 2. Add it',
      ].join('\n'),
    );
  });
});

describe('guideMarkdown', () => {
  it('starts with the title and description', () => {
    const guide = parseGuide(
      '---\ntitle: Theming\ndescription: Change the tokens.\norder: 3\n---\n\nText.\n',
      '/docs/getting-started/theming',
    );
    expect(guide.order).toBe(3);
    expect(guideMarkdown(guide)).toBe(
      '# Theming\n\n> Change the tokens.\n\nText.\n',
    );
  });
});

describe('componentMarkdown', () => {
  const markdown = componentMarkdown('dialog', read);

  it('has the page sections in the page order', () => {
    const headings = [...markdown.matchAll(/^## (.+)$/gm)].map(
      (match) => match[1],
    );
    expect(headings).toEqual([
      'Installation',
      'Usage',
      'Examples',
      'Accessibility',
      'API reference',
      'Agent notes',
    ]);
  });

  it('includes the code to copy and the API tables', () => {
    expect(markdown).toContain('npx ndop add dialog');
    expect(markdown).toContain('### src/app/ui/dialog/dialog.ts');
    expect(markdown).toContain('### src/app/lib/utils.ts');
    expect(markdown).toMatch(
      /\| `\[closeOnEscape\]` \| `boolean` \| `true` \|/,
    );
    expect(markdown).not.toContain('{@link');
  });
});

describe('llms.txt', () => {
  it('links every page twin under its section', () => {
    const file = llmsTxt(
      [
        {
          title: 'Introduction',
          url: '/docs/getting-started/introduction',
          description: 'What it is.',
        },
      ],
      [
        {
          title: 'Dialog',
          url: '/docs/components/dialog',
          description: 'A window.',
        },
      ],
    );
    expect(file).toMatch(/^# Ndop UI\n\n> /);
    expect(file).toContain(
      '## Guides\n\n- [Introduction](https://ndop.dev/docs/getting-started/introduction.md): What it is.',
    );
    expect(file).toContain(
      '## Components\n\n- [Dialog](https://ndop.dev/docs/components/dialog.md): A window.',
    );
  });

  it('puts every twin in llms-full.txt', () => {
    expect(llmsFullTxt(['# A\n', '# B\n'])).toBe('# A\n\n---\n\n# B\n');
  });
});
