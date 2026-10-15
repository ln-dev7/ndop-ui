import { basename } from 'node:path';
import { validate, type SchemaName } from '@ndop/schema';

/**
 * Fence languages compiled as TypeScript files: whole files, compiled as
 * they are.
 */
export const TYPESCRIPT_LANGUAGES = new Set(['ts', 'typescript', 'angular-ts']);

/**
 * Fence languages compiled as Angular templates, inside a generated
 * standalone component (see {@link templateComponent}).
 */
export const TEMPLATE_LANGUAGES = new Set(['angular-html']);

/** JSON files validated against Ndop's schemas, by the fence's title. */
export const JSON_SCHEMAS: Readonly<Record<string, SchemaName>> = {
  'ndop.json': 'config',
  'registry.json': 'registry',
};

/** How a block is checked. */
export type BlockKind = 'typescript' | 'template' | 'json' | 'none';

/** A fenced code block of a guide. */
export interface CodeBlock {
  /** The guide, such as `getting-started/dark-mode.md`. */
  guide: string;
  /** 1-based line of the block's first code line in the guide. */
  line: number;
  /** The fence's language, such as `ts`; empty when it has none. */
  lang: string;
  /** The rest of the fence's info string, such as `title="ndop.json"`. */
  meta: string;
  /** The `title="…"` of the meta, when there is one. */
  title?: string;
  /**
   * The reason of a `nocheck="…"` in the meta: `''` when `nocheck` has
   * no reason, `undefined` when the block has no `nocheck`.
   */
  nocheck?: string;
  /** The code, without the fence's indentation. */
  code: string;
}

/** A problem found in a guide. */
export interface GuideIssue {
  /** The guide, such as `getting-started/dark-mode.md`. */
  guide: string;
  /** 1-based line in the guide. */
  line: number;
  /** What is wrong. */
  message: string;
}

/**
 * Matches `nocheck` in a fence's meta, with its optional `="reason"`. The
 * docs' highlighter strips the same text, so it never shows on the site.
 */
export const NOCHECK_PATTERN = /(?:^|\s)nocheck(?:="([^"]*)")?(?=\s|$)/;

/**
 * Reads every fenced code block of a guide, as CommonMark reads them: a
 * fence of three or more backticks or tildes, indented up to the list
 * item it sits in, closed by a fence of the same character at least as
 * long.
 *
 * @param guide - The guide's path under the guides folder.
 * @param markdown - The guide's Markdown.
 * @returns The blocks, in order.
 *
 * @example
 * ```ts
 * codeBlocks('getting-started/cli.md', '```ts\nconst a = 1;\n```\n');
 * // [{ guide: 'getting-started/cli.md', line: 2, lang: 'ts', meta: '', code: 'const a = 1;' }]
 * ```
 */
export function codeBlocks(guide: string, markdown: string): CodeBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: CodeBlock[] = [];
  for (let index = 0; index < lines.length; index++) {
    const open = /^([ \t]*)(`{3,}|~{3,})([^\s`]*)[ \t]*(.*)$/.exec(
      lines[index] ?? '',
    );
    if (!open) continue;
    const [, indent = '', fence = '', lang = '', meta = ''] = open;
    const body: string[] = [];
    let end = index + 1;
    for (; end < lines.length; end++) {
      const line = lines[end] ?? '';
      const close = /^[ \t]*(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (
        close?.[1] &&
        close[1][0] === fence[0] &&
        close[1].length >= fence.length
      ) {
        break;
      }
      body.push(line.startsWith(indent) ? line.slice(indent.length) : line);
    }
    const nocheck = NOCHECK_PATTERN.exec(meta);
    const title = /title="([^"]*)"/.exec(meta)?.[1];
    blocks.push({
      guide,
      line: index + 2,
      lang,
      meta: meta.trim(),
      ...(title === undefined ? {} : { title }),
      ...(nocheck ? { nocheck: (nocheck[1] ?? '').trim() } : {}),
      code: body.join('\n'),
    });
    index = end;
  }
  return blocks;
}

/**
 * Says how a block is checked: TypeScript and Angular templates are
 * compiled, `ndop.json` and `registry.json` validated; every other block,
 * such as shell, CSS or other JSON, isn't checked.
 *
 * @param block - The block.
 * @returns Its kind.
 */
export function blockKind(block: CodeBlock): BlockKind {
  if (TYPESCRIPT_LANGUAGES.has(block.lang)) return 'typescript';
  if (TEMPLATE_LANGUAGES.has(block.lang)) return 'template';
  if (
    block.lang === 'json' &&
    block.title !== undefined &&
    basename(block.title) in JSON_SCHEMAS
  ) {
    return 'json';
  }
  return 'none';
}

/**
 * Checks a block's `nocheck`: it needs a reason, and it is only allowed on
 * a block that would otherwise be checked.
 *
 * @param block - The block.
 * @returns The problem, if any.
 */
export function nocheckIssue(block: CodeBlock): GuideIssue | undefined {
  if (block.nocheck === undefined) return undefined;
  const at = { guide: block.guide, line: block.line - 1 };
  if (blockKind(block) === 'none') {
    return {
      ...at,
      message: `nocheck on a ${block.lang || 'plain'} block, which isn't checked anyway; remove it.`,
    };
  }
  return block.nocheck
    ? undefined
    : {
        ...at,
        message:
          'nocheck needs a reason, as in nocheck="Angular Material\'s markup".',
      };
}

/**
 * Validates an `ndop.json` or `registry.json` block against its schema.
 * The block may leave out required top-level properties, so it can show
 * only the part of the file it is about; everything it does show must be
 * valid.
 *
 * @param block - A block of kind `json`.
 * @returns The problems found.
 */
export function jsonIssues(block: CodeBlock): GuideIssue[] {
  const at = { guide: block.guide, line: block.line };
  const schema = JSON_SCHEMAS[basename(block.title ?? '')];
  if (!schema) return [];
  let data: unknown;
  try {
    data = JSON.parse(block.code);
  } catch (error) {
    return [{ ...at, message: `Invalid JSON: ${(error as Error).message}` }];
  }
  const result = validate(schema, data);
  if (result.valid) return [];
  return result.issues
    .filter(
      (issue) =>
        !(
          issue.path === '' &&
          issue.message.startsWith('must have required property')
        ),
    )
    .map((issue) => ({
      ...at,
      message: `${block.title} doesn't match the ${schema} schema: ${issue.path || '/'} ${issue.message}`,
    }));
}

/** A directive a template can use: its class and where it is imported from. */
export interface KnownDirective {
  /** Exported class name, such as `AlertDialogTrigger`. */
  className: string;
  /** Import specifier, such as `@/ui/alert-dialog/alert-dialog`. */
  module: string;
}

/**
 * The `nd…` attributes of every directive Ndop's items and `@ndop/core`
 * offer, read from the built registry's metadata: each part's selector
 * names its attributes, and the item file that exports the part's class
 * is where it is imported from, through `@/` as in an app.
 *
 * @param metadata - Each component's metadata, by item name.
 * @param itemFiles - Each item's TypeScript files, by item name.
 * @returns Directives by attribute name.
 */
export function knownDirectives(
  metadata: ReadonlyMap<
    string,
    { parts?: { name: string; selector: string }[] }
  >,
  itemFiles: ReadonlyMap<string, { path: string; content: string }[]>,
): Map<string, KnownDirective> {
  // NdIcon is @ndop/core's, not an item's, so no metadata lists it.
  const known = new Map<string, KnownDirective>([
    ['ndIcon', { className: 'NdIcon', module: '@ndop/core' }],
  ]);
  for (const [item, component] of metadata) {
    for (const part of component.parts ?? []) {
      const file = itemFiles
        .get(item)
        ?.find((candidate) =>
          new RegExp(`export class ${part.name}\\b`).test(candidate.content),
        );
      if (!file) continue;
      for (const [, name = ''] of part.selector.matchAll(/\[(nd\w+)\]/g)) {
        known.set(name, {
          className: part.name,
          module: `@/${file.path.replace(/\.ts$/, '')}`,
        });
      }
    }
  }
  return known;
}

/** Class name of the component a template block is compiled in. */
export const TEMPLATE_COMPONENT = 'GuideTemplate';

/**
 * The standalone component a template block compiles in: it imports the
 * Ndop directive of every `nd…` attribute the template uses and has no
 * members, so a template that reads component state fails. Such a block
 * belongs in a `ts` block with its component.
 *
 * @param template - The template.
 * @param directives - Known directives, from {@link knownDirectives}.
 * @param templateUrl - Path of the template file, relative to the component.
 * @returns The component's source.
 */
export function templateComponent(
  template: string,
  directives: ReadonlyMap<string, KnownDirective>,
  templateUrl: string,
): string {
  const used = new Map<string, Set<string>>();
  for (const [name] of template.matchAll(/\bnd[A-Z]\w*/g)) {
    const directive = directives.get(name);
    if (!directive) continue;
    const names = used.get(directive.module) ?? new Set<string>();
    names.add(directive.className);
    used.set(directive.module, names);
  }
  const imports = [...used].map(
    ([module, names]) =>
      `import { ${[...names].sort().join(', ')} } from '${module}';`,
  );
  const classes = [...used.values()].flatMap((names) => [...names]).sort();
  return [
    `import { Component } from '@angular/core';`,
    ...imports,
    '',
    '@Component({',
    `  selector: 'guide-template',`,
    `  imports: [${classes.join(', ')}],`,
    `  templateUrl: '${templateUrl}',`,
    '})',
    `export class ${TEMPLATE_COMPONENT} {}`,
    '',
  ].join('\n');
}

/**
 * Finds the `nd…` names a guide uses, anywhere in it, that no Ndop
 * directive answers to.
 *
 * @param guide - The guide's path.
 * @param markdown - Its Markdown.
 * @param directives - Known directives, from {@link knownDirectives}.
 * @returns One issue per unknown name.
 */
export function unknownDirectives(
  guide: string,
  markdown: string,
  directives: ReadonlyMap<string, KnownDirective>,
): GuideIssue[] {
  return markdown.split('\n').flatMap((text, index) =>
    [...text.matchAll(/\bnd[A-Z]\w*/g)]
      .filter(([name]) => !directives.has(name))
      .map(([name]) => ({
        guide,
        line: index + 1,
        message: `${name} isn't a directive of any Ndop item.`,
      })),
  );
}

/**
 * Finds `ndop add` arguments, run through the package as
 * `npx @ndop/cli add` (ADR-0031) or as the installed `ndop` bin, and
 * `/docs/components/<name>` links that name
 * no item of Ndop's registry; a `theme:` argument must name a theme.
 * Options, placeholders, namespaced items and URLs are skipped: they name
 * nothing in Ndop's own registry.
 *
 * @param guide - The guide's path.
 * @param markdown - Its Markdown.
 * @param items - Item types, by item name.
 * @returns One issue per unknown item.
 */
export function unknownItems(
  guide: string,
  markdown: string,
  items: ReadonlyMap<string, string>,
): GuideIssue[] {
  return markdown.split('\n').flatMap((text, index) => {
    const at = { guide, line: index + 1 };
    const added = [
      ...text.matchAll(/(?:@ndop\/cli|\bndop) add ([^\n`]+)/g),
    ].flatMap(([, args = '']) =>
      args
        .split(/\s+/)
        .filter((arg) => arg && !/^(-|<|@)|:\/\//.test(arg))
        .filter((arg) => {
          const name = arg.replace(/^theme:/, '').replace(/@[\d.]+$/, '');
          return !(
            items.has(name) &&
            (!arg.startsWith('theme:') || items.get(name) === 'registry:theme')
          );
        })
        .map((arg) => ({
          ...at,
          message: `ndop add ${arg}: no such item in Ndop's registry.`,
        })),
    );
    const linked = [...text.matchAll(/\(\/docs\/components\/([\w-]+)\)/g)]
      .filter(([, name = '']) => !items.has(name))
      .map(([, name]) => ({
        ...at,
        message: `/docs/components/${name}: no such item in Ndop's registry.`,
      }));
    return [...added, ...linked];
  });
}

/**
 * Turns `ngc` output into diagnostics. `ngc` prints colored
 * `file:line:column - error TS…` whatever `--pretty` says; the
 * `file(line,column): error TS…` form is TypeScript's plain format.
 *
 * @param output - Compiler output, without terminal colors.
 * @returns Each error's file (as printed), line and message.
 */
export function compilerErrors(
  output: string,
): { file: string; line: number; message: string }[] {
  return [
    ...output.matchAll(
      /^(.+?)(?::(\d+):\d+ - |\((\d+),\d+\): )error (\w+): (.*)$/gm,
    ),
  ].map(([, file = '', line1, line2, code, message]) => ({
    file,
    line: Number(line1 ?? line2),
    message: `${code} ${message}`,
  }));
}

/**
 * Formats issues as `path:line: message`, one per line, sorted.
 *
 * @param guidesDir - Folder prefixed to the issues' paths, or `''` when
 *   they are already workspace-relative.
 * @param issues - The issues.
 * @returns The report.
 */
export function formatIssues(
  guidesDir: string,
  issues: readonly GuideIssue[],
): string {
  const prefix = guidesDir ? `${guidesDir}/` : '';
  return [...issues]
    .sort((a, b) => a.guide.localeCompare(b.guide) || a.line - b.line)
    .map((issue) => `${prefix}${issue.guide}:${issue.line}: ${issue.message}`)
    .join('\n');
}
