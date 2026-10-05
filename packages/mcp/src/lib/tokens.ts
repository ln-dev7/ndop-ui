import type { RegistryItem } from '@ndop/schema';

/** What the shadcn-compatible tokens (ADR-0006) are for. */
const PURPOSES: Readonly<Record<string, string>> = {
  background: 'Page background.',
  foreground: 'Default text on the page background.',
  card: 'Card surfaces.',
  popover: 'Floating surfaces: popovers, menus, tooltips.',
  primary: 'Main actions and emphasis.',
  secondary: 'Secondary actions.',
  muted: 'Subdued surfaces; its foreground is for secondary text.',
  accent: 'Hover and selected states.',
  destructive: 'Destructive actions and errors.',
  border: 'Borders and dividers.',
  input: 'Form control borders.',
  ring: 'Focus rings.',
  radius: 'Base corner radius; `rounded-sm` to `rounded-xl` derive from it.',
  sidebar: 'Sidebar surfaces.',
  chart: 'Chart series colors, in order.',
  'font-sans': 'Body and interface text.',
  'font-mono': 'Code.',
};

/** One token of a theme. */
export interface Token {
  /** CSS variable without `--`, such as `primary-foreground`. */
  name: string;
  /** What it's for, when known. */
  purpose?: string;
  /** Its value in the light and dark schemes, or in `@theme`. */
  values: Record<string, string>;
}

/**
 * A theme's tokens: every CSS variable its `cssVars` define, with what the
 * shadcn-compatible ones are for (ADR-0006).
 *
 * @param theme - A `registry:theme` item.
 * @returns The tokens, by name.
 */
export function themeTokens(theme: RegistryItem): Token[] {
  const tokens = new Map<string, Token>();
  for (const [scheme, variables] of Object.entries(theme.cssVars ?? {})) {
    for (const [name, value] of Object.entries(variables ?? {})) {
      const token = tokens.get(name) ?? {
        name,
        ...purposeOf(name),
        values: {},
      };
      token.values[scheme] = value;
      tokens.set(name, token);
    }
  }
  return [...tokens.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * What a token is for: its own purpose, or its base token's, for
 * `*-foreground`, `sidebar-*` and `chart-*` names.
 *
 * @param name - Token name.
 * @returns `{ purpose }`, or nothing for an unknown token.
 */
function purposeOf(name: string): { purpose?: string } {
  const base = name.replace(/-foreground$/, '');
  const purpose =
    PURPOSES[name] ??
    (PURPOSES[base] && name !== base
      ? `Text and icons on ${base}: ${PURPOSES[base]}`
      : undefined) ??
    PURPOSES[name.split('-')[0] ?? ''];
  return purpose ? { purpose } : {};
}

/**
 * The tokens as Markdown for agents: how to use them, then a table.
 *
 * @param theme - The theme's title.
 * @param tokens - Its tokens.
 * @returns The Markdown.
 */
export function tokensMarkdown(theme: string, tokens: Token[]): string {
  const schemes = [
    ...new Set(tokens.flatMap((token) => Object.keys(token.values))),
  ];
  return [
    `# ${theme} theme tokens`,
    'Use tokens, never palette colors: `bg-primary text-primary-foreground`, `border-border`, `text-muted-foreground`, not `bg-zinc-900`. Each color token is a Tailwind color, so every color utility takes it. Pair a surface with its `-foreground`. Dark mode switches the values, so never add `dark:` variants for token colors.',
    [
      `| Token | Purpose | ${schemes.join(' | ')} |`,
      `| --- | --- | ${schemes.map(() => '---').join(' | ')} |`,
      ...tokens.map(
        (token) =>
          `| \`--${token.name}\` | ${token.purpose ?? ''} | ${schemes
            .map((scheme) =>
              token.values[scheme]
                ? `\`${token.values[scheme].replace(/\|/g, '\\|')}\``
                : '',
            )
            .join(' | ')} |`,
      ),
    ].join('\n'),
  ].join('\n\n');
}
