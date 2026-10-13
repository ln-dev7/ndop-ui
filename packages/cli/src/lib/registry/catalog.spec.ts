import { REGISTRY_URL, registryFetcher } from '../../testing/registry';
import { Catalog, CatalogError, distance } from './catalog';

const catalog = (files?: Record<string, unknown>) => {
  const { fetcher, requests } = registryFetcher(files);
  return { catalog: new Catalog({ url: REGISTRY_URL }, fetcher), requests };
};

describe('Catalog', () => {
  it('lists items by type, by title', async () => {
    const { catalog: registry } = catalog();
    expect(
      (await registry.ofType('registry:ui')).map((entry) => entry.name),
    ).toEqual(['button', 'dialog']);
  });

  it('fetches each file once', async () => {
    const { catalog: registry, requests } = catalog();
    await registry.item('button');
    await registry.item('button');
    await registry.metadata('button');
    expect(requests.sort()).toEqual([
      'mem://button',
      'mem://index',
      'mem://metadata/button',
    ]);
  });

  it('suggests the closest names for an unknown item', async () => {
    const { catalog: registry } = catalog();
    await expect(registry.item('buton', 'registry:ui')).rejects.toThrow(
      'The registry has no component named "buton". Closest: button, dialog.',
    );
  });

  it('says when an item has another type', async () => {
    const { catalog: registry } = catalog();
    await expect(registry.metadata('utils')).rejects.toThrow(
      '"utils" is a registry:lib item, not a component.',
    );
  });

  it('wraps a failed request in a catalog error', async () => {
    const registry = new Catalog({ url: 'mem://missing/{name}' }, async () => {
      throw new TypeError('fetch failed');
    });
    await expect(registry.index()).rejects.toThrow(
      new CatalogError("Can't fetch mem://missing/index: fetch failed"),
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
    const markdown = await registry.markdown('button');
    expect(markdown).toMatch(/^# Button\n/);
    expect(markdown).toContain('### src/app/lib/utils.ts');
    expect(markdown).toContain('<button ndButton>Save</button>');
    expect(markdown).toContain('### Button demo');
  });

  it('resolves dependencies transitively, each once', async () => {
    const { catalog: registry } = catalog();
    const block = await registry.item('login-01');
    expect(
      (await registry.withDependencies(block)).map((item) => item.name),
    ).toEqual(['login-01', 'button', 'utils']);
  });
});

describe('distance', () => {
  it('counts edits', () => {
    expect(distance('dialog', 'dialog')).toBe(0);
    expect(distance('dialgo', 'dialog')).toBe(2);
    expect(distance('', 'abc')).toBe(3);
  });
});
