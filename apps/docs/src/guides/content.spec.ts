import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitGuide } from '../app/site/guides';

const workspace = join(import.meta.dirname, '../../../..');
/** The registry build's output, which the docs build reads. */
const registry = join(workspace, 'dist/registry/r');

/** Every guide's Markdown, by its path under `src/guides`. */
const guides = Object.fromEntries(
  readdirSync(import.meta.dirname, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((section) =>
      readdirSync(join(import.meta.dirname, section.name))
        .filter((file) => file.endsWith('.md'))
        .map((file) => [
          `${section.name}/${file}`,
          readFileSync(join(import.meta.dirname, section.name, file), 'utf-8'),
        ]),
    ),
);

interface IndexItem {
  name: string;
  type: string;
}

const items = (
  JSON.parse(readFileSync(join(registry, 'index.json'), 'utf-8')) as {
    items: IndexItem[];
  }
).items;

/**
 * Every `nd…` attribute a registry part or `@ndop/core` answers to, read
 * from the built metadata's selectors.
 */
function knownAttributes(): Set<string> {
  const names = new Set(['ndIcon']);
  const folder = join(registry, 'metadata');
  for (const file of readdirSync(folder).filter((f) => f.endsWith('.json'))) {
    const metadata = JSON.parse(readFileSync(join(folder, file), 'utf-8')) as {
      parts?: { selector: string }[];
    };
    for (const part of metadata.parts ?? []) {
      for (const [, name = ''] of part.selector.matchAll(/\[(nd\w+)\]/g)) {
        names.add(name);
      }
    }
  }
  return names;
}

describe('guides', () => {
  // Guides' snippets aren't compiled, so a renamed part or item would
  // leave them wrong without these checks.
  it('use only directives the registry has', () => {
    const known = knownAttributes();
    const unknown = Object.entries(guides).flatMap(([path, markdown]) =>
      [...markdown.matchAll(/\bnd[A-Z]\w*/g)]
        .map(([name]) => name)
        .filter((name) => !known.has(name))
        .map((name) => `${path}: ${name}`),
    );
    expect(unknown).toEqual([]);
  });

  it('add and link only items the registry has', () => {
    const names = new Map(items.map((item) => [item.name, item.type]));
    const unknown = Object.entries(guides).flatMap(([path, markdown]) => {
      const added = [...markdown.matchAll(/ndop add ([^\n`]+)/g)].flatMap(
        ([, args = '']) =>
          args
            .split(/\s+/)
            // Options, placeholders, namespaced items and URLs name nothing
            // in Ndop's own registry.
            .filter((arg) => arg && !/^(-|<|@)|:\/\//.test(arg))
            .map((arg) => {
              const name = arg.replace(/^theme:/, '').replace(/@[\d.]+$/, '');
              const theme = arg.startsWith('theme:');
              return names.has(name) &&
                (!theme || names.get(name) === 'registry:theme')
                ? undefined
                : `${path}: ndop add ${arg}`;
            }),
      );
      const linked = [
        ...markdown.matchAll(/\(\/docs\/components\/([\w-]+)\)/g),
      ].map(([, name = '']) =>
        names.has(name) ? undefined : `${path}: /docs/components/${name}`,
      );
      return [...added, ...linked].filter(Boolean);
    });
    expect(unknown).toEqual([]);
  });
});

describe('the roadmap', () => {
  const guide = splitGuide(guides['getting-started/roadmap.md'] ?? '');
  const body = (guides['getting-started/roadmap.md'] ?? '').replace(
    /^---\r?\n[\s\S]*?\r?\n---\r?\n+/,
    '',
  );

  it('is the same in ROADMAP.md and on the site', () => {
    expect(readFileSync(join(workspace, 'ROADMAP.md'), 'utf-8')).toBe(
      `# ${guide.attributes.title}\n\n${body}`,
    );
  });

  it('links only to absolute URLs, which work on GitHub as on the site', () => {
    expect(body).not.toMatch(/\]\((?!https:\/\/)/);
  });
});
