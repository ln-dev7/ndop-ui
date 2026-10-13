import { type Tree, updateJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { registryItems, writeRegistryFixture } from '../testing';
import { bumpVersion, itemReleaseGenerator } from './item-release';

describe('item-release generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    writeRegistryFixture(tree);
    const versions: Record<string, [string, string]> = {
      utils: ['0.1.0', 'Utils'],
      default: ['0.2.0', 'Default theme'],
      badge: ['0.1.1', 'Badge'],
      'badge-demo': ['0.1.0', 'Badge demo'],
    };
    updateJson(tree, 'registry/registry.json', (manifest) => {
      for (const item of manifest.items) {
        [item.version, item.title] = versions[item.name] ?? [];
      }
      return manifest;
    });
    tree.write(
      'registry/changelog/badge.md',
      '# Badge\n\n## 0.1.1\n\nAdds `xs`.\n\n## 0.1.0\n\nFirst release.\n',
    );
  });

  it('sets every version and adds a section on top, naming the previous version', async () => {
    await itemReleaseGenerator(tree, {
      all: true,
      to: '1.0.0',
      notes: 'Stable release; no code changes since {previous}.',
      skipFormat: true,
    });

    expect(
      [...registryItems(tree).values()].map((item) => item['version']),
    ).toEqual(['1.0.0', '1.0.0', '1.0.0', '1.0.0']);
    expect(tree.read('registry/changelog/badge.md', 'utf-8')).toBe(
      '# Badge\n\n## 1.0.0\n\nStable release; no code changes since 0.1.1.\n\n## 0.1.1\n\nAdds `xs`.\n\n## 0.1.0\n\nFirst release.\n',
    );
    expect(tree.read('registry/changelog/badge-demo.md', 'utf-8')).toBe(
      '# Badge demo\n\n## 1.0.0\n\nStable release; no code changes since 0.1.0.\n',
    );
  });

  it('bumps the named items only, from their own versions', async () => {
    await itemReleaseGenerator(tree, {
      names: ['badge'],
      bump: 'minor',
      notes: 'Adds `xl`.',
      skipFormat: true,
    });

    expect(registryItems(tree).get('badge')?.['version']).toBe('0.2.0');
    expect(registryItems(tree).get('utils')?.['version']).toBe('0.1.0');
  });

  it('refuses unknown items, missing or double version options, and downgrades', async () => {
    const notes = 'x';
    await expect(
      itemReleaseGenerator(tree, { names: ['nope'], bump: 'patch', notes }),
    ).rejects.toThrow('no item "nope"');
    await expect(
      itemReleaseGenerator(tree, { names: ['badge'], notes }),
    ).rejects.toThrow('either');
    await expect(
      itemReleaseGenerator(tree, { names: ['badge'], to: '0.1.1', notes }),
    ).rejects.toThrow('must be above 0.1.1');
    await expect(
      itemReleaseGenerator(tree, { bump: 'patch', notes }),
    ).rejects.toThrow('--all');
  });

  it('bumps major, minor and patch', () => {
    expect(bumpVersion('0.7.3', 'major')).toBe('1.0.0');
    expect(bumpVersion('0.7.3', 'minor')).toBe('0.8.0');
    expect(bumpVersion('0.7.3', 'patch')).toBe('0.7.4');
  });
});
