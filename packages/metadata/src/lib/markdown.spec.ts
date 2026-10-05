import {
  type BuiltItem,
  type Metadata,
  componentMarkdown,
  defaultTarget,
  withDependencies,
  withoutTsdocLinks,
} from './markdown';

const files: Record<string, BuiltItem | Metadata> = {
  'thing.json': {
    name: 'thing',
    type: 'registry:ui',
    version: '1.2.0',
    title: 'Thing',
    description: 'Toggles a {@link NdThing}.',
    dependencies: ['@ndop/primitives'],
    registryDependencies: ['utils'],
    files: [
      {
        path: 'ui/thing/thing.ts',
        target: '{ui}/thing/thing.ts',
        content: 'export class Thing {}\n',
      },
    ],
    angular: { ssr: true, zoneless: true },
    ndop: { metadata: 'metadata/thing.json', examples: ['thing-demo'] },
  },
  'utils.json': {
    name: 'utils',
    type: 'registry:lib',
    version: '1.0.0',
    title: 'Utils',
    description: 'Class merging.',
    registryDependencies: ['thing'],
    files: [
      {
        path: 'lib/utils.ts',
        target: '{lib}/utils.ts',
        content: 'export const cn = 1;\n',
      },
    ],
  },
  'thing-demo.json': {
    name: 'thing-demo',
    type: 'registry:primitive-usage',
    version: '1.0.0',
    title: 'Thing demo',
    description: 'A thing.',
    files: [
      {
        path: 'examples/thing-demo.ts',
        target: '{ui}/examples/thing-demo.ts',
        content: 'export class ThingDemo {}\n',
      },
    ],
  },
  'metadata/thing.json': {
    name: 'thing',
    title: 'Thing',
    description: 'Toggles a thing.',
    intro: 'A thing that toggles.',
    agentNotes: { do: ['Label it.'], dont: ['Nest it.'] },
    pattern: {
      name: 'Disclosure',
      url: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
    },
    parts: [
      {
        name: 'Thing',
        selector: '[ndThing]',
        description: 'Styled thing.',
        source: 'item',
        role: 'button',
        inputs: [
          {
            name: 'tone',
            type: "'calm' | 'loud'",
            default: "'calm'",
            description: 'Color | tone.',
          },
        ],
        models: [{ name: 'open', type: 'boolean', description: 'Open.' }],
        outputs: [],
        dataAttributes: [{ name: 'data-state', values: ['open', 'closed'] }],
      },
    ],
    keyboard: [{ keys: ['Enter', 'Space'], action: 'Toggles it.' }],
    focus: ['Focus stays on the thing.'],
    examples: ['thing-demo'],
    usage: {
      imports: "import { Thing } from '@/ui/thing/thing';",
      template: '<button ndThing>Toggle</button>',
    },
  },
};
const read = <T>(file: string): T => files[file] as T;

describe('withoutTsdocLinks', () => {
  it('turns links into code spans', () => {
    expect(withoutTsdocLinks('Closes its {@link NdDialog}.')).toBe(
      'Closes its `NdDialog`.',
    );
    expect(withoutTsdocLinks('See {@link NdDialog | the dialog}.')).toBe(
      'See `the dialog`.',
    );
  });
});

describe('defaultTarget', () => {
  it('fills in the default aliases', () => {
    expect(defaultTarget('{ui}/dialog/dialog.ts')).toBe(
      'src/app/ui/dialog/dialog.ts',
    );
    expect(defaultTarget('{lib}/utils.ts')).toBe('src/app/lib/utils.ts');
  });
});

describe('withDependencies', () => {
  it('lists the item, then each dependency once, cycles included', () => {
    expect(
      withDependencies(read<BuiltItem>('thing.json'), read).map(
        (item) => item.name,
      ),
    ).toEqual(['thing', 'utils']);
  });
});

describe('componentMarkdown', () => {
  const markdown = componentMarkdown('thing', read);

  it('has the page sections in the page order', () => {
    expect([...markdown.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual([
      'Installation',
      'Usage',
      'Examples',
      'Accessibility',
      'API reference',
      'Agent notes',
    ]);
  });

  it('renders the facts, files, usage and tables', () => {
    expect(markdown).toContain(
      'Version 1.2.0 · WAI-ARIA pattern: [Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) · SSR · Zoneless',
    );
    expect(markdown).toContain('> Toggles a `NdThing`.');
    expect(markdown).toContain('install `@ndop/primitives`, then copy');
    expect(markdown).toContain('### src/app/ui/thing/thing.ts');
    expect(markdown).toContain('### src/app/lib/utils.ts');
    expect(markdown).toContain(
      "```ts\nimport { Thing } from '@/ui/thing/thing';\n```\n\n```html\n<button ndThing>Toggle</button>\n```",
    );
    expect(markdown).toContain('| `Enter` or `Space` | Toggles it. |');
    expect(markdown).toContain(
      "| `[tone]` | `'calm' \\| 'loud'` | `'calm'` | Color \\| tone. |",
    );
    expect(markdown).toContain('| `[(open)]` | `boolean` |  | Open. |');
    expect(markdown).toContain('| `data-state` | `open`, `closed` |');
    expect(markdown.endsWith("### Don't\n\n- Nest it.\n")).toBe(true);
  });
});
