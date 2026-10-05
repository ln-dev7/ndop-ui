import { REGISTRY_URL, registryFetcher } from '../testing/registry';
import { Catalog, distance } from './catalog';

const catalog = (files?: Record<string, unknown>) => {
  const { fetcher, requests } = registryFetcher(files);
  return { catalog: new Catalog({ url: REGISTRY_URL }, fetcher), requests };
};

describe('Catalog', () => {
  it('lists items by type, by title', async () => {
    const { catalog: registry } = catalog();
    expect(
      (await registry.ofType('registry:ui')).map((entry) => entry.name),
    ).toEqual(['dialog', 'separator']);
  });

  it('fetches each file once', async () => {
    const { catalog: registry, requests } = catalog();
    await registry.item('dialog');
    await registry.item('dialog');
    await registry.metadata('dialog');
    expect(requests.sort()).toEqual([
      'https://registry.test/r/dialog.json',
      'https://registry.test/r/index.json',
      'https://registry.test/r/metadata/dialog.json',
    ]);
  });

  it('suggests the closest names for an unknown item', async () => {
    const { catalog: registry } = catalog();
    await expect(registry.item('dialgo', 'registry:ui')).rejects.toThrow(
      'The registry has no component named "dialgo". Closest: dialog, separator.',
    );
  });

  it('says when an item has another type', async () => {
    const { catalog: registry } = catalog();
    await expect(registry.metadata('utils')).rejects.toThrow(
      '"utils" is a registry:lib item, not a component.',
    );
  });

  it('rejects an invalid index', async () => {
    const { catalog: registry } = catalog({ index: { name: 'test' } });
    await expect(registry.index()).rejects.toThrow(
      "The registry's index.json isn't valid",
    );
  });

  it("renders a component's Markdown twin", async () => {
    const { catalog: registry } = catalog();
    const markdown = await registry.markdown('dialog');
    expect(markdown).toMatch(/^# Dialog\n/);
    expect(markdown).toContain('### src/app/lib/utils.ts');
    expect(markdown).toContain('<div ndDialogContent></div>');
    expect(markdown).toContain('### Edit profile dialog');
  });

  it('resolves dependencies transitively, each once', async () => {
    const { catalog: registry } = catalog();
    const block = await registry.item('settings-form');
    expect(
      (await registry.withDependencies(block)).map((item) => item.name),
    ).toEqual(['settings-form', 'dialog', 'separator', 'utils']);
  });
});

describe('distance', () => {
  it('counts edits', () => {
    expect(distance('dialog', 'dialog')).toBe(0);
    expect(distance('dialgo', 'dialog')).toBe(2);
    expect(distance('', 'abc')).toBe(3);
  });
});
