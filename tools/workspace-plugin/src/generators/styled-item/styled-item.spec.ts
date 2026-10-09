import { type Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { registryItems, writeRegistryFixture } from '../testing';
import { styledItemGenerator, titleOf } from './styled-item';

describe('styled-item generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    writeRegistryFixture(tree);
  });

  it('writes the directive, its test and docs.md', async () => {
    await styledItemGenerator(tree, {
      name: 'radio-group',
      description: 'A set of options where one can be checked.',
      category: 'inputs',
      skipFormat: true,
    });

    const source = tree.read('registry/ui/radio-group/radio-group.ts', 'utf-8');
    expect(source).toContain("selector: '[ndRadioGroup]'");
    expect(source).toContain('export class RadioGroup {');
    expect(source).toContain('export const radioGroupVariants = variants(');
    expect(source).toContain(' * A set of options where one can be checked.');
    expect(source).not.toContain('@ndop/primitives');
    expect(tree.exists('registry/ui/radio-group/radio-group.spec.ts')).toBe(
      true,
    );
    expect(tree.read('registry/ui/radio-group/docs.md', 'utf-8')).toContain(
      'keywords: radio group',
    );
  });

  it('composes the primitive of the same name with --primitive', async () => {
    await styledItemGenerator(tree, {
      name: 'switch',
      description: 'A control that toggles between on and off.',
      category: 'inputs',
      primitive: true,
      skipFormat: true,
    });

    const source = tree.read('registry/ui/switch/switch.ts', 'utf-8');
    expect(source).toContain(
      "import { NdSwitch } from '@ndop/primitives/switch';",
    );
    expect(source).toContain('hostDirectives: [NdSwitch],');
    expect(registryItems(tree).get('switch')?.['dependencies']).toEqual([
      '@ndop/primitives',
    ]);
  });

  it('adds the registry entry after the other ui items, and a changelog', async () => {
    await styledItemGenerator(tree, {
      name: 'card',
      description: 'A container for related content.',
      category: 'data-display',
      skipFormat: true,
    });

    const items = [...registryItems(tree).values()];
    expect(items.map((item) => item['name'])).toEqual([
      'utils',
      'default',
      'badge',
      'card',
      'badge-demo',
    ]);
    expect(registryItems(tree).get('card')).toEqual(
      expect.objectContaining({
        type: 'registry:ui',
        version: '0.1.0',
        title: 'Card',
        categories: ['data-display'],
        registryDependencies: ['utils'],
        angular: expect.objectContaining({ exports: ['Card'] }),
        ndop: { metadata: 'metadata/card.json', examples: [] },
      }),
    );
    expect(tree.read('registry/changelog/card.md', 'utf-8')).toBe(
      '# Card\n\n## 0.1.0\n\nFirst release.\n',
    );
  });

  it('refuses a name the registry has', async () => {
    await expect(
      styledItemGenerator(tree, {
        name: 'badge',
        description: 'Again.',
        category: 'data-display',
      }),
    ).rejects.toThrow('already has an item "badge"');
  });

  it('takes a title that title case would get wrong', async () => {
    await styledItemGenerator(tree, {
      name: 'input-otp',
      title: 'Input OTP',
      description: 'A one-time code field.',
      category: 'inputs',
      skipFormat: true,
    });
    expect(registryItems(tree).get('input-otp')?.['title']).toBe('Input OTP');
  });

  it('titles kebab-case names', () => {
    expect(titleOf('input-otp')).toBe('Input Otp');
    expect(titleOf('card')).toBe('Card');
  });
});
