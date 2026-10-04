import {
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { BundledLanguage, ShikiTransformer } from 'shiki';

/**
 * Languages the docs highlight. Loaded once at build time; nothing
 * highlights in the browser (RFC-0001, "Syntax highlighting with Shiki at
 * build time").
 */
export const LANGUAGES: BundledLanguage[] = [
  'angular-html',
  'angular-ts',
  'bash',
  'css',
  'html',
  'json',
  'jsonc',
  'shell',
  'ts',
];

/**
 * Both themes are rendered into every block as CSS variables, so the
 * site's dark mode switches code colors without a client highlighter.
 * GitHub's current themes, whose colors reach 4.5:1 on the code
 * background, unlike the classic ones.
 */
export const THEMES = {
  light: 'github-light-default',
  dark: 'github-dark-default',
} as const;

/**
 * The one text color of {@link THEMES} under 4.5:1 on the light code
 * background (comments, 4.3:1), replaced by GitHub's darker muted gray.
 */
export const COLOR_REPLACEMENTS = {
  'github-light-default': { '#6e7781': '#59636e' },
};

/** An icon as Lucide data: shapes with their attributes. */
type IconNodes = [string, Record<string, string>][];

// Lucide icons (ISC License), copied as data because the build can't load
// the Angular icon components.
const COPY_ICON: IconNodes = [
  ['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }],
  ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }],
];
const CHECK_ICON: IconNodes = [['path', { d: 'M20 6 9 17l-5-5' }]];
const TERMINAL_ICON: IconNodes = [
  ['path', { d: 'm7 11 2-2-2-2' }],
  ['path', { d: 'M11 13h4' }],
  ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2', ry: '2' }],
];
const FILE_ICON: IconNodes = [
  [
    'path',
    {
      d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
    },
  ],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
  ['path', { d: 'M10 12.5 8 15l2 2.5' }],
  ['path', { d: 'm14 12.5 2 2.5-2 2.5' }],
];
const BRACES_ICON: IconNodes = [
  [
    'path',
    {
      d: 'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1',
    },
  ],
  [
    'path',
    {
      d: 'M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1',
    },
  ],
];

/**
 * A minimal hast element, as Shiki's transformers build them.
 */
interface Element {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: (Element | { type: 'text'; value: string })[];
}

/**
 * Creates a hast element.
 *
 * @param tagName - Tag.
 * @param properties - Attributes, in hast's camel-cased names.
 * @param children - Child nodes.
 * @returns The element.
 */
function h(
  tagName: string,
  properties: Record<string, unknown>,
  children: Element['children'] = [],
): Element {
  return { type: 'element', tagName, properties, children };
}

/**
 * Creates a text node.
 *
 * @param value - Text.
 * @returns The node.
 */
function text(value: string): { type: 'text'; value: string } {
  return { type: 'text', value };
}

/**
 * Creates an inline Lucide-style icon.
 *
 * @param className - Class of the `svg`.
 * @param nodes - The icon's shapes.
 * @returns The `svg` element, hidden from assistive technology.
 */
function icon(className: string, nodes: IconNodes): Element {
  return h(
    'svg',
    {
      className: [className],
      ariaHidden: 'true',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    nodes.map(([tag, attributes]) => h(tag, attributes)),
  );
}

/**
 * The copy button every block has; one delegated listener in the app
 * copies the visible code.
 *
 * @returns The button.
 */
function copyButton(): Element {
  return h(
    'button',
    {
      type: 'button',
      className: ['code-frame-copy'],
      dataCodeCopy: '',
      ariaLabel: 'Copy code',
    },
    [
      icon('code-frame-icon-copy', COPY_ICON),
      icon('code-frame-icon-check', CHECK_ICON),
    ],
  );
}

/** Lines a collapsible block shows whole; longer ones start collapsed. */
const COLLAPSE_AFTER = 12;

/**
 * The header button that expands and collapses a long file; the app
 * toggles `data-expanded` on the block.
 *
 * @returns The button.
 */
function expandButton(): Element {
  return h(
    'button',
    {
      type: 'button',
      className: ['code-frame-expand'],
      dataCodeExpand: '',
      ariaExpanded: 'false',
    },
    [text('Expand')],
  );
}

/**
 * The "Expand" button over the faded end of a collapsed file. The header
 * button already serves keyboard and screen reader users, so this one is
 * for the pointer only.
 *
 * @returns The button.
 */
function expandOverlay(): Element {
  return h(
    'button',
    {
      type: 'button',
      className: ['code-frame-expand-overlay'],
      dataCodeExpand: '',
      tabIndex: -1,
      ariaHidden: 'true',
    },
    [text('Expand')],
  );
}

/** Package managers a command block offers, in tab order. */
export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;

/** One of {@link PACKAGE_MANAGERS}. */
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

/**
 * Translates an npm command into another package manager's: `npx` runs a
 * package's bin, `npm install` adds packages, `npm run` runs a script.
 * Anything else is returned unchanged.
 *
 * @param manager - Target package manager.
 * @param command - The command, written for npm.
 * @returns The equivalent command.
 *
 * @example
 * ```ts
 * commandFor('pnpm', 'npx ndop add dialog'); // 'pnpm dlx ndop add dialog'
 * ```
 */
export function commandFor(manager: PackageManager, command: string): string {
  const run = /^npx (?:--yes |-y )?(.+)$/.exec(command)?.[1];
  if (run !== undefined) {
    return {
      npm: `npx ${run}`,
      pnpm: `pnpm dlx ${run}`,
      yarn: `yarn dlx ${run}`,
      bun: `bunx ${run}`,
    }[manager];
  }
  const install = /^npm (?:install|i)(?: (.+))?$/.exec(command);
  if (install) {
    const rest = install[1] ? ` ${install[1]}` : '';
    if (!install[1])
      return manager === 'npm' ? 'npm install' : `${manager} install`;
    return {
      npm: `npm install${rest}`,
      pnpm: `pnpm add${rest}`,
      yarn: `yarn add${rest}`,
      bun: `bun add${rest}`,
    }[manager];
  }
  const script = /^npm run (.+)$/.exec(command)?.[1];
  if (script !== undefined) {
    return manager === 'npm' ? `npm run ${script}` : `${manager} run ${script}`;
  }
  return command;
}

/** Gives each command block's tabs unique ids within a page. */
let commandBlocks = 0;

/**
 * Builds a command block (a fence whose meta is `pm`): one command for npm,
 * shown in tabs for every package manager, each tab panel holding exactly
 * the command the copy button copies (WAI-ARIA tabs pattern). npm is
 * selected in the prerendered page; the app switches every block to the
 * reader's saved choice.
 *
 * @param command - The npm command.
 * @returns The block.
 */
function commandBlock(command: string): Element {
  const id = `pm-${++commandBlocks}`;
  const tabs = PACKAGE_MANAGERS.map((manager, index) =>
    h(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `${id}-${manager}-tab`,
        className: ['code-frame-tab'],
        dataPm: manager,
        ariaSelected: index === 0 ? 'true' : 'false',
        ariaControls: `${id}-${manager}`,
        tabIndex: index === 0 ? 0 : -1,
      },
      [text(manager)],
    ),
  );
  const panels = PACKAGE_MANAGERS.map((manager, index) =>
    h(
      'div',
      {
        role: 'tabpanel',
        id: `${id}-${manager}`,
        ariaLabelledby: `${id}-${manager}-tab`,
        dataPm: manager,
        ...(index === 0 ? {} : { hidden: true }),
      },
      [h('pre', {}, [h('code', {}, [text(commandFor(manager, command))])])],
    ),
  );
  return h('figure', { className: ['code-frame', 'code-frame-commands'] }, [
    h('div', { className: ['code-frame-header'] }, [
      icon('code-frame-icon', TERMINAL_ICON),
      h(
        'div',
        {
          role: 'tablist',
          ariaLabel: 'Package manager',
          className: ['code-frame-tabs'],
        },
        tabs,
      ),
      copyButton(),
    ]),
    ...panels,
  ]);
}

/**
 * Takes `title="…"` out of a fence's meta and keeps it apart, so the
 * word-highlight transformer, which reads every `/…/` in the meta as a
 * word to mark, doesn't match the slashes of a file path.
 *
 * @returns The transformer; it must run first.
 */
export function transformerMetaTitle(): ShikiTransformer {
  return {
    name: 'ndop:meta-title',
    preprocess(_code, options) {
      const meta = options.meta as
        | { __raw?: string; title?: string }
        | undefined;
      const title = meta?.__raw && /title="([^"]+)"/.exec(meta.__raw)?.[1];
      if (meta && title) {
        meta.title = title;
        meta.__raw = meta.__raw?.replace(/title="[^"]+"/, '');
      }
    },
  };
}

/**
 * Wraps each block in the docs' code frame, chosen per block by the
 * fence's meta string:
 *
 * - nothing: plain, as on ui.shadcn.com, with the copy button over the
 *   code;
 * - `title="tsconfig.json"`: a header with a file icon, the name and the
 *   copy button;
 * - `pm`: a single npm command shown for every package manager (see
 *   {@link commandFor});
 * - `attached`: no frame of its own, for a block inside an example card.
 * - `collapse`, with a title: a file longer than 12 lines starts
 *   collapsed, with an "Expand" button in the header and over its end.
 *
 * Line numbers and the maximum height come from CSS.
 *
 * @returns The transformer.
 */
export function transformerCodeFrame(): ShikiTransformer {
  return {
    name: 'ndop:code-frame',
    root(root) {
      const pre = root.children[0] as unknown as Element | undefined;
      if (!pre || pre.type !== 'element') return;
      const meta =
        (this.options.meta as { __raw?: string } | undefined)?.__raw ?? '';
      const language = this.options.lang;
      if (/(?:^|\s)pm(?:\s|$)/.test(meta)) {
        root.children = [commandBlock(this.source.trim()) as never];
        return;
      }
      const title = (this.options.meta as { title?: string } | undefined)
        ?.title;
      const lines = this.source.trimEnd().split('\n').length;
      const numbered = lines > 1;
      // Short files show whole; collapsing them would hide nothing.
      const collapsible =
        Boolean(title) &&
        /(?:^|\s)collapse(?:\s|$)/.test(meta) &&
        lines > COLLAPSE_AFTER;
      const children: Element[] = title
        ? [
            h('div', { className: ['code-frame-header'] }, [
              icon(
                'code-frame-icon',
                /^json/.test(language) ? BRACES_ICON : FILE_ICON,
              ),
              h('span', { className: ['code-frame-title'] }, [text(title)]),
              ...(collapsible ? [expandButton()] : []),
              copyButton(),
            ]),
            pre,
            ...(collapsible ? [expandOverlay()] : []),
          ]
        : [copyButton(), pre];
      root.children = [
        h(
          'figure',
          {
            className: [
              'code-frame',
              ...(title ? ['code-frame-titled'] : []),
              ...(collapsible ? ['code-frame-collapsible'] : []),
              // A single line needs no line number.
              ...(numbered ? ['code-frame-numbered'] : []),
              // Under an example's preview, inside its card.
              ...(/(?:^|\s)attached(?:\s|$)/.test(meta)
                ? ['code-frame-attached']
                : []),
            ],
            dataLanguage: language,
          },
          children,
        ) as never,
      ];
    },
  };
}

/**
 * Transformers every block goes through: the title taken out of the meta,
 * line highlighting (`{1,3-4}` in
 * the meta or `// [!code highlight]`), word highlighting (`/word/` or
 * `// [!code word:word]`), diffs (`// [!code ++]` / `// [!code --]`), then
 * the code frame.
 *
 * @returns The transformers, in order.
 */
export function transformers(): ShikiTransformer[] {
  return [
    transformerMetaTitle(),
    transformerMetaHighlight(),
    transformerMetaWordHighlight(),
    transformerNotationHighlight(),
    transformerNotationWordHighlight(),
    transformerNotationDiff(),
    transformerCodeFrame(),
  ];
}
