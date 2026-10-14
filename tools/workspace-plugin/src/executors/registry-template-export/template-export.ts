import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, posix, relative, sep } from 'node:path';

/**
 * Top-level entries of `tools/registry-template` that stay in the Ndop
 * repository: `project.json` is only for Nx, and the rest are what a local
 * `npm install` and `npm run build` leave behind. A lockfile made here
 * would pin the unpublished `@ndop/*` under test, so the public repository
 * makes its own against npm.
 */
export const MONOREPO_ONLY = [
  'project.json',
  'node_modules',
  'public',
  'package-lock.json',
] as const;

/**
 * The README heading of the section for Ndop's maintainers; it and
 * everything up to the next `## ` heading stay in the Ndop repository.
 */
export const MAINTAINER_HEADING = '## In the Ndop repository';

/** Where files of the Ndop repository are browsed on GitHub. */
export const DEFAULT_SOURCE_URL = 'https://github.com/ndop-ui/ui/blob/master';

/**
 * Removes the {@link MAINTAINER_HEADING} section from a README, so the
 * public repository's README speaks only to people using the template.
 *
 * @param readme - The README text.
 * @returns The text without that section, ending in one newline.
 */
export function withoutMaintainerSection(readme: string): string {
  const lines = readme.split('\n');
  const start = lines.findIndex((line) => line.trim() === MAINTAINER_HEADING);
  if (start === -1) return readme;
  const next = lines.findIndex(
    (line, index) => index > start && line.startsWith('## '),
  );
  const kept = [
    ...lines.slice(0, start),
    ...(next === -1 ? [] : lines.slice(next)),
  ];
  return `${kept.join('\n').trimEnd()}\n`;
}

/**
 * Turns Markdown links that leave the template folder, such as
 * `../../docs/adr/0025-….md`, into links to the Ndop repository on GitHub,
 * since those files aren't in the public repository. Links inside the
 * folder, absolute URLs and anchors are kept.
 *
 * @param markdown - A Markdown file of the template.
 * @param file - Its path relative to the template folder, with `/`.
 * @param templatePath - The template folder relative to the workspace
 *   root, with `/`, such as `tools/registry-template`.
 * @param sourceUrl - Base URL of the workspace's files on GitHub.
 * @returns The text with those links made absolute.
 */
export function withMonorepoLinks(
  markdown: string,
  file: string,
  templatePath: string,
  sourceUrl: string = DEFAULT_SOURCE_URL,
): string {
  return markdown.replace(
    /\]\(([^)\s]+)\)/g,
    (link: string, target: string) => {
      if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return link;
      const inTemplate = posix.normalize(
        posix.join(posix.dirname(file), target),
      );
      if (!inTemplate.startsWith('../')) return link;
      const inWorkspace = posix.normalize(posix.join(templatePath, inTemplate));
      if (inWorkspace.startsWith('../')) {
        throw new Error(`${file} links outside the workspace: ${target}`);
      }
      return `](${sourceUrl.replace(/\/$/, '')}/${inWorkspace})`;
    },
  );
}

/**
 * What's wrong with the template's `package.json` for a standalone
 * repository: every dependency must be a version npm can install from the
 * public registry, not a workspace or file link.
 *
 * @param manifest - The `package.json` text.
 * @returns Problems; none when it installs on its own.
 */
export function standaloneManifestProblems(manifest: string): string[] {
  const parsed = JSON.parse(manifest) as Record<
    string,
    Record<string, string> | undefined
  >;
  const problems: string[] = [];
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const [name, range] of Object.entries(parsed[field] ?? {})) {
      if (/^(workspace|file|link|portal):/.test(range)) {
        problems.push(`${field}.${name} is "${range}"`);
      }
    }
  }
  return problems;
}

/**
 * Lists a folder's files, recursively, relative to it with `/`, sorted,
 * leaving out {@link MONOREPO_ONLY} at its top and `.DS_Store` anywhere.
 *
 * @param folder - Absolute folder.
 * @returns The files.
 */
export async function templateFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name !== '.DS_Store')
    .map((entry) =>
      relative(folder, join(entry.parentPath, entry.name)).split(sep).join('/'),
    )
    .filter(
      (file) =>
        !(MONOREPO_ONLY as readonly string[]).includes(
          file.split('/')[0] ?? '',
        ),
    )
    .sort();
}

/** What {@link exportRegistryTemplate} copies, and where. */
export interface TemplateExport {
  /** Absolute workspace root. */
  root: string;
  /** The template folder, relative to `root`. */
  source: string;
  /** Absolute output folder; emptied first. */
  output: string;
  /** The license to ship as `LICENSE`, relative to `root`. */
  license: string;
  /** Base URL of the workspace's files on GitHub. */
  sourceUrl?: string;
}

/**
 * Writes a standalone copy of the registry template, ready to be the root
 * of the public template repository (ADR-0025): every file but
 * {@link MONOREPO_ONLY}, Markdown without the maintainer section and with
 * links into the Ndop repository made absolute, and the workspace's
 * license as `LICENSE`. The same input always gives the same files.
 *
 * @param settings - Folders and URLs.
 * @returns The files written, relative to `output`, sorted.
 * @throws When `package.json` names a workspace or file dependency.
 */
export async function exportRegistryTemplate(
  settings: TemplateExport,
): Promise<string[]> {
  const source = join(settings.root, settings.source);
  const templatePath = settings.source.split(sep).join('/');
  const manifestProblems = standaloneManifestProblems(
    await readFile(join(source, 'package.json'), 'utf-8'),
  );
  if (manifestProblems.length) {
    throw new Error(
      `The registry template's package.json doesn't install on its own: ${manifestProblems.join('; ')}.`,
    );
  }

  await rm(settings.output, { recursive: true, force: true });
  const files = await templateFiles(source);
  for (const file of files) {
    const to = join(settings.output, file);
    await mkdir(dirname(to), { recursive: true });
    if (!file.endsWith('.md')) {
      await copyFile(join(source, file), to);
      continue;
    }
    let text = await readFile(join(source, file), 'utf-8');
    if (file === 'README.md') text = withoutMaintainerSection(text);
    await writeFile(
      to,
      withMonorepoLinks(text, file, templatePath, settings.sourceUrl),
    );
  }
  await copyFile(
    join(settings.root, settings.license),
    join(settings.output, 'LICENSE'),
  );
  return [...files, 'LICENSE'].sort();
}
