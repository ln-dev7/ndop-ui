import { ITEM_NAME_PATTERN } from './patterns';
import type { CssValue, RegistryItem } from './registry-item.schema';
import { themeCss } from './theme/export';

/**
 * The item types `ndop build --compat shadcn` emits under `/r/compat/`
 * (ADR-0025). Examples (`registry:primitive-usage`) stay Ndop-only.
 */
export const SHADCN_COMPAT_TYPES: readonly RegistryItem['type'][] = [
  'registry:ui',
  'registry:block',
  'registry:lib',
  'registry:theme',
];

/** Where Ndop's own compat items are served, ending in `/`. */
export const DEFAULT_COMPAT_BASE_URL = 'https://ndop.dev/r/compat/';

/**
 * Ndop's default aliases (`ndop init` in a standard Angular CLI app), where
 * compat items install, as project paths.
 */
export const COMPAT_ALIASES = {
  ui: 'src/app/ui',
  lib: 'src/app/lib',
  blocks: 'src/app/blocks',
} as const;

/** Project path a theme's stylesheet installs to through the shadcn CLI. */
export const COMPAT_THEME_FILE = 'src/ndop-theme.css';

/** The shadcn fields a compat item keeps, besides those it rewrites. */
const KEPT_FIELDS = [
  'name',
  'title',
  'description',
  'author',
  'dependencies',
  'devDependencies',
  'envVars',
  'categories',
  'meta',
] as const;

/**
 * Options for {@link toShadcnItem}.
 */
export interface ShadcnCompatOptions {
  /**
   * Absolute URL the compat items are served from, ending in `/`, such as
   * {@link DEFAULT_COMPAT_BASE_URL}. `registryDependencies` point under it.
   */
  baseUrl: string;
  /**
   * Where Ndop's own compat items are served, which `@ndop/<name>`
   * dependencies point under. Defaults to {@link DEFAULT_COMPAT_BASE_URL}.
   */
  ndopBaseUrl?: string;
  /**
   * Rewrites a TypeScript file's `@/ui/…`, `@/lib/…` and `@/blocks/…`
   * imports to relative paths, given the project path it installs to. The
   * shadcn CLI copies universal items' files as they are, so without it
   * the files need the `@/` alias in `tsconfig.json`.
   */
  rewriteImports?: (path: string, content: string) => string;
}

/**
 * The compat URL of a registry dependency: bare names are items of the
 * same registry, served next to the item, and `@ndop/<name>` is Ndop's
 * item (ADR-0025).
 *
 * @param dependency - A `registryDependencies` entry.
 * @param baseUrl - Where the registry's compat items are served, ending
 *   in `/`.
 * @param ndopBaseUrl - Where Ndop's compat items are served.
 * @returns Its compat URL, or `undefined` for another namespace or a URL,
 *   which has no compat URL here.
 *
 * @example
 * ```ts
 * compatDependencyUrl('utils', 'https://acme.dev/r/compat/');
 * // 'https://acme.dev/r/compat/utils.json'
 * compatDependencyUrl('@ndop/button', 'https://acme.dev/r/compat/');
 * // 'https://ndop.dev/r/compat/button.json'
 * ```
 */
export function compatDependencyUrl(
  dependency: string,
  baseUrl: string,
  ndopBaseUrl = DEFAULT_COMPAT_BASE_URL,
): string | undefined {
  const name = new RegExp(ITEM_NAME_PATTERN);
  if (name.test(dependency)) return `${baseUrl}${dependency}.json`;
  const ndop = /^@ndop\/(.+)$/.exec(dependency)?.[1];
  return ndop !== undefined && name.test(ndop)
    ? `${ndopBaseUrl}${ndop}.json`
    : undefined;
}

/**
 * Resolves an Ndop alias-token target to a project path at Ndop's default
 * aliases.
 *
 * @param target - Such as `{ui}/dialog/dialog.ts`.
 * @returns Such as `src/app/ui/dialog/dialog.ts`.
 */
function compatPath(target: string): string {
  return target.replace(
    /^\{(ui|lib|blocks)\}/,
    (_match, alias: keyof typeof COMPAT_ALIASES) => COMPAT_ALIASES[alias],
  );
}

/**
 * What `ndop init` would have set up, as the `docs` note the shadcn CLI
 * prints after installing.
 *
 * @param item - The item.
 * @param baseUrl - Where compat items are served.
 * @returns The note.
 */
function setupDocs(item: RegistryItem, baseUrl: string): string {
  const lines = [
    'Ndop setup, once per app (ndop init does this for you):',
    `1. Add a theme and the icons: npx shadcn add ${baseUrl}default.json ${baseUrl}icons.json`,
    `2. In src/styles.css, after @import 'tailwindcss';, add @import '@ndop/core/styles.css'; then @import './ndop-theme.css';`,
    `3. In src/app/app.config.ts, add provideNdop() from '@ndop/core' and provideIcons() from './lib/icons' to the providers.`,
  ];
  if (item.dependencies?.some((spec) => /^@ndop\/primitives(@|$)/.test(spec))) {
    lines.push(
      'Ndop primitives need @angular/cdk at your Angular version; add it if your package manager left it out.',
    );
  }
  return lines.join('\n');
}

/**
 * Converts an Ndop registry item to the shadcn CLI's universal item shape,
 * as `ndop build --compat shadcn` emits under `/r/compat/` (ADR-0025,
 * replacing ADR-0002's mapping). The shadcn CLI installs universal items
 * without a `components.json`, which it can't create for Angular apps:
 *
 * - the type is `registry:item` and every file `registry:file`, with a
 *   `~/` target at Ndop's default aliases ({@link COMPAT_ALIASES});
 * - TypeScript files go through `rewriteImports`, since the shadcn CLI
 *   copies them as they are;
 * - `registryDependencies` become the dependencies' compat URLs (see
 *   {@link compatDependencyUrl}); others are kept as they are;
 * - a theme becomes one stylesheet at {@link COMPAT_THEME_FILE}, since the
 *   shadcn CLI skips `cssVars` without a `components.json`;
 * - `docs` adds the setup `ndop init` would do;
 * - Ndop-only fields, `css`, `cssVars` and `tailwind` are dropped.
 *
 * @param item - A valid, built Ndop item, with file contents.
 * @param options - Base URL and import rewriting.
 * @returns A document that validates against shadcn's item schema.
 *
 * @example
 * ```ts
 * toShadcnItem(dialog, { baseUrl: DEFAULT_COMPAT_BASE_URL }).files;
 * // [{ path: 'ui/dialog/dialog.ts', type: 'registry:file', target: '~/src/app/ui/dialog/dialog.ts', content: '…' }]
 * ```
 */
export function toShadcnItem(
  item: RegistryItem,
  options: ShadcnCompatOptions,
): Record<string, unknown> {
  const compat: Record<string, unknown> = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  };
  for (const key of KEPT_FIELDS) {
    if (item[key] !== undefined) {
      compat[key] = item[key];
    }
  }
  compat['type'] = 'registry:item';
  if (item.registryDependencies?.length) {
    compat['registryDependencies'] = item.registryDependencies.map(
      (dependency) =>
        compatDependencyUrl(dependency, options.baseUrl, options.ndopBaseUrl) ??
        dependency,
    );
  }

  const files = (item.files ?? []).map((file) => {
    const path = compatPath(file.target);
    const content = file.content ?? '';
    return {
      path: file.path,
      type: 'registry:file',
      target: `~/${path}`,
      content:
        options.rewriteImports && path.endsWith('.ts')
          ? options.rewriteImports(path, content)
          : content,
    };
  });
  if (item.type === 'registry:theme' && item.cssVars) {
    files.push({
      path: `themes/${item.name}/theme.css`,
      type: 'registry:file',
      target: `~/${COMPAT_THEME_FILE}`,
      content: themeStylesheet(item),
    });
  }
  compat['files'] = files;

  compat['docs'] = [item.docs, setupDocs(item, options.baseUrl)]
    .filter(Boolean)
    .join('\n\n');
  return compat;
}

/**
 * A theme item as one stylesheet: {@link themeCss}, with the item's other
 * `css` after it and any package import its fonts don't account for
 * before it.
 *
 * @param item - A `registry:theme` item with `cssVars`.
 * @returns The CSS.
 */
function themeStylesheet(item: RegistryItem): string {
  const css = themeCss({
    theme: item.cssVars?.theme ?? {},
    light: item.cssVars?.light ?? {},
    dark: item.cssVars?.dark ?? {},
  });
  const imports: string[] = [];
  const rules: string[] = [];
  for (const [key, value] of Object.entries(item.css ?? {})) {
    const specifier = /^@import\s+["'](.+)["']$/.exec(key)?.[1];
    if (specifier !== undefined) {
      if (!css.includes(`@import '${specifier}';`)) {
        imports.push(`@import '${specifier}';\n`);
      }
    } else {
      rules.push(cssBlock(key, value, ''));
    }
  }
  return [imports.join(''), css, ...rules.map((rule) => `\n${rule}\n`)].join(
    '',
  );
}

/**
 * Serializes one entry of an item's `css` field the way the shadcn CLI
 * writes it into a stylesheet: a string is a declaration, an empty at-rule
 * a statement, and anything else a block.
 *
 * @param key - Property, selector or at-rule.
 * @param value - Its value.
 * @param indent - Current indentation.
 * @returns The CSS.
 */
function cssBlock(key: string, value: CssValue, indent: string): string {
  if (typeof value === 'string') {
    return `${indent}${key}: ${value};`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0 && key.startsWith('@')) {
    return `${indent}${key};`;
  }
  return [
    `${indent}${key} {`,
    ...entries.map(([child, inner]) => cssBlock(child, inner, `${indent}  `)),
    `${indent}}`,
  ].join('\n');
}
