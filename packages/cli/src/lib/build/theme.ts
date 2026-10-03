import postcss, { type AtRule, type ChildNode, type Rule } from 'postcss';
import type { RegistryItem } from '@ndop/schema';

/**
 * The installable parts of a theme stylesheet.
 */
export interface ThemeParts {
  /** Token values, as in shadcn: `theme` (`@theme`), `light` and `dark`. */
  cssVars: NonNullable<RegistryItem['cssVars']>;
  /** Stylesheet imports, as shadcn `css` keys such as `@import "x"`. */
  css: Record<string, Record<string, never>>;
  /** Packages the stylesheet imports, which the item must depend on. */
  packages: string[];
}

const SYSTEM_DARK = "[data-ndop-theme='system']";

/**
 * Reads a theme stylesheet into an item's `cssVars` and `css`. The
 * stylesheet holds only package `@import`s, an `@theme` block, a `:root`
 * block (light), a `.dark` block, and the same dark values repeated under
 * `@media (prefers-color-scheme: dark)` for `data-ndop-theme="system"`,
 * which `ndop init` regenerates rather than ships (ADR-0006).
 *
 * @param source - Stylesheet text.
 * @returns The theme parts, or the problems found.
 */
export function themeFromCss(
  source: string,
): { parts: ThemeParts } | { problems: string[] } {
  const problems: string[] = [];
  const parts: ThemeParts = {
    cssVars: { theme: {}, light: {}, dark: {} },
    css: {},
    packages: [],
  };
  let systemDark: Record<string, string> | undefined;

  for (const node of postcss.parse(source).nodes) {
    if (node.type === 'comment') {
      continue;
    }
    if (node.type === 'atrule' && node.name === 'import') {
      const specifier = node.params.replace(/^['"]|['"]$/g, '');
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        problems.push(
          `@import ${node.params}: themes can only import packages.`,
        );
      } else {
        parts.css[`@import "${specifier}"`] = {};
        parts.packages.push(packageName(specifier));
      }
    } else if (
      node.type === 'atrule' &&
      node.name === 'theme' &&
      !node.params
    ) {
      parts.cssVars.theme = declarations(node, problems);
    } else if (node.type === 'rule' && node.selector === ':root') {
      parts.cssVars.light = declarations(node, problems);
    } else if (node.type === 'rule' && node.selector === '.dark') {
      parts.cssVars.dark = declarations(node, problems);
    } else if (isSystemDark(node)) {
      systemDark = declarations((node.nodes ?? [])[0] as Rule, problems);
    } else {
      problems.push(`Unsupported CSS at line ${node.source?.start?.line}.`);
    }
  }

  if (
    systemDark &&
    JSON.stringify(systemDark) !== JSON.stringify(parts.cssVars.dark)
  ) {
    problems.push(
      `The ${SYSTEM_DARK} block must repeat the .dark values exactly.`,
    );
  }
  return problems.length > 0 ? { problems } : { parts };
}

/**
 * Collects a block's custom properties without the leading `--`, as
 * shadcn's `cssVars` stores them.
 *
 * @param block - A rule or at-rule.
 * @param problems - Receives anything that isn't a custom property.
 * @returns Property names to values, in source order.
 */
function declarations(
  block: Rule | AtRule,
  problems: string[],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const child of block.nodes ?? []) {
    if (child.type === 'decl' && child.prop.startsWith('--')) {
      // Long values wrap across lines in the stylesheet; tokens are one line.
      values[child.prop.slice(2)] = child.value.replace(/\s+/g, ' ');
    } else if (child.type !== 'comment') {
      problems.push(
        `Only custom properties are allowed in themes (line ${child.source?.start?.line}).`,
      );
    }
  }
  return values;
}

/**
 * Whether a node is the system-mode dark block.
 *
 * @param node - A top-level stylesheet node.
 * @returns True for `@media (prefers-color-scheme: dark)` holding only the
 *   `[data-ndop-theme='system']` rule.
 */
function isSystemDark(node: ChildNode): node is AtRule {
  return (
    node.type === 'atrule' &&
    node.name === 'media' &&
    node.params === '(prefers-color-scheme: dark)' &&
    node.nodes?.length === 1 &&
    node.nodes[0]?.type === 'rule' &&
    node.nodes[0].selector.replace(/"/g, "'") === SYSTEM_DARK
  );
}

/**
 * The npm package an import specifier belongs to.
 *
 * @param specifier - A bare specifier, such as `@scope/pkg/sub`.
 * @returns The package name, such as `@scope/pkg`.
 */
export function packageName(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@')
    ? segments.slice(0, 2).join('/')
    : (segments[0] ?? specifier);
}
