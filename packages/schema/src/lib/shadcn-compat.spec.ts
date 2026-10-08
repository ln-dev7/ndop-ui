import Ajv from 'ajv';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { registryItemSchema, type RegistryItem } from './registry-item.schema';
import { toShadcnItem } from './shadcn-compat';

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

const items = readdirSync(join(root, 'fixtures/valid'))
  .filter((file) => file.startsWith('registry-item.'))
  .map((file) => ({
    file,
    item: JSON.parse(
      readFileSync(join(root, 'fixtures/valid', file), 'utf-8'),
    ) as RegistryItem,
  }));

describe('shadcn superset invariant (ADR-0002)', () => {
  it.each(items)('$file maps to a valid shadcn item', ({ item }) => {
    const compat = toShadcnItem(item);
    expect(
      validateShadcnItem(compat),
      JSON.stringify(validateShadcnItem.errors),
    ).toBe(true);
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
  const dialogDemo = items.find(
    ({ file }) => file === 'registry-item.dialog-demo.json',
  )!.item;

  it('drops Ndop-only fields', () => {
    const compat = toShadcnItem(dialogDemo);
    for (const key of [
      'version',
      'angular',
      'migrations',
      'codemods',
      'ndop',
    ]) {
      expect(compat).not.toHaveProperty(key);
    }
  });

  it('maps primitive-usage to block and alias tokens to placeholders', () => {
    const compat = toShadcnItem(dialogDemo);
    expect(compat['type']).toBe('registry:block');
    expect(compat['files']).toEqual([
      {
        path: 'examples/dialog-demo.ts',
        type: 'registry:block',
        target: '@components/examples/dialog-demo.ts',
        content: 'export {};\n',
      },
    ]);
  });
});
