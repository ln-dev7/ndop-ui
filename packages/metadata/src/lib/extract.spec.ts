import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { RegistryItem } from '@ndop/schema';
import {
  extractMetadata,
  extractPrimitiveMetadata,
  packageSpecPath,
} from './extract';

// Inside the workspace, so the Angular compiler, TypeScript and esbuild
// resolve from its node_modules as they do from a registry author's repo.
const scratch = join(import.meta.dirname, '../../../../tmp');
let root: string;

const PRIMITIVE = `import { booleanAttribute, Directive, input, model } from '@angular/core';

/** Headless thing. */
@Directive({ selector: '[ndThing]', host: { '[attr.data-state]': 'open() ? "open" : "closed"' } })
export class NdThing {
  /** Whether the thing is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });
}

/** Root that owns the open state. */
@Directive({ selector: '[ndThingRoot]' })
export class NdThingRoot {
  /** Whether it is open. */
  readonly open = model(false);
}
`;

const SPEC = `# Thing: accessibility contract

## WAI-ARIA pattern

[Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)

## Parts, roles and attributes

| Part | Selector | Role | ARIA attributes | Data attributes |
| ---- | -------- | ---- | --------------- | --------------- |
| Thing | \`[ndThing]\` | \`button\` | \`aria-expanded\` | \`data-state\` |

## Keyboard map

| Key | Action |
| --- | ------ |
| \`Enter\` | Toggles the thing. |

## Focus behavior

- Focus stays on the thing when it toggles,
  open or closed.

## RTL behavior

Nothing
mirrors.
`;

const STYLED = `import { Directive, input, output } from '@angular/core';
import { NdThing } from '../../primitives/thing/thing';

export { NdThingRoot } from '../../primitives/thing/thing';

/** Styled thing. */
@Directive({
  selector: '[ndThing]',
  hostDirectives: [{ directive: NdThing, inputs: ['disabled: off'] }],
  host: { 'data-slot': 'thing', '[attr.data-tone]': 'tone()' },
})
export class Thing {
  /** Color tone. */
  readonly tone = input<'calm' | 'loud'>('calm');
  /** Emits on every change. */
  readonly changed = output<string>();
}
`;

const DOCS = `A thing that toggles.

## Do

- Label it.

## Don't

- Nest it.
`;

const ITEM: RegistryItem = {
  name: 'thing',
  type: 'registry:ui',
  version: '1.0.0',
  title: 'Thing',
  description: 'Toggles a thing.',
  files: [
    {
      path: 'ui/thing/thing.ts',
      type: 'registry:ui',
      target: '{ui}/thing/thing.ts',
    },
  ],
  angular: {
    minVersion: '21.0.0',
    exports: ['Thing'],
    zoneless: true,
    ssr: true,
  },
  ndop: { metadata: 'metadata/thing.json', examples: ['thing-demo'] },
};

/**
 * Writes the fixture registry and its tsconfig.
 *
 * @param overrides - Files to replace, by registry-relative path.
 */
async function fixture(overrides: Record<string, string> = {}): Promise<void> {
  const files: Record<string, string> = {
    'primitives/thing/thing.ts': PRIMITIVE,
    'primitives/thing/spec.md': SPEC,
    'ui/thing/thing.ts': STYLED,
    'ui/thing/docs.md': DOCS,
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'ES2022',
        module: 'preserve',
        skipLibCheck: true,
      },
      files: ['ui/thing/thing.ts'],
    }),
    ...overrides,
  };
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
}

beforeEach(async () => {
  await mkdir(scratch, { recursive: true });
  root = await mkdtemp(join(scratch, 'metadata-spec-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/**
 * Runs the extractor on the fixture.
 *
 * @returns The result, which must not be skipped.
 */
async function extract() {
  const result = await extractMetadata({
    root,
    items: [ITEM],
    tsconfig: join(root, 'tsconfig.json'),
  });
  if (result.skipped) throw new Error('skipped');
  return result;
}

// Each test compiles a project with the Angular compiler, and the first
// also loads it; on a busy CI runner that exceeds Vitest's 5s default.
describe('extractMetadata', { timeout: 30_000 }, () => {
  it('merges the API, the primitive spec and docs.md', async () => {
    await fixture();
    const { metadata, issues } = await extract();
    expect(issues).toEqual([]);
    const [thing] = metadata;
    expect(thing).toEqual(
      expect.objectContaining({
        name: 'thing',
        title: 'Thing',
        intro: 'A thing that toggles.',
        agentNotes: { do: ['Label it.'], dont: ['Nest it.'] },
        pattern: {
          name: 'Disclosure',
          url: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
        },
        keyboard: [{ keys: ['Enter'], action: 'Toggles the thing.' }],
        focus: ['Focus stays on the thing when it toggles, open or closed.'],
        rtl: 'Nothing mirrors.',
        examples: ['thing-demo'],
        bundleSize: { gzip: expect.any(Number) },
      }),
    );
    const styled = thing?.parts.find((part) => part.name === 'Thing');
    expect(styled).toEqual({
      name: 'Thing',
      selector: '[ndThing]',
      description: 'Styled thing.',
      source: 'item',
      role: 'button',
      ariaAttributes: ['aria-expanded'],
      inputs: [
        {
          name: 'tone',
          type: "'calm' | 'loud'",
          default: "'calm'",
          values: ['calm', 'loud'],
          description: 'Color tone.',
        },
        {
          name: 'off',
          type: 'boolean',
          default: 'false',
          description: 'Whether the thing is disabled.',
        },
      ],
      models: [],
      outputs: [
        {
          name: 'changed',
          type: 'string',
          description: 'Emits on every change.',
        },
      ],
      dataAttributes: [
        { name: 'data-slot', values: ['thing'] },
        { name: 'data-tone' },
        { name: 'data-state' },
      ],
    });
    expect(thing?.parts.find((part) => part.name === 'NdThingRoot')).toEqual(
      expect.objectContaining({
        source: '../../primitives/thing/thing',
        models: [
          {
            name: 'open',
            type: 'boolean',
            default: 'false',
            description: 'Whether it is open.',
          },
        ],
      }),
    );
  });

  it('records the parts a part must sit inside, from what it injects', async () => {
    await fixture({
      'primitives/thing/thing.ts': `import { Directive, inject, InjectionToken } from '@angular/core';

/** Provided by the root. */
export const ND_THING_ROOT = new InjectionToken<NdThingRoot>('ND_THING_ROOT');

/** Headless thing. */
@Directive({ selector: '[ndThing]' })
export class NdThing {
  protected readonly root = inject(ND_THING_ROOT);
  private readonly loose = inject(NdThingLoose, { optional: true });
}

/** Root that owns the open state. */
@Directive({
  selector: '[ndThingRoot]',
  providers: [{ provide: ND_THING_ROOT, useExisting: NdThingRoot }],
})
export class NdThingRoot {}

/** Only sometimes around a thing. */
@Directive({ selector: '[ndThingLoose]' })
export class NdThingLoose {}
`,
      'ui/thing/thing.ts': `import { Directive } from '@angular/core';
import { NdThing } from '../../primitives/thing/thing';

export { NdThingLoose, NdThingRoot } from '../../primitives/thing/thing';

/** Styled thing. */
@Directive({ selector: '[ndThing]', hostDirectives: [NdThing] })
export class Thing {}
`,
      'ui/thing/docs.md': `---\nkeywords: toggle, switch\n---\n\n${DOCS}`,
    });
    const { metadata } = await extract();
    const [thing] = metadata;
    expect(thing?.keywords).toEqual(['toggle', 'switch']);
    const requires = Object.fromEntries(
      (thing?.parts ?? []).map((part) => [part.name, part.requires]),
    );
    expect(requires).toEqual({
      Thing: ['[ndThingRoot]'],
      NdThingRoot: undefined,
      NdThingLoose: undefined,
    });
  });

  it("doesn't count what a part's own host directives provide", async () => {
    await fixture({
      'primitives/thing/thing.ts': `import { Directive, inject } from '@angular/core';

/** Behavior both the item and the sub-trigger compose. */
@Directive({ selector: '[cdkItem]' })
export class CdkItem {}

/** Headless item. */
@Directive({ selector: '[ndThingItem]', hostDirectives: [CdkItem] })
export class NdThingItem {
  protected readonly item = inject(CdkItem);
}

/** An item that opens a submenu. */
@Directive({ selector: '[ndThingSubTrigger]', hostDirectives: [CdkItem] })
export class NdThingSubTrigger {}
`,
      'ui/thing/thing.ts': `import { Directive } from '@angular/core';
import { NdThingItem } from '../../primitives/thing/thing';

export { NdThingSubTrigger } from '../../primitives/thing/thing';

/** Styled item. */
@Directive({ selector: '[ndThingItem]', hostDirectives: [NdThingItem] })
export class ThingItem {}
`,
      'ui/thing/docs.md': DOCS,
    });
    const { metadata } = await extract();
    expect(
      metadata[0]?.parts.map((part) => [part.name, part.requires]),
    ).toEqual([
      ['ThingItem', undefined],
      ['NdThingSubTrigger', undefined],
    ]);
  });

  it('reports missing descriptions, specs and docs', async () => {
    await fixture({
      'ui/thing/thing.ts': STYLED.replace('  /** Color tone. */\n', ''),
      'primitives/thing/spec.md': '',
      'ui/thing/docs.md': 'Intro only.\n',
    });
    await rm(join(root, 'primitives/thing/spec.md'));
    const { issues } = await extract();
    expect(issues.map((issue) => issue.message)).toEqual([
      'Thing.tone has no description.',
      'No spec.md was found for the primitive the item composes.',
      'docs.md has no "## Do" list.',
      'docs.md has no "## Don\'t" list.',
      expect.stringMatching(/^metadata \/agentNotes\/do /),
      expect.stringMatching(/^metadata \/agentNotes\/dont /),
      expect.stringMatching(/^metadata \/parts\/\d\/inputs\/0\/description /),
    ]);
  });

  it('is skipped without the Angular compiler', async () => {
    const result = await extractMetadata({
      root: '/',
      items: [ITEM],
      tsconfig: '/x',
    });
    expect(result).toEqual({ skipped: true });
  });
});

describe('extractPrimitiveMetadata', { timeout: 30_000 }, () => {
  it("documents a primitive's parts with its spec", async () => {
    await fixture({
      'primitives/thing/index.ts': "export * from './thing';\n",
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          strict: true,
          target: 'ES2022',
          module: 'preserve',
          skipLibCheck: true,
        },
        files: ['primitives/thing/index.ts'],
      }),
    });
    const [thing] =
      extractPrimitiveMetadata({
        root,
        tsconfig: join(root, 'tsconfig.json'),
        primitives: [
          {
            name: 'thing',
            importPath: '@acme/primitives/thing',
            entry: join(root, 'primitives/thing/index.ts'),
          },
        ],
      }) ?? [];

    expect(thing?.importPath).toBe('@acme/primitives/thing');
    expect(thing?.pattern).toEqual(
      expect.objectContaining({ name: 'Disclosure' }),
    );
    expect(thing?.keyboard).toEqual([
      expect.objectContaining({ keys: ['Enter'] }),
    ]);
    expect(thing?.parts.map((part) => [part.name, part.source])).toEqual([
      ['NdThing', '@acme/primitives/thing'],
      ['NdThingRoot', '@acme/primitives/thing'],
    ]);
    expect(thing?.parts[0]).toEqual(
      expect.objectContaining({
        selector: '[ndThing]',
        role: 'button',
        inputs: [expect.objectContaining({ name: 'disabled' })],
      }),
    );
    expect(thing?.parts[1]?.models).toEqual([
      expect.objectContaining({ name: 'open' }),
    ]);
  });
});

describe('packageSpecPath', () => {
  const fromRoot = {
    resolve: (request: string) => {
      if (request === '@ndop/primitives/package.json') {
        return '/app/node_modules/@ndop/primitives/package.json';
      }
      throw new Error(`Cannot find ${request}`);
    },
  } as Pick<NodeJS.Require, 'resolve'>;

  it('points at the spec shipped next to an entry point', () => {
    expect(packageSpecPath('@ndop/primitives/dialog', fromRoot)).toBe(
      '/app/node_modules/@ndop/primitives/dialog/spec.md',
    );
  });

  it('ignores relative specifiers, bare names and missing packages', () => {
    expect(packageSpecPath('../primitives/dialog', fromRoot)).toBeUndefined();
    expect(packageSpecPath('@ndop/primitives', fromRoot)).toBeUndefined();
    expect(packageSpecPath('@acme/kit/dialog', fromRoot)).toBeUndefined();
  });
});
