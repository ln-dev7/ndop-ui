import { readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { buildHarness } from './build';
import { findComponents, type FoundComponent } from './components';
import { lintFiles, stylesheetRuleSetting } from './lint';
import { renderComponents } from './render';
import { checkStylesheets } from './styles';
import type {
  Problem,
  StepName,
  StepResult,
  VerifyOptions,
  VerifyResult,
} from './types';
import { checkUsage } from './usage';
import { findApp, projectTypescript } from './workspace';

/** Folders a folder path never descends into. */
const IGNORED = new Set(['node_modules', 'dist', '.angular', '.ndop', '.git']);

/**
 * The `.ts` files a list of files and folders names, without tests.
 *
 * @param base - Folder the paths are relative to.
 * @param paths - Files or folders.
 * @returns Absolute file paths.
 */
async function sourceFiles(
  base: string,
  paths: readonly string[],
): Promise<string[]> {
  const files: string[] = [];
  const add = async (path: string): Promise<void> => {
    const info = await stat(path).catch(() => undefined);
    if (!info)
      throw new Error(`${relative(base, path) || path} doesn't exist.`);
    if (info.isDirectory()) {
      for (const entry of await readdir(path)) {
        if (!IGNORED.has(entry))
          await add(join(path, entry)).catch(() => undefined);
      }
    } else if (path.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(path)) {
      files.push(path);
    }
  };
  for (const path of paths) await add(resolve(base, path));
  return [...new Set(files)].sort();
}

/**
 * Checks files the way RFC-0001's verify loop describes (ADR-0018): their
 * templates against component metadata, a type-checked build of a harness
 * rendering them, Ndop's lint rules on their code, templates and
 * stylesheets and on the project's Tailwind stylesheet, then icons, axe and
 * screenshots in Chromium.
 * A failed step doesn't stop the next ones, except that rendering needs the
 * build; any step can be skipped. Nothing in the project changes except
 * `.ndop/verify/`.
 *
 * @param options - What to check, and where metadata comes from.
 * @returns The result `ndop verify --json` prints.
 *
 * @example
 * ```ts
 * const result = await verify({ cwd: '.', paths: ['src/app/settings'], metadata });
 * if (!result.ok) console.log(result.problems);
 * ```
 */
export async function verify(options: VerifyOptions): Promise<VerifyResult> {
  const app = await findApp(options.cwd, options.project);
  const files = await sourceFiles(resolve(options.cwd), options.paths);
  if (files.length === 0) {
    throw new Error('No .ts files to verify in the given paths.');
  }
  const ts = projectTypescript(app.root);
  const components: FoundComponent[] = [];
  for (const file of files) {
    components.push(...(await findComponents(ts, app.root, file)));
  }
  const skip = new Set(options.skip ?? []);
  const steps: StepResult[] = [];
  const problems: Problem[] = [];
  let screenshots: string[] = [];
  let output: string | undefined;

  const step = async (
    name: StepName,
    run: () => Promise<{ problems: Problem[]; skipped?: string }>,
  ) => {
    const started = performance.now();
    if (skip.has(name)) {
      steps.push({ name, ok: true, skipped: `--skip ${name}`, durationMs: 0 });
      return;
    }
    const result = await run();
    problems.push(...result.problems);
    steps.push({
      name,
      ok: !result.problems.some((problem) => problem.severity === 'error'),
      ...(result.skipped ? { skipped: result.skipped } : {}),
      durationMs: Math.round(performance.now() - started),
    });
  };

  await step('usage', async () => ({
    problems: checkUsage(
      components.flatMap((component) => component.template ?? []),
      await options.metadata.installed(),
      await options.metadata.available().catch(() => []),
      options.addCommand,
    ),
  }));
  await step('build', async () => {
    const renderable = components.filter((component) => component.exported);
    const built = await buildHarness(app, renderable);
    output = built.output;
    return { problems: built.problems };
  });
  await step('lint', async () => {
    // External templates hold markup too; ESLint only reaches inline ones
    // through the `.ts` files.
    const templates = components.flatMap((component) =>
      component.template?.file.endsWith('.html')
        ? [join(app.root, component.template.file)]
        : [],
    );
    const linted = await lintFiles(app.root, [
      ...new Set([...files, ...templates]),
    ]);
    const styled = await checkStylesheets(
      app.root,
      components.flatMap((component) => component.stylesheets),
      await stylesheetRuleSetting(app.root, 'ndop/no-raw-colors'),
    );
    return {
      problems: [
        ...linted.problems.map((problem) =>
          problem.rule === 'ndop/no-raw-colors' && !problem.fix
            ? { ...problem, fix: styled.fix }
            : problem,
        ),
        ...styled.problems,
      ],
      ...(linted.note ? { skipped: linted.note } : {}),
    };
  });
  await step('render', async () => {
    if (!output) {
      return {
        problems: [],
        skipped: 'The build failed, so nothing was rendered.',
      };
    }
    const rendered = await renderComponents(
      app.root,
      output,
      components.filter((component) => component.exported),
    );
    screenshots = rendered.screenshots;
    return {
      problems: rendered.problems,
      ...(rendered.skipped ? { skipped: rendered.skipped } : {}),
    };
  });

  problems.sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
  return {
    ok: !problems.some((problem) => problem.severity === 'error'),
    steps,
    problems,
    screenshots,
  };
}
