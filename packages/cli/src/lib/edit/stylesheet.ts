import postcss, {
  AtRule,
  Declaration,
  Rule,
  type ChildNode,
  type Container,
  type Root,
} from 'postcss';
import type { CssValue, RegistryItem } from '@ndop/schema';

const SYSTEM_DARK = "[data-ndop-theme='system']";

/**
 * Nodes created here, which {@link stringify} lays out. Postcss would
 * otherwise copy spacing from a neighbor, which may be anything.
 */
const added = new WeakSet<object>();

/**
 * Marks a new node for layout.
 *
 * @param node - A node created by this module.
 * @returns The same node.
 */
function fresh<T extends object>(node: T): T {
  added.add(node);
  return node;
}

/**
 * Makes sure a stylesheet imports each specifier, adding missing imports
 * after the last existing one so they stay ahead of every other rule, as
 * CSS requires.
 *
 * @param css - Stylesheet text.
 * @param specifiers - Packages or paths to import, in order.
 * @returns The edited text.
 */
export function ensureImports(
  css: string,
  specifiers: readonly string[],
): string {
  const root = postcss.parse(css);
  for (const specifier of specifiers) {
    const imports = root.nodes.filter(
      (node): node is AtRule =>
        node.type === 'atrule' && node.name === 'import',
    );
    if (imports.some((node) => importedSpecifier(node) === specifier)) {
      continue;
    }
    const node = new AtRule({
      name: 'import',
      params: `'${specifier}'`,
      raws: { before: '\n', afterName: ' ' },
    });
    const last = imports.at(-1);
    if (last) {
      last.after(node);
    } else {
      root.prepend(node);
    }
  }
  return stringify(root);
}

/**
 * The specifier an `@import` loads, without quotes or `url()`.
 *
 * @param node - An `@import` rule.
 * @returns The specifier.
 */
function importedSpecifier(node: AtRule): string {
  const [first = ''] = node.params
    .replace(/^url\((.*)\)/, '$1')
    .trim()
    .split(/\s+/);
  return first.replace(/^['"]|['"]$/g, '');
}

/**
 * Applies an item's `css` field: `@import "x"` keys become imports, other
 * keys become rules or at-rules, merged into an existing node with the
 * same selector or parameters.
 *
 * @param css - Stylesheet text.
 * @param entries - The item's `css` field.
 * @returns The edited text.
 */
export function applyCss(
  css: string,
  entries: Record<string, CssValue>,
): string {
  const imports: string[] = [];
  const rules: [string, CssValue][] = [];
  for (const [key, value] of Object.entries(entries)) {
    const match = /^@import\s+["'](.+)["']$/.exec(key);
    if (match?.[1]) {
      imports.push(match[1]);
    } else {
      rules.push([key, value]);
    }
  }
  const root = postcss.parse(ensureImports(css, imports));
  for (const [key, value] of rules) {
    merge(root, key, value);
  }
  return stringify(root);
}

/**
 * Merges one `css` entry into a container.
 *
 * @param parent - Where the entry goes.
 * @param key - Selector, at-rule (`@layer base`) or property.
 * @param value - A declaration value, or a nested block.
 */
function merge(parent: Container, key: string, value: CssValue): void {
  if (typeof value === 'string') {
    setDeclaration(parent, key, value);
    return;
  }
  const atRule = /^@(\S+)\s*(.*)$/.exec(key);
  let block = parent.nodes?.find((node) =>
    atRule
      ? node.type === 'atrule' &&
        node.name === atRule[1] &&
        node.params === (atRule[2] ?? '')
      : node.type === 'rule' && node.selector === key,
  ) as Container | undefined;
  if (!block) {
    block = fresh(
      atRule
        ? new AtRule({ name: atRule[1] ?? '', params: atRule[2] ?? '' })
        : new Rule({ selector: key }),
    );
    parent.append(block);
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    merge(block, childKey, childValue);
  }
}

/**
 * Writes a theme's tokens: `cssVars.light` into `:root`, `cssVars.dark`
 * into `.dark` and again under `@media (prefers-color-scheme: dark)` for
 * `data-ndop-theme="system"` (ADR-0006), and `cssVars.theme` into a plain
 * `@theme` block. Existing values are replaced, other declarations kept.
 *
 * @param css - Stylesheet text.
 * @param cssVars - The item's `cssVars`.
 * @returns The edited text.
 */
export function applyCssVars(
  css: string,
  cssVars: NonNullable<RegistryItem['cssVars']>,
): string {
  const root = postcss.parse(css);
  const blocks: [Container, Record<string, string> | undefined][] = [];
  if (cssVars.theme && Object.keys(cssVars.theme).length > 0) {
    blocks.push([themeBlock(root), cssVars.theme]);
  }
  blocks.push([topRule(root, ':root'), cssVars.light]);
  blocks.push([topRule(root, '.dark'), cssVars.dark]);
  if (cssVars.dark && Object.keys(cssVars.dark).length > 0) {
    blocks.push([systemDark(root), cssVars.dark]);
  }
  for (const [block, values] of blocks) {
    for (const [name, value] of Object.entries(values ?? {})) {
      setDeclaration(block, `--${name}`, value);
    }
  }
  for (const [block] of blocks) {
    if (block.nodes?.length === 0) {
      block.remove();
    }
  }
  return stringify(root);
}

/**
 * Updates a theme's tokens from one version of an item to another, one
 * variable at a time (ADR-0020): a variable upstream changed is updated
 * when the stylesheet still has the old value, a new one is added, and one
 * the user changed keeps the user's value and is reported. Variables
 * upstream removed, or the user removed, are left as they are. Nothing is
 * ever written as a conflict marker.
 *
 * @param css - Stylesheet text.
 * @param base - The installed version's `cssVars`.
 * @param remote - The target version's `cssVars`.
 * @returns The edited text, and each variable kept with the user's value,
 *   as `--name in selector`.
 *
 * @example
 * ```ts
 * const { css: next, kept } = updateCssVars(css, installed.cssVars, latest.cssVars);
 * ```
 */
export function updateCssVars(
  css: string,
  base: RegistryItem['cssVars'] | undefined,
  remote: NonNullable<RegistryItem['cssVars']>,
): { css: string; kept: string[] } {
  const root = postcss.parse(css);
  const kept: string[] = [];
  let changed = false;
  const blocks: [
    () => Container | undefined,
    () => Container,
    string,
    'theme' | 'light' | 'dark',
  ][] = [
    [
      () =>
        root.nodes.find(
          (node): node is AtRule =>
            node.type === 'atrule' && node.name === 'theme' && !node.params,
        ),
      () => themeBlock(root),
      '@theme',
      'theme',
    ],
    [
      () => findRule(root, ':root'),
      () => topRule(root, ':root'),
      ':root',
      'light',
    ],
    [
      () => findRule(root, '.dark'),
      () => topRule(root, '.dark'),
      '.dark',
      'dark',
    ],
    [
      () =>
        root.nodes
          .filter(
            (node): node is AtRule =>
              node.type === 'atrule' &&
              node.name === 'media' &&
              node.params === '(prefers-color-scheme: dark)',
          )
          .flatMap((media) => media.nodes ?? [])
          .find(isSystemRule) as Container | undefined,
      () => systemDark(root),
      SYSTEM_DARK,
      'dark',
    ],
  ];
  for (const [find, create, selector, mode] of blocks) {
    for (const [name, value] of Object.entries(remote[mode] ?? {})) {
      const before = base?.[mode]?.[name];
      if (before === value) continue;
      const prop = `--${name}`;
      const local = find()?.nodes?.find(
        (node): node is Declaration =>
          node.type === 'decl' && node.prop === prop,
      )?.value;
      if (local === value) continue;
      if (local === before) {
        if (local !== undefined || before === undefined) {
          setDeclaration(create(), prop, value);
          changed = true;
        }
      } else if (local !== undefined) {
        kept.push(`${prop} in ${selector}`);
      }
    }
  }
  return { css: changed ? stringify(root) : css, kept };
}

/**
 * Finds a top-level rule without adding one.
 *
 * @param root - Stylesheet.
 * @param selector - Its selector.
 * @returns The rule, or `undefined`.
 */
function findRule(root: Root, selector: string): Rule | undefined {
  return root.nodes.find(
    (node): node is Rule => node.type === 'rule' && node.selector === selector,
  );
}

/**
 * Finds or appends a top-level rule.
 *
 * @param root - Stylesheet.
 * @param selector - Its selector.
 * @returns The rule.
 */
function topRule(root: Root, selector: string): Rule {
  const existing = root.nodes.find(
    (node): node is Rule => node.type === 'rule' && node.selector === selector,
  );
  if (existing) {
    return existing;
  }
  const rule = fresh(new Rule({ selector }));
  root.append(rule);
  return rule;
}

/**
 * Finds or appends the plain `@theme` block.
 *
 * @param root - Stylesheet.
 * @returns The block.
 */
function themeBlock(root: Root): AtRule {
  const existing = root.nodes.find(
    (node): node is AtRule =>
      node.type === 'atrule' && node.name === 'theme' && node.params === '',
  );
  if (existing) {
    return existing;
  }
  const block = fresh(new AtRule({ name: 'theme', params: '' }));
  root.append(block);
  return block;
}

/**
 * Finds or appends the system-mode dark rule inside its media query.
 *
 * @param root - Stylesheet.
 * @returns The `[data-ndop-theme='system']` rule.
 */
function systemDark(root: Root): Rule {
  const media = root.nodes.find(
    (node): node is AtRule =>
      node.type === 'atrule' &&
      node.name === 'media' &&
      node.params === '(prefers-color-scheme: dark)' &&
      (node.nodes ?? []).some(isSystemRule),
  );
  if (media) {
    return (media.nodes ?? []).find(isSystemRule) as Rule;
  }
  const rule = new Rule({ selector: SYSTEM_DARK });
  root.append(
    new AtRule({
      name: 'media',
      params: '(prefers-color-scheme: dark)',
    }).append(rule),
  );
  return rule;
}

/**
 * Whether a node is the `[data-ndop-theme='system']` rule.
 *
 * @param node - Any node.
 * @returns True for that rule, whatever its quotes.
 */
function isSystemRule(node: ChildNode): boolean {
  return (
    node.type === 'rule' && node.selector.replace(/"/g, "'") === SYSTEM_DARK
  );
}

/**
 * Sets a declaration, replacing an existing one with the same property.
 *
 * @param block - Rule or at-rule.
 * @param prop - Property name.
 * @param value - Value.
 */
function setDeclaration(block: Container, prop: string, value: string): void {
  const existing = block.nodes?.find(
    (node): node is Declaration => node.type === 'decl' && node.prop === prop,
  );
  if (existing) {
    existing.value = value;
  } else {
    block.append(fresh(new Declaration({ prop, value })));
  }
}

/**
 * Prints a stylesheet. Nodes this module added (except imports, which
 * get their raws when created) are laid out with two-space indentation and
 * a blank line before each top-level block; existing nodes keep their own
 * formatting.
 *
 * @param root - Stylesheet.
 * @returns The text.
 */
function stringify(root: Root): string {
  root.walk((node) => {
    if (!added.has(node)) {
      return;
    }
    const depth = depthOf(node);
    const blank = depth === 0 && node.prev() !== undefined;
    node.raws.before = `${blank ? '\n\n' : '\n'}${'  '.repeat(depth)}`;
    if (node.type === 'decl') {
      node.raws.between = ': ';
    } else {
      node.raws.between = ' ';
      node.raws.after = `\n${'  '.repeat(depth)}`;
      node.raws.semicolon = true;
    }
  });
  const text = root.toString().replace(/^\n+/, '');
  return text.endsWith('\n') ? text : `${text}\n`;
}

/**
 * How deeply a node is nested.
 *
 * @param node - Any node.
 * @returns 0 at the top level.
 */
function depthOf(node: ChildNode): number {
  let depth = 0;
  for (
    let parent = node.parent;
    parent && parent.type !== 'root' && parent.type !== 'document';
    parent = (parent as ChildNode).parent
  ) {
    depth++;
  }
  return depth;
}
