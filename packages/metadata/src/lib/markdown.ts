/** Reads a file of a built registry (`<name>.json`, `metadata/<name>.json`). */
export type RegistryReader = <T>(file: string) => T;

// Structural types for the fields read here: built as a library, this
// package can't use @ndop/schema's inferred types (see extract.ts).

/** A built registry item: `<name>.json`. */
export interface BuiltItem {
  /** Item name. */
  name: string;
  /** Item type, such as `registry:ui`. */
  type: string;
  /** Semver version. */
  version: string;
  /** Display title. */
  title: string;
  /** One sentence. */
  description: string;
  /** npm packages it needs. */
  dependencies?: string[];
  /** Items it needs. */
  registryDependencies?: string[];
  /** Its files, with their content. */
  files?: { path: string; target: string; content?: string }[];
  /** Angular support. */
  angular?: { ssr: boolean; zoneless: boolean; exports?: string[] };
  /** Ndop extensions. */
  ndop?: { metadata?: string; examples?: string[] };
}

/** One input, model or output of a part. */
export interface Member {
  /** Binding name. */
  name: string;
  /** TypeScript type. */
  type: string;
  /** Default value, as code. */
  default?: string;
  /** Allowed values of an enum-like member. */
  values?: string[];
  /** Whether it must be bound. */
  required?: boolean;
  /** Markdown, possibly with TSDoc links. */
  description: string;
}

/** A component's metadata: `metadata/<name>.json` (`@ndop/schema` v1). */
export interface Metadata {
  /** Item name. */
  name: string;
  /** Display title. */
  title: string;
  /** One sentence. */
  description: string;
  /** Markdown introduction. */
  intro: string;
  /** Other words for the component. */
  keywords?: string[];
  /** Do and don't guidance. */
  agentNotes: { do: string[]; dont: string[] };
  /** The WAI-ARIA pattern implemented. */
  pattern?: { name: string; url: string };
  /** Minified, gzipped size of the item's own code. */
  bundleSize?: { gzip: number };
  /** Keyboard map. */
  keyboard: { keys: string[]; action: string }[];
  /** Focus rules. */
  focus: string[];
  /** Right-to-left notes. */
  rtl?: string;
  /** Example item names, the main one first. */
  examples: string[];
  /** The smallest correct usage. */
  usage?: { imports: string; template: string };
  /** Its directives and components. */
  parts: {
    name: string;
    selector: string;
    description: string;
    source?: string;
    requires?: string[];
    role?: string;
    ariaAttributes?: string[];
    inputs: Member[];
    models: Member[];
    outputs: Member[];
    dataAttributes?: { name: string; values?: string[] }[];
  }[];
}

/**
 * Turns TSDoc's inline `{@link Target}` and `{@link Target | text}` into
 * code spans, since metadata descriptions come from TSDoc comments.
 *
 * @param markdown - Markdown from metadata.
 * @returns The Markdown, without TSDoc tags.
 *
 * @example
 * ```ts
 * withoutTsdocLinks('Closes its {@link NdDialog}.'); // 'Closes its `NdDialog`.'
 * ```
 */
export function withoutTsdocLinks(markdown: string): string {
  return markdown.replace(
    /\{@link\s+([^}|\s]+)\s*(?:\|\s*([^}]+?)\s*)?\}/g,
    (_match, target: string, text?: string) => `\`${text ?? target}\``,
  );
}

/**
 * An item and every item it depends on, transitively, each once: what a
 * manual install copies.
 *
 * @param item - The item.
 * @param read - Reads a built registry file.
 * @returns The item first, then its dependencies.
 */
export function withDependencies(
  item: BuiltItem,
  read: RegistryReader,
): BuiltItem[] {
  const seen = new Map<string, BuiltItem>([[item.name, item]]);
  const queue = [...(item.registryDependencies ?? [])];
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    if (seen.has(name)) continue;
    const dependency = read<BuiltItem>(`${name}.json`);
    seen.set(name, dependency);
    queue.push(...(dependency.registryDependencies ?? []));
  }
  return [...seen.values()];
}

/**
 * A file's target with the default `ndop.json` aliases filled in, as a
 * reader copying by hand would place it.
 *
 * @param target - Target with `{ui}` or `{lib}`.
 * @returns The path.
 */
export function defaultTarget(target: string): string {
  return target
    .replace('{ui}', 'src/app/ui')
    .replace('{lib}', 'src/app/lib')
    .replace('{blocks}', 'src/app/blocks');
}

/**
 * One line of Markdown from metadata text, safe in a table cell.
 *
 * @param text - Markdown, possibly with TSDoc links and line breaks.
 * @returns The cell's text.
 */
function cell(text: string): string {
  return withoutTsdocLinks(text)
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\|/g, '\\|');
}

/**
 * A component's documentation as plain Markdown, in the order of its docs
 * page: the `.md` twin of `/docs/components/<name>` (ADR-0016) and what the
 * MCP server's `get_component` returns (ADR-0009), from one renderer so
 * the two can't differ.
 *
 * @param name - Registry item name.
 * @param read - Reads a built registry file.
 * @returns Its Markdown.
 *
 * @example
 * ```ts
 * const read = <T>(file: string) => JSON.parse(readFileSync(join(registry, file), 'utf-8')) as T;
 * componentMarkdown('dialog', read); // '# Dialog\n\n> …'
 * ```
 */
export function componentMarkdown(name: string, read: RegistryReader): string {
  const item = read<BuiltItem>(`${name}.json`);
  const metadata = read<Metadata>(`metadata/${name}.json`);
  const examples = (item.ndop?.examples ?? []).map((example) =>
    read<BuiltItem>(`${example}.json`),
  );
  const installed = withDependencies(item, read);
  const dependencies = [
    ...new Set(installed.flatMap((entry) => entry.dependencies ?? [])),
  ];
  const usage = metadata.usage ?? { imports: '', template: '' };
  const facts = [
    `Version ${item.version}`,
    ...(metadata.pattern
      ? [
          `WAI-ARIA pattern: [${metadata.pattern.name}](${metadata.pattern.url})`,
        ]
      : []),
    ...(item.angular?.ssr ? ['SSR'] : []),
    ...(item.angular?.zoneless ? ['Zoneless'] : []),
    ...(metadata.bundleSize
      ? [`${(metadata.bundleSize.gzip / 1000).toFixed(1)} kB gzip`]
      : []),
  ];
  const binding = (member: Member, kind: 'input' | 'model' | 'output') =>
    kind === 'output'
      ? `(${member.name})`
      : kind === 'model'
        ? `[(${member.name})]`
        : `[${member.name}]`;
  const lines: string[] = [
    `# ${item.title}`,
    `> ${withoutTsdocLinks(item.description)}`,
    facts.join(' · '),
    withoutTsdocLinks(metadata.intro),
    '## Installation',
    '```bash\nnpx @ndop/cli add ' + name + '\n```',
    'Or by hand' +
      (dependencies.length
        ? `: install ${dependencies.map((dependency) => `\`${dependency}\``).join(', ')}, then copy these files.`
        : ': copy these files.') +
      ' Their `@/ui` and `@/lib` imports follow the default `ndop.json` aliases.',
    ...installed.flatMap((entry) =>
      (entry.files ?? []).flatMap((file) => [
        `### ${defaultTarget(file.target)}`,
        '```ts\n' + (file.content ?? '').trimEnd() + '\n```',
      ]),
    ),
    '## Usage',
    '```ts\n' + usage.imports + '\n```',
    '```html\n' + usage.template + '\n```',
    '## Examples',
    ...examples.flatMap((example) => [
      `### ${example.title}`,
      withoutTsdocLinks(example.description),
      '```ts\n' + (example.files?.[0]?.content ?? '').trimEnd() + '\n```',
    ]),
    '## Accessibility',
    ...(metadata.pattern
      ? [
          `Implements the [${metadata.pattern.name}](${metadata.pattern.url}) pattern of the WAI-ARIA Authoring Practices.`,
        ]
      : []),
    ...(metadata.keyboard.length
      ? [
          '### Keyboard',
          [
            '| Key | Action |',
            '| --- | --- |',
            ...metadata.keyboard.map(
              (row) =>
                `| ${row.keys.map((key) => `\`${key}\``).join(' or ')} | ${cell(row.action)} |`,
            ),
          ].join('\n'),
        ]
      : []),
    ...(metadata.focus.length
      ? [
          '### Focus',
          metadata.focus
            .map((rule) => `- ${withoutTsdocLinks(rule)}`)
            .join('\n'),
        ]
      : []),
    ...(metadata.rtl
      ? ['### Right-to-left', withoutTsdocLinks(metadata.rtl)]
      : []),
    ...(!metadata.pattern && !metadata.keyboard.length && !metadata.focus.length
      ? [
          `${item.title} has no keyboard interaction or focus handling of its own; it keeps the semantics of the element it's on.`,
        ]
      : []),
    '## API reference',
    ...metadata.parts.flatMap((part) => {
      const members = [
        ...part.inputs.map((member) => ({ member, kind: 'input' as const })),
        ...part.models.map((member) => ({ member, kind: 'model' as const })),
        ...part.outputs.map((member) => ({ member, kind: 'output' as const })),
      ];
      return [
        `### ${part.name}`,
        [
          `Selector: \`${part.selector}\``,
          ...(part.role ? [`Role: \`${part.role}\``] : []),
          ...(part.source && part.source !== 'item'
            ? [`From: \`${part.source}\``]
            : []),
        ].join(' · '),
        withoutTsdocLinks(part.description),
        ...(members.length
          ? [
              [
                '| Binding | Type | Default | Description |',
                '| --- | --- | --- | --- |',
                ...members.map(
                  ({ member, kind }) =>
                    `| \`${binding(member, kind)}\`${member.required ? ' (required)' : ''} | \`${cell(member.type)}\` | ${member.default === undefined ? '' : `\`${cell(member.default)}\``} | ${cell(member.description)} |`,
                ),
              ].join('\n'),
            ]
          : []),
        ...(part.dataAttributes?.length
          ? [
              [
                '| Data attribute | Values |',
                '| --- | --- |',
                ...part.dataAttributes.map(
                  (attribute) =>
                    `| \`${attribute.name}\` | ${(attribute.values ?? []).map((value) => `\`${value}\``).join(', ')} |`,
                ),
              ].join('\n'),
            ]
          : []),
      ];
    }),
    '## Agent notes',
    '### Do',
    metadata.agentNotes.do
      .map((note) => `- ${withoutTsdocLinks(note)}`)
      .join('\n'),
    "### Don't",
    metadata.agentNotes.dont
      .map((note) => `- ${withoutTsdocLinks(note)}`)
      .join('\n'),
  ];
  return `${lines.filter((line) => line.trim()).join('\n\n')}\n`;
}
