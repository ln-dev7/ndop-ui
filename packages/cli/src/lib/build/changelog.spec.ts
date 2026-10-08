import type { RegistryItem } from '@ndop/schema';
import { parseChangelog, versionChanges } from './changelog';

describe('parseChangelog', () => {
  it('splits sections at version headings and ignores the title', () => {
    const { sections, problems } = parseChangelog(
      '# Button\n\nIntro.\n\n## 0.2.0\n\n### Fixed\n\n- Focus ring.\n\n## 0.1.0\n\nFirst release.\n',
    );
    expect(problems).toEqual([]);
    expect([...sections]).toEqual([
      ['0.2.0', '### Fixed\n\n- Focus ring.\n'],
      ['0.1.0', 'First release.\n'],
    ]);
  });

  it('leaves headings inside code fences alone', () => {
    const { sections } = parseChangelog(
      '## 0.1.0\n\n```md\n## Not a version\n```\n',
    );
    expect(sections.get('0.1.0')).toBe('```md\n## Not a version\n```\n');
  });

  it('reports headings that are not versions, and repeats', () => {
    expect(
      parseChangelog('## Unreleased\n\n## 0.1.0\n\n## 0.1.0\n').problems,
    ).toEqual([
      '"## Unreleased" isn\'t a version. Level-2 headings name versions; use ### inside a version.',
      '0.1.0 has two sections.',
    ]);
  });
});

describe('versionChanges', () => {
  const item = (version: string, extra: Partial<RegistryItem> = {}) =>
    ({
      name: 'card',
      type: 'registry:ui',
      version,
      title: 'Card',
      description: 'A card.',
      files: [
        {
          path: 'ui/card/card.ts',
          type: 'registry:ui',
          target: '{ui}/card/card.ts',
          content: 'a',
        },
      ],
      ...extra,
    }) as RegistryItem;

  it('lists renames, codemods and dependencies new in the version', () => {
    const before = item('1.0.0', {
      dependencies: ['@ndop/primitives@^1.0.0', 'clsx'],
      registryDependencies: ['utils'],
    });
    const after = item('2.0.0', {
      files: [
        {
          path: 'ui/card/card-root.ts',
          type: 'registry:ui',
          target: '{ui}/card/card-root.ts',
          content: 'a',
        },
      ],
      dependencies: ['@ndop/primitives@^2.0.0', 'tailwind-merge'],
      registryDependencies: ['utils', 'button'],
      migrations: [{ from: 'ui/card/card.ts', to: 'ui/card/card-root.ts' }],
      codemods: [
        { since: '1.5.0', kind: 'rename-export', from: 'A', to: 'B' },
        { since: '2.0.0', kind: 'rename-export', from: 'Card', to: 'CardRoot' },
      ],
    });
    expect(versionChanges(before, after)).toEqual({
      files: {
        added: ['{ui}/card/card-root.ts'],
        changed: [],
        removed: ['{ui}/card/card.ts'],
      },
      migrations: [{ from: '{ui}/card/card.ts', to: '{ui}/card/card-root.ts' }],
      codemods: [
        { since: '2.0.0', kind: 'rename-export', from: 'Card', to: 'CardRoot' },
      ],
      dependencies: {
        added: ['tailwind-merge'],
        changed: ['@ndop/primitives@^2.0.0'],
        removed: ['clsx'],
      },
      registryDependencies: { added: ['button'], removed: [] },
    });
  });
});
