import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { logger, type PromiseExecutor } from '@nx/devkit';
import {
  blockKind,
  codeBlocks,
  compilerErrors,
  formatIssues,
  jsonIssues,
  knownDirectives,
  nocheckIssue,
  templateComponent,
  unknownDirectives,
  unknownItems,
  type CodeBlock,
  type GuideIssue,
} from './guides';
import type { DocsGuidesExecutorSchema } from './schema';

/**
 * Compiler options of a fresh `ng new` project, as `ndop build` checks
 * registry items with, so guide code is held to what an app compiles.
 */
const APP_OPTIONS = {
  strict: true,
  noImplicitOverride: true,
  noPropertyAccessFromIndexSignature: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  skipLibCheck: true,
  isolatedModules: true,
  target: 'ES2022',
  module: 'preserve',
  moduleResolution: 'bundler',
  types: [],
  noEmit: true,
};

/** The registry's own template checks (`registry/tsconfig.json`). */
const ANGULAR_OPTIONS = {
  strictInjectionParameters: true,
  strictInputAccessModifiers: true,
  strictTemplates: true,
};

/**
 * The docs guides' check (ADR-0030). Every guide under `guides/<section>/`
 * and every blog post under `posts/` is read and:
 *
 * - each `ts` block is written as a file, and each `angular-html` block as
 *   the template of a generated standalone component that imports the
 *   Ndop directives it uses, and all are compiled with `ngc` and strict
 *   templates against the registry's items, which `@/` resolves to as in
 *   an app;
 * - each `ndop.json` and `registry.json` block is validated against its
 *   schema;
 * - every `nd…` name, `ndop add` argument and `/docs/components/` link
 *   must name a directive or item of the built registry.
 *
 * A block opts out with `nocheck="reason"` in its fence's meta, only where
 * it would be checked and with a reason. Errors are reported at their
 * line in the guide.
 *
 * @param options - Guides, posts, built registry, base tsconfig and work
 *   folder.
 * @param context - Nx executor context.
 * @returns Whether every guide passed.
 *
 * @example
 * ```json
 * "guides": {
 *   "executor": "@ndop/workspace-plugin:docs-guides",
 *   "options": { "guides": "apps/docs/src/guides", "posts": "apps/docs/src/blog" }
 * }
 * ```
 */
const docsGuides: PromiseExecutor<DocsGuidesExecutorSchema> = async (
  options,
  context,
) => {
  const root = context.root;
  const started = Date.now();
  const registry = join(root, options.registry ?? 'dist/registry/r');
  const work = join(root, options.workDir ?? 'tmp/docs-guides');

  const guides = new Map([
    ...readGuides(root, options.guides),
    ...(options.posts ? readPosts(root, options.posts) : []),
  ]);
  const { directives, items } = readRegistry(
    registry,
    join(root, options.primitives ?? 'dist/primitives-api'),
  );
  const issues: GuideIssue[] = [];
  const blocks: CodeBlock[] = [];
  for (const [guide, markdown] of guides) {
    issues.push(
      ...unknownDirectives(guide, markdown, directives),
      ...unknownItems(guide, markdown, items),
    );
    blocks.push(...codeBlocks(guide, markdown));
  }

  rmSync(work, { recursive: true, force: true });
  /** Generated file, absolute, to the block it holds. */
  const sources = new Map<string, CodeBlock>();
  let skipped = 0;
  for (const block of blocks) {
    const nocheck = nocheckIssue(block);
    if (nocheck) issues.push(nocheck);
    const kind = blockKind(block);
    if (kind === 'none') continue;
    if (block.nocheck !== undefined) {
      skipped++;
      continue;
    }
    if (kind === 'json') {
      issues.push(...jsonIssues(block));
      continue;
    }
    const folder = join(
      work,
      block.guide.replace(/\.md$/, ''),
      String(block.line),
    );
    mkdirSync(folder, { recursive: true });
    if (kind === 'typescript') {
      const file = join(folder, 'block.ts');
      writeFileSync(file, block.code);
      sources.set(file, block);
    } else {
      const template = join(folder, 'template.html');
      writeFileSync(template, block.code);
      writeFileSync(
        join(folder, 'template.ts'),
        templateComponent(block.code, directives, './template.html'),
      );
      sources.set(template, block);
      sources.set(join(folder, 'template.ts'), block);
    }
  }

  const files = [...sources.keys()].filter((file) => file.endsWith('.ts'));
  if (files.length > 0) {
    const tsconfig = join(work, 'tsconfig.json');
    writeFileSync(
      tsconfig,
      JSON.stringify(
        {
          extends: join(root, options.tsconfig ?? 'tsconfig.base.json'),
          compilerOptions: APP_OPTIONS,
          files,
          angularCompilerOptions: ANGULAR_OPTIONS,
        },
        null,
        2,
      ),
    );
    const { code, output } = await run(
      process.execPath,
      [ngcPath(root), '-p', tsconfig],
      root,
    );
    if (code !== 0) {
      const errors = compilerErrors(stripVTControlCharacters(output));
      for (const error of errors) {
        // ngc prints paths relative to the tsconfig's folder.
        const file = resolve(dirname(tsconfig), error.file);
        const block = sources.get(file);
        issues.push(
          block
            ? {
                guide: block.guide,
                // The component of a template block is generated, so its
                // errors are reported at the block.
                line: file.endsWith('template.ts')
                  ? block.line
                  : block.line + error.line - 1,
                message: error.message,
              }
            : {
                guide: '',
                line: 0,
                message: `${file}:${error.line}: ${error.message}`,
              },
        );
      }
      if (errors.length === 0) {
        logger.error(output);
        issues.push({ guide: '', line: 0, message: 'ngc failed.' });
      }
    }
  }

  const counted = (kind: string) =>
    blocks.filter(
      (block) => blockKind(block) === kind && block.nocheck === undefined,
    ).length;
  const summary = `${guides.size} guides and posts: ${counted('typescript')} TypeScript, ${counted('template')} template and ${counted('json')} JSON blocks checked, ${skipped} skipped with nocheck, in ${((Date.now() - started) / 1000).toFixed(1)}s.`;
  if (issues.length > 0) {
    logger.error(formatIssues('', issues));
    logger.error(`${summary} ${issues.length} problems.`);
    return { success: false };
  }
  logger.info(summary);
  return { success: true };
};

/**
 * Reads every guide, `guides/<section>/<page>.md`.
 *
 * @param root - Workspace root.
 * @param folder - Workspace-relative guides folder.
 * @returns Markdown by workspace-relative path, such as
 *   `apps/docs/src/guides/getting-started/cli.md`.
 */
function readGuides(root: string, folder: string): Map<string, string> {
  return new Map(
    readdirSync(join(root, folder), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((section) =>
        readdirSync(join(root, folder, section.name))
          .filter((file) => file.endsWith('.md'))
          .sort()
          .map((file): [string, string] => [
            `${folder}/${section.name}/${file}`,
            readFileSync(join(root, folder, section.name, file), 'utf-8'),
          ]),
      ),
  );
}

/**
 * Reads every blog post, `posts/<slug>.md`.
 *
 * @param root - Workspace root.
 * @param folder - Workspace-relative posts folder.
 * @returns Markdown by workspace-relative path, such as
 *   `apps/docs/src/blog/updating-code-you-own.md`; none when the folder
 *   doesn't exist yet.
 */
function readPosts(root: string, folder: string): Map<string, string> {
  if (!existsSync(join(root, folder))) return new Map();
  return new Map(
    readdirSync(join(root, folder))
      .filter((file) => file.endsWith('.md'))
      .sort()
      .map((file): [string, string] => [
        `${folder}/${file}`,
        readFileSync(join(root, folder, file), 'utf-8'),
      ]),
  );
}

/**
 * Reads what the guides may name from the built registry: its items, and
 * the directives of their metadata.
 *
 * @param registry - Absolute path of the built registry's `r` folder.
 * @param primitives - Absolute folder of extracted primitive API references.
 * @returns Directives by attribute name, and item types by item name.
 */
function readRegistry(
  registry: string,
  primitives: string,
): {
  directives: ReturnType<typeof knownDirectives>;
  items: Map<string, string>;
} {
  const read = <T>(path: string) =>
    JSON.parse(readFileSync(join(registry, path), 'utf-8')) as T;
  const index = read<{ items: { name: string; type: string }[] }>('index.json');
  const metadata = new Map(
    readdirSync(join(registry, 'metadata'))
      .filter((file) => file.endsWith('.json'))
      .map((file) => [
        file.replace(/\.json$/, ''),
        read<{ parts?: { name: string; selector: string }[] }>(
          `metadata/${file}`,
        ),
      ]),
  );
  const itemFiles = new Map(
    [...metadata.keys()].map((name) => [
      name,
      (
        read<{ files?: { path: string; content?: string }[] }>(`${name}.json`)
          .files ?? []
      )
        .filter((file) => file.path.endsWith('.ts'))
        .map((file) => ({ path: file.path, content: file.content ?? '' })),
    ]),
  );
  return {
    directives: knownDirectives(
      metadata,
      itemFiles,
      readdirSync(primitives)
        .filter((file) => file.endsWith('.json') && file !== 'index.json')
        .map(
          (file) =>
            JSON.parse(readFileSync(join(primitives, file), 'utf-8')) as {
              importPath: string;
              parts: { name: string; selector: string }[];
            },
        ),
    ),
    items: new Map(index.items.map((item) => [item.name, item.type])),
  };
}

/**
 * Finds the `ngc` script of the workspace's `@angular/compiler-cli`.
 *
 * @param root - Workspace root.
 * @returns Absolute path of the script.
 */
function ngcPath(root: string): string {
  const manifest = createRequire(join(root, 'noop.js')).resolve(
    '@angular/compiler-cli/package.json',
  );
  const { bin } = JSON.parse(readFileSync(manifest, 'utf-8')) as {
    bin: { ngc: string };
  };
  return join(dirname(manifest), bin.ngc);
}

/**
 * Runs a command and collects what it prints.
 *
 * @param command - Executable.
 * @param args - Arguments.
 * @param cwd - Working folder.
 * @returns Exit code and combined output.
 */
function run(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; output: string }> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', fail);
    child.on('close', (code) => done({ code: code ?? 1, output }));
  });
}

export default docsGuides;
