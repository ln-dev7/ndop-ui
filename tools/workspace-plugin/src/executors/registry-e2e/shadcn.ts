import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '@nx/devkit';
import { serveSite } from '../../utils/serve-site';
import {
  caseId,
  run,
  runScriptCommand,
  type CommandLine,
  type InstallCase,
} from './scenario';

/**
 * The shadcn CLI version the compat case installs with. Pinned, because its
 * CLI changes often (ADR-0025): its universal-item handling was checked in
 * this version's source.
 */
export const SHADCN_VERSION = '4.21.4';

/** Where Ndop's compat items are published, as built into `dist/registry`. */
export const PUBLISHED_COMPAT_BASE_URL = 'https://ndop.dev/r/compat/';

/** What the compat case needs from the executor. */
export interface ShadcnCaseSettings {
  /** Folder the app is created in. */
  workDir: string;
  /** Environment pointing every tool at the local registries. */
  env: NodeJS.ProcessEnv;
  /** Absolute path of the built registry, holding `r/compat/`. */
  registryPath: string;
  /** Item to add. */
  item: string;
}

/** Outcome of the compat case, as the executor reports it. */
export interface ShadcnCaseResult {
  /** Case name. */
  id: string;
  /** Seconds from the first `shadcn add` to the end of the build. */
  seconds?: number;
  /** What failed, if anything. */
  error?: string;
}

/**
 * The command a user runs to add items with the pinned shadcn CLI, without
 * prompts.
 *
 * @param urls - Compat item URLs.
 * @returns The command line.
 */
export function shadcnAddCommand(urls: string[]): CommandLine {
  return [
    'npx',
    ['--yes', `shadcn@${SHADCN_VERSION}`, 'add', ...urls, '--yes'],
  ];
}

/**
 * Points a built compat item at another base URL, the way building it with
 * `--compat-base-url` would: its `registryDependencies` and the URLs in its
 * `docs`.
 *
 * @param item - The item's JSON.
 * @param from - The base URL it was built with.
 * @param to - The base URL it's served from.
 * @returns The item's JSON, rebased.
 */
export function rebaseCompatItem(
  item: string,
  from: string,
  to: string,
): string {
  return item
    .split(JSON.stringify(from).slice(1, -1))
    .join(JSON.stringify(to).slice(1, -1));
}

/**
 * The compat item URLs the setup note's first step adds, such as a theme
 * and the icons.
 *
 * @param docs - The note the shadcn CLI printed.
 * @returns The URLs.
 * @throws When the note has no `npx shadcn add` step.
 */
export function setupItemUrls(docs: string): string[] {
  const line = docs
    .split('\n')
    .find((candidate) => candidate.includes('npx shadcn add '));
  if (!line) {
    throw new Error(`The setup note has no npx shadcn add step:\n${docs}`);
  }
  return line
    .slice(line.indexOf('npx shadcn add ') + 'npx shadcn add '.length)
    .split(/\s+/)
    .filter((part) => /^https?:\/\//.test(part));
}

/**
 * The setup note's stylesheet step: Ndop's styles and the theme, after the
 * Tailwind import.
 *
 * @param css - `src/styles.css` from `ng new --style=tailwind`.
 * @returns The edited stylesheet.
 * @throws When it doesn't import Tailwind.
 */
export function setupStylesheet(css: string): string {
  const tailwind = /^@import\s+['"]tailwindcss['"];?[^\n]*\n?/m.exec(css);
  if (!tailwind) {
    throw new Error(`src/styles.css doesn't import Tailwind:\n${css}`);
  }
  const end = tailwind.index + tailwind[0].length;
  const ending = tailwind[0].endsWith('\n') ? '' : '\n';
  return `${css.slice(0, end)}${ending}@import '@ndop/core/styles.css';\n@import './ndop-theme.css';\n${css.slice(end)}`;
}

/**
 * The setup note's providers step: `provideNdop()` and `provideIcons()` in
 * the app config, with their imports.
 *
 * @param source - `src/app/app.config.ts` from `ng new`.
 * @returns The edited file.
 * @throws When it has no `providers` array.
 */
export function setupAppConfig(source: string): string {
  if (!/providers:\s*\[/.test(source)) {
    throw new Error(`app.config.ts has no providers array:\n${source}`);
  }
  return [
    "import { provideNdop } from '@ndop/core';",
    "import { provideIcons } from './lib/icons';",
    source.replace(
      /providers:\s*\[/,
      (match) => `${match}\n    provideNdop(),\n    provideIcons(),`,
    ),
  ].join('\n');
}

/** A route that renders the installed Dialog, so the build compiles it. */
export const SHADCN_ROUTES = `import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./ndop-page').then((m) => m.NdopPage) },
];
`;

/** A page that uses the Dialog the shadcn CLI installed. */
export const SHADCN_PAGE = `import { Component } from '@angular/core';
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog/dialog';

@Component({
  selector: 'app-ndop-page',
  imports: [Dialog, DialogTrigger, DialogPortal, DialogContent, DialogTitle, DialogCloseButton],
  template: \`
    <ng-container ndDialog>
      <button type="button" ndDialogTrigger>Delete account</button>
      <ng-template ndDialogPortal>
        <div ndDialogContent>
          <h2 ndDialogTitle>Delete your account?</h2>
          <button type="button" ndDialogCloseButton><span class="sr-only">Close</span></button>
        </div>
      </ng-template>
    </ng-container>
  \`,
})
export class NdopPage {}
`;

/**
 * The shadcn-compat case (ADR-0025): creates an app with `ng new`, serves
 * the built registry's `r/compat/` rebased onto a local URL, runs the
 * pinned shadcn CLI's `add` on the item's compat URL with no
 * `components.json`, checks it printed the setup note and wrote the item
 * and its dependencies, applies the note's steps (adds the theme and icons
 * it names, imports the styles, registers the providers), routes to a page
 * that uses the item, and builds the app.
 *
 * @param installCase - Package manager and Angular version; `shadcn` set.
 * @param settings - Folders, environment and item.
 * @returns The case's outcome.
 */
export async function runShadcnCase(
  installCase: InstallCase,
  settings: ShadcnCaseSettings,
): Promise<ShadcnCaseResult> {
  const id = caseId(installCase);
  const { packageManager } = installCase;
  const app = join(settings.workDir, id);
  const log = join(settings.workDir, `${id}.log`);
  const options = { cwd: app, env: settings.env, log };
  logger.info(`Running ${id}…`);

  const served = join(settings.workDir, `${id}-registry`);
  await mkdir(join(served, 'r/compat'), { recursive: true });
  const server = await serveSite(served);
  const base = `${server.url}/r/compat/`;
  try {
    const source = join(settings.registryPath, 'r/compat');
    for (const file of await readdir(source)) {
      await writeFile(
        join(served, 'r/compat', file),
        rebaseCompatItem(
          await readFile(join(source, file), 'utf-8'),
          PUBLISHED_COMPAT_BASE_URL,
          base,
        ),
      );
    }

    await run(
      [
        'npx',
        [
          '--yes',
          `@angular/cli@${installCase.angular}`,
          'new',
          'app',
          `--directory=${id}`,
          '--style=tailwind',
          '--zoneless',
          '--ssr=false',
          `--package-manager=${packageManager}`,
          '--skip-git',
          '--defaults',
        ],
      ],
      { ...options, cwd: settings.workDir },
    );

    const start = performance.now();
    const output = await run(
      shadcnAddCommand([`${base}${settings.item}.json`]),
      options,
    );
    const docs = (
      JSON.parse(
        await readFile(
          join(served, 'r/compat', `${settings.item}.json`),
          'utf-8',
        ),
      ) as { docs: string }
    ).docs;
    const problems: string[] = [];
    if (!output.includes('Ndop setup')) {
      problems.push("shadcn add didn't print the setup note");
    }
    for (const path of [
      `src/app/ui/${settings.item}/${settings.item}.ts`,
      'src/app/lib/utils.ts',
    ]) {
      await access(join(app, path)).catch(() =>
        problems.push(`shadcn add didn't write ${path}`),
      );
    }
    for (const step of [
      "@import '@ndop/core/styles.css';",
      "@import './ndop-theme.css';",
      'provideNdop()',
      'provideIcons()',
    ]) {
      if (!docs.includes(step)) problems.push(`the setup note lacks ${step}`);
    }
    if (problems.length) {
      return { id, error: problems.join('; ') };
    }

    await run(shadcnAddCommand(setupItemUrls(docs)), options);
    const styles = join(app, 'src/styles.css');
    await writeFile(styles, setupStylesheet(await readFile(styles, 'utf-8')));
    const appConfig = join(app, 'src/app/app.config.ts');
    await writeFile(
      appConfig,
      setupAppConfig(await readFile(appConfig, 'utf-8')),
    );
    await writeFile(join(app, 'src/app/app.routes.ts'), SHADCN_ROUTES);
    await writeFile(join(app, 'src/app/ndop-page.ts'), SHADCN_PAGE);
    await run(runScriptCommand(packageManager, 'build'), options);
    return { id, seconds: Math.round((performance.now() - start) / 1000) };
  } catch (error) {
    return { id, error: (error as Error).message };
  } finally {
    await server.close();
  }
}
