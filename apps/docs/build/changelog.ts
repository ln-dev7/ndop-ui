// Vite bundles this file with its config, and that bundler resolves
// neither tsconfig paths nor unbuilt workspace packages, so the merge is
// imported by path, as component-docs.ts imports the metadata renderer.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  normalizeText,
  upstreamHunks,
} from '../../../packages/merge/src/index';
import type { Changelog, RegistryItem } from '@ndop/schema';
import { marked } from 'marked';
import type { ShikiTransformer } from 'shiki';
import { transformerLineDiff } from '../src/highlight/shiki';
import type {
  ChangelogPageData,
  PreviewSnapshots,
} from '../src/app/components/changelog-data';

/** Lines of context around each change in a version diff. */
const CONTEXT = 3;

/** What the changelog builders need from the plugin. */
export interface ChangelogTools {
  /** Reads a JSON file from the built registry. */
  read: <T>(file: string) => T;
  /** Highlights code, with the docs' code-frame meta and more transformers. */
  highlight: (
    code: string,
    lang: string,
    meta?: string,
    extra?: ShikiTransformer[],
  ) => Promise<string>;
}

/**
 * One component's changelog page (ADR-0020): each version's notes, what
 * `ndop update` will do, and a diff of each file against the version
 * before, highlighted at build time.
 *
 * @param name - Registry item name.
 * @param tools - Registry reader and highlighter.
 * @returns The page data.
 */
export async function changelogPage(
  name: string,
  tools: ChangelogTools,
): Promise<ChangelogPageData> {
  const item = tools.read<RegistryItem>(`${name}.json`);
  const changelog = tools.read<Changelog>(`changelog/${name}.json`);
  const versions = changelog.versions.map((entry) => entry.version);
  const snapshot = (version: string) =>
    tools.read<RegistryItem>(`${name}@${version}.json`);

  return {
    name,
    title: item.title,
    latest: item.version,
    files: (item.files ?? []).map((file) => file.target),
    versions: await Promise.all(
      changelog.versions.map(async (entry, index) => {
        const previous = versions[index + 1];
        const before = previous ? snapshot(previous) : undefined;
        const after = snapshot(entry.version);
        const diffs = [];
        for (const file of after.files ?? []) {
          const old = before?.files?.find(
            (candidate) => candidate.path === file.path,
          );
          if (!before || old?.content === file.content) continue;
          const diff = diffCode(
            old?.content ?? '',
            file.content ?? '',
            file.target,
          );
          diffs.push({
            target: file.target,
            html: await tools.highlight(
              diff.code,
              languageOf(file.target),
              `title="${file.target}" collapse`,
              [transformerLineDiff(diff.marks)],
            ),
          });
        }
        return {
          version: entry.version,
          ...(previous ? { previous } : {}),
          notesHtml: entry.notes
            ? await Promise.resolve(marked.parse(entry.notes))
            : '',
          changes: changeList(entry.changes),
          diffs,
        };
      }),
    ),
  };
}

/**
 * Every version's files of a component, for the update preview to merge
 * against in the browser. A separate module, loaded only when the preview
 * runs.
 *
 * @param name - Registry item name.
 * @param read - Reads the built registry.
 * @returns Each version's files, newest first.
 */
export function previewSnapshots(
  name: string,
  read: ChangelogTools['read'],
): PreviewSnapshots {
  const changelog = read<Changelog>(`changelog/${name}.json`);
  return {
    versions: changelog.versions.map((entry) => ({
      version: entry.version,
      files: (
        read<RegistryItem>(`${name}@${entry.version}.json`).files ?? []
      ).map((file) => ({ target: file.target, content: file.content ?? '' })),
    })),
  };
}

/**
 * The changes `ndop update` makes for a version, one sentence each.
 *
 * @param changes - The version's computed changes.
 * @returns The sentences, as inline HTML.
 */
export function changeList(
  changes: Changelog['versions'][number]['changes'],
): string[] {
  const code = (text: string) => `<code>${escape(text)}</code>`;
  return [
    ...changes.files.changed.map(
      (path) => `Updates ${code(path)}, keeping your edits.`,
    ),
    ...changes.files.added.map((path) => `Adds ${code(path)}.`),
    ...changes.migrations.map((migration) =>
      migration.to
        ? `Moves ${code(migration.from)} to ${code(migration.to)}, with your edits.`
        : `Deletes ${code(migration.from)}, unless you edited it.`,
    ),
    ...changes.files.removed
      .filter(
        (path) =>
          !changes.migrations.some((migration) => migration.from === path),
      )
      .map(
        (path) =>
          `Leaves ${code(path)} to you; it's no longer part of the item.`,
      ),
    ...changes.codemods.map((codemod) => {
      switch (codemod.kind) {
        case 'rename-export':
          return `Renames ${code(codemod.from)} to ${code(codemod.to)} where your code imports it.`;
        case 'rename-input':
          return `Renames the ${code(codemod.from)} input to ${code(codemod.to)} in your templates, on ${code(codemod.selector)}.${codemod.renameExportAs ? ' Updates matching template export references too.' : ''}`;
        case 'move-export':
          return `Moves ${code(codemod.from)} to ${code(codemod.to)} from ${code(codemod.module)}, preserving your aliases.`;
        case 'native-dialog':
          return `Converts ${code(codemod.from)} content to native ${code('<dialog>')} markup and moves static ${code(codemod.overlay)} classes to its backdrop.`;
      }
    }),
    ...changes.dependencies.added.map((spec) => `Installs ${code(spec)}.`),
    ...changes.dependencies.changed.map((spec) => `Needs ${code(spec)}.`),
    ...changes.dependencies.removed.map(
      (name) =>
        `No longer needs ${code(name)}; remove it if nothing else uses it.`,
    ),
    ...changes.registryDependencies.added.map(
      (name) => `Installs the ${code(name)} item.`,
    ),
  ];
}

/** A version diff, ready to highlight. */
export interface DiffCode {
  /** The lines shown: changes, context and a `⋯` line between hunks. */
  code: string;
  /** Which shown lines were added or removed, by 1-based number. */
  marks: Map<number, 'add' | 'remove'>;
}

/**
 * A version diff as code: the removed and added lines with a few lines of
 * context, and a `⋯` comment between hunks.
 *
 * @param before - The file at the version before; empty for a new file.
 * @param after - The file at this version.
 * @param target - The file's target, which picks the comment syntax.
 * @returns The code and its marked lines.
 */
export function diffCode(
  before: string,
  after: string,
  target: string,
): DiffCode {
  const old = before ? normalizeText(before).slice(0, -1).split('\n') : [];
  const hunks = before
    ? upstreamHunks(before, after)
    : [
        {
          baseLine: 1,
          removed: [] as string[],
          added: normalizeText(after).slice(0, -1).split('\n'),
        },
      ];
  const separator = commentFor(target)('⋯');
  const out: string[] = [];
  const marks = new Map<number, 'add' | 'remove'>();
  const push = (lines: string[], kind?: 'add' | 'remove') => {
    for (const line of lines) {
      out.push(line);
      if (kind) marks.set(out.length, kind);
    }
  };
  let shown = 0;
  hunks.forEach((hunk, index) => {
    const start = hunk.baseLine - 1;
    const from = Math.max(start - CONTEXT, shown);
    if (out.length > 0 && from > shown) out.push(separator);
    push(old.slice(from, start));
    push(hunk.removed, 'remove');
    push(hunk.added, 'add');
    shown = start + hunk.removed.length;
    const next = hunks[index + 1];
    const until = Math.min(
      shown + CONTEXT,
      next ? next.baseLine - 1 : old.length,
    );
    push(old.slice(shown, until));
    shown = until;
  });
  return { code: out.join('\n'), marks };
}

/**
 * The language Shiki highlights a file in.
 *
 * @param target - The file's target.
 * @returns A language the docs load.
 */
function languageOf(target: string): string {
  if (target.endsWith('.ts')) return 'angular-ts';
  if (target.endsWith('.html')) return 'angular-html';
  if (target.endsWith('.css')) return 'css';
  if (target.endsWith('.json')) return 'json';
  return 'ts';
}

/**
 * Wraps text in a comment of the file's language, as Shiki's diff
 * notation expects.
 *
 * @param target - The file's target.
 * @returns The wrapper.
 */
function commentFor(target: string): (text: string) => string {
  if (target.endsWith('.html')) return (text) => `<!-- ${text} -->`;
  if (target.endsWith('.css')) return (text) => `/* ${text} */`;
  return (text) => `// ${text}`;
}

/**
 * Escapes text for HTML.
 *
 * @param text - Plain text.
 * @returns Safe HTML.
 */
function escape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * A changelog page's `.md` twin (ADR-0016, amendment 6): each version's
 * notes, what `ndop update` does, and each file's diff as unified diff
 * text.
 *
 * @param name - Registry item name.
 * @param read - Reads the built registry.
 * @returns The Markdown.
 */
export function changelogMarkdown(
  name: string,
  read: ChangelogTools['read'],
): string {
  const item = read<RegistryItem>(`${name}.json`);
  const changelog = read<Changelog>(`changelog/${name}.json`);
  const lines = [
    `# ${item.title} changelog`,
    '',
    `Every version of the ${item.title} registry item, newest first. Update with \`npx @ndop/cli update ${name}\`; it keeps your edits (https://ndop.dev/docs/getting-started/cli).`,
  ];
  changelog.versions.forEach((entry, index) => {
    const previous = changelog.versions[index + 1]?.version;
    lines.push('', `## ${entry.version}`, '');
    if (entry.notes) lines.push(entry.notes.trim(), '');
    const changes = changeList(entry.changes).map((html) =>
      html
        .replace(/<\/?code>/g, '`')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&'),
    );
    if (changes.length) {
      lines.push(
        'What `ndop update` does:',
        '',
        ...changes.map((text) => `- ${text}`),
        '',
      );
    }
    if (!previous) return;
    const before = read<RegistryItem>(`${name}@${previous}.json`);
    const after = read<RegistryItem>(`${name}@${entry.version}.json`);
    for (const file of after.files ?? []) {
      const old = before.files?.find(
        (candidate) => candidate.path === file.path,
      );
      if (old?.content === file.content) continue;
      const diff = diffCode(
        old?.content ?? '',
        file.content ?? '',
        file.target,
      );
      const separator = commentFor(file.target)('⋯');
      const code = diff.code.split('\n').map((line, index) => {
        const kind = diff.marks.get(index + 1);
        if (!kind && line === separator) return '@@';
        return `${kind === 'add' ? '+' : kind === 'remove' ? '-' : ' '}${line}`;
      });
      lines.push(
        `\`${file.target}\`, from ${previous}:`,
        '',
        '```diff',
        ...code,
        '```',
        '',
      );
    }
  });
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}
