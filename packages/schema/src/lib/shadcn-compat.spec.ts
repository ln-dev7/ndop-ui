import Ajv from 'ajv';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { registryItemSchema, type RegistryItem } from './registry-item.schema';
import {
  compatDependencyUrl,
  DEFAULT_COMPAT_BASE_URL,
  toShadcnItem,
} from './shadcn-compat';

const root = join(import.meta.dirname, '../..');
const shadcnItemSchema = JSON.parse(
  readFileSync(join(root, 'vendor/shadcn/registry-item.json'), 'utf-8'),
);

// shadcn declares the draft-07 meta-schema by its https URL, which Ajv only
// registers under http; the draft is the same, so the field is dropped.
// Strict mode is off because this schema is shadcn's, not ours.
const { $schema: _metaSchema, ...shadcnItemSchemaBody } = shadcnItemSchema;
const validateShadcnItem = new Ajv({ allErrors: true, strict: false }).compile(
  shadcnItemSchemaBody,
);

/**
 * Whether the shadcn CLI (4.21.4, `isUniversalRegistryItem`) installs an
 * item without a `components.json`.
 *
 * @param item - A compat item.
 * @returns Whether it is universal.
 */
function isUniversal(item: Record<string, unknown>): boolean {
  const files = (item['files'] ?? []) as { type: string; target?: string }[];
  return (
    item['type'] === 'registry:item' &&
    files.every((file) => !!file.target && file.type === 'registry:file')
  );
}

const items = readdirSync(join(root, 'fixtures/valid'))
  .filter((file) => file.startsWith('registry-item.'))
  .map((file) => ({
    file,
    item: JSON.parse(
      readFileSync(join(root, 'fixtures/valid', file), 'utf-8'),
    ) as RegistryItem,
  }));

const fixture = (name: string) =>
  items.find(({ file }) => file === `registry-item.${name}.json`)!.item;

const options = { baseUrl: DEFAULT_COMPAT_BASE_URL };

describe('shadcn superset invariant (ADR-0002, ADR-0025)', () => {
  it.each(items)('$file maps to a valid universal shadcn item', ({ item }) => {
    const compat = toShadcnItem(item, options);
    expect(
      validateShadcnItem(compat),
      JSON.stringify(validateShadcnItem.errors),
    ).toBe(true);
    expect(isUniversal(compat)).toBe(true);
  });

  it('keeps the JSON type of every field shared with shadcn', () => {
    const ours = registryItemSchema.properties as Record<
      string,
      { type?: string }
    >;
    const theirs = shadcnItemSchema.properties as Record<
      string,
      { type?: string }
    >;
    const shared = Object.keys(ours).filter((key) => key in theirs);

    expect(shared.length).toBeGreaterThan(10);
    for (const key of shared) {
      expect({ key, type: ours[key]?.type }).toEqual({
        key,
        type: theirs[key]?.type,
      });
    }
  });
});

describe('toShadcnItem', () => {
  it('drops Ndop-only fields and the styles shadcn skips', () => {
    const compat = toShadcnItem(fixture('dialog'), options);
    for (const key of [
      'version',
      'angular',
      'migrations',
      'codemods',
      'ndop',
      'cssVars',
      'css',
    ]) {
      expect(compat).not.toHaveProperty(key);
    }
  });

  it('installs files at the default aliases, rewriting their imports', () => {
    const compat = toShadcnItem(
      {
        ...fixture('dialog'),
        files: [
          {
            path: 'ui/dialog/dialog.ts',
            type: 'registry:ui',
            target: '{ui}/dialog/dialog.ts',
            content: "import { cn } from '@/lib/utils';\n",
          },
        ],
      },
      {
        ...options,
        rewriteImports: (path, content) => `// ${path}\n${content}`,
      },
    );
    expect(compat['type']).toBe('registry:item');
    expect(compat['files']).toEqual([
      {
        path: 'ui/dialog/dialog.ts',
        type: 'registry:file',
        target: '~/src/app/ui/dialog/dialog.ts',
        content:
          "// src/app/ui/dialog/dialog.ts\nimport { cn } from '@/lib/utils';\n",
      },
    ]);
  });

  it('points bare and @ndop registry dependencies at their compat URLs', () => {
    const compat = toShadcnItem(fixture('dialog'), {
      baseUrl: 'http://localhost:4400/r/compat/',
    });
    expect(compat['registryDependencies']).toEqual([
      'http://localhost:4400/r/compat/button.json',
      'https://ndop.dev/r/compat/utils.json',
    ]);
    expect(
      compatDependencyUrl(
        '@ndop/utils',
        options.baseUrl,
        'https://mirror.dev/r/compat/',
      ),
    ).toBe('https://mirror.dev/r/compat/utils.json');
    expect(compatDependencyUrl('@acme/utils', options.baseUrl)).toBe(undefined);
  });

  it('says what ndop init would do, after the item’s own note', () => {
    const compat = toShadcnItem(
      { ...fixture('dialog'), docs: 'Route to it.' },
      options,
    );
    const docs = String(compat['docs']);
    expect(docs.startsWith('Route to it.\n\nNdop setup')).toBe(true);
    expect(docs).toContain(`${DEFAULT_COMPAT_BASE_URL}default.json`);
    expect(docs).toContain("@import '@ndop/core/styles.css';");
    expect(docs).toContain('provideNdop()');
    expect(docs).toContain('provideIcons()');
    expect(docs).toContain('@angular/cdk');
  });

  it('turns a theme into one stylesheet', () => {
    const compat = toShadcnItem(
      {
        ...fixture('theme-indigo'),
        css: {
          '@import "@fontsource-variable/inter"': {},
          '@layer base': { body: { 'letter-spacing': '-0.01em' } },
        },
      },
      options,
    );
    const [file] = compat['files'] as { target: string; content: string }[];
    expect(file?.target).toBe('~/src/ndop-theme.css');
    expect(file?.content).toMatch(/^@import '@fontsource-variable\/inter';\n/);
    expect(file?.content).toContain(
      ':root {\n  --primary: oklch(0.35 0.15 275);',
    );
    expect(file?.content).toContain(
      '@layer base {\n  body {\n    letter-spacing: -0.01em;\n  }\n}\n',
    );
    expect(String(compat['docs'])).not.toContain('@angular/cdk');
  });
});
