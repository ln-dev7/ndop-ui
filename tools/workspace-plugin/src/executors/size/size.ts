import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { logger, type PromiseExecutor } from '@nx/devkit';
import type { SizeExecutorSchema } from './schema';

/** Budgets in bytes: one for any item, and some by item name. */
export interface Budgets {
  /** Budget of items without their own. */
  default: number;
  /** Budgets by item name. */
  items?: Record<string, number>;
}

/** One item's two measurements, in minified and gzipped bytes. */
export interface ItemSize {
  /** Ndop's own code: the styled item and its primitive. */
  gzip: number;
  /** With the Angular CDK code it pulls in, which overlays share. */
  withCdk: number;
}

/** One item's measurement. */
export interface SizeRow extends ItemSize {
  /** Item name. */
  name: string;
  /** Its budget, which applies to {@link ItemSize.gzip}. */
  budget: number;
  /** Whether it is over. */
  over: boolean;
}

/**
 * Packages every app has once, whatever it installs, so they aren't part
 * of any item's cost: Angular, RxJS, `@ndop/core` and the registry's
 * shared `lib` items (`utils`, `icons`).
 */
const SHARED = [
  /^@angular\/(core|common|platform-browser|forms|router)(\/|$)/,
  /^rxjs(\/|$)/,
  /^tslib$/,
  /^@ndop\/core(\/|$)/,
  /^@\/lib\//,
];

/** The Angular CDK, measured but not budgeted (ADR-0021, amendment 1). */
const CDK = /^@angular\/cdk(\/|$)/;

/**
 * Measures what each registry component adds to an app (ADR-0021): every
 * `registry:ui` item and the primitives it composes are compiled ahead of
 * time with `ngc`, as an app's build compiles them; each item is then
 * bundled on its own with esbuild, minified and gzipped, leaving out what
 * every app shares ({@link SHARED}) and keeping the CDK code it pulls in,
 * transformed first as the application builder transforms it: linked and
 * with Angular's static members made tree-shakable. Each item is measured
 * twice: its own code, without the CDK, which the budget applies to, and
 * with the CDK, which is reported (amendment 1).
 * Fails when an item's own code is over its budget, and writes
 * `<outputPath>/report.json`.
 *
 * @param options - Budgets, registry, tsconfig and output.
 * @param context - Nx executor context.
 * @returns Whether every item is within budget.
 *
 * @example
 * ```json
 * "check": {
 *   "executor": "@ndop/workspace-plugin:size",
 *   "options": { "budgets": "tools/size/budgets.json" }
 * }
 * ```
 */
const size: PromiseExecutor<SizeExecutorSchema> = async (options, context) => {
  const root = context.root;
  const registry = join(root, options.registryRoot ?? 'registry');
  const budgets = JSON.parse(
    readFileSync(join(root, options.budgets), 'utf-8'),
  ) as Budgets;
  const items = (
    JSON.parse(readFileSync(join(registry, 'registry.json'), 'utf-8')) as {
      items: { name: string; type: string; files?: { path: string }[] }[];
    }
  ).items
    .filter((item) => item.type === 'registry:ui')
    .map((item) => ({
      ...item,
      files: compositionFiles(
        item.files ?? [],
        options.compositionEntries?.[item.name] ?? [],
        root,
        registry,
      ),
    }));

  for (const name of options.primitiveEntries ?? []) {
    items.push({
      name: `@ndop/primitives/${name}`,
      type: 'registry:ui',
      files: [
        {
          path: relative(
            registry,
            join(root, `packages/primitives/${name}/src/index.ts`),
          ),
        },
      ],
    });
  }

  const work = join(root, 'tmp/size');
  const out = join(work, 'out');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const tsconfig = join(work, 'tsconfig.json');
  writeFileSync(
    tsconfig,
    JSON.stringify({
      extends: join(root, options.tsconfig ?? 'tsconfig.base.json'),
      compilerOptions: {
        noEmit: false,
        outDir: out,
        rootDir: root,
        declaration: false,
        sourceMap: false,
        skipLibCheck: true,
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'bundler',
      },
      files: items.flatMap((item) =>
        (item.files ?? [])
          .filter((file) => file.path.endsWith('.ts'))
          .map((file) => join(registry, file.path)),
      ),
      angularCompilerOptions: { compilationMode: 'full' },
    }),
  );

  const fromRoot = createRequire(join(root, 'noop.js'));
  const manifest = fromRoot.resolve('@angular/compiler-cli/package.json');
  const ngc = join(
    dirname(manifest),
    (JSON.parse(readFileSync(manifest, 'utf-8')) as { bin: { ngc: string } })
      .bin.ngc,
  );
  if ((await run(process.execPath, [ngc, '-p', tsconfig], root)) !== 0) {
    logger.error('ngc failed; see its output above.');
    return { success: false };
  }

  const esbuild = fromRoot('esbuild') as typeof import('esbuild');
  // What an app build does to JavaScript before bundling: link Angular
  // packages and make Angular's static class members tree-shakable. It's
  // @angular/build's private transformer, the application builder's own;
  // its API may change with Angular, which this tool then follows.
  const { JavaScriptTransformer } = fromRoot('@angular/build/private') as {
    JavaScriptTransformer: new (options: {
      sourcemap: boolean;
      advancedOptimizations: boolean;
      jit: boolean;
    }) => {
      transformData(
        filename: string,
        data: string,
        options: { sideEffects: () => Promise<boolean> },
      ): Promise<Uint8Array>;
      close(): Promise<void>;
    };
  };
  const transformer = new JavaScriptTransformer({
    sourcemap: false,
    advancedOptimizations: true,
    jit: false,
  });
  const compiled = (path: string) => join(out, path.replace(/\.ts$/, '.js'));
  const measure = async (
    item: (typeof items)[number],
    withCdk: boolean,
  ): Promise<number> => {
    const result = await esbuild.build({
      stdin: {
        contents: (item.files ?? [])
          .filter((file) => file.path.endsWith('.ts'))
          .map(
            (file) =>
              `export * from ${JSON.stringify(compiled(join(options.registryRoot ?? 'registry', file.path)))};`,
          )
          .join('\n'),
        resolveDir: out,
      },
      bundle: true,
      minify: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      logLevel: 'silent',
      // A production build's globals, which drop dev-only code such as
      // class metadata that would otherwise keep unused classes alive.
      define: {
        ngDevMode: 'false',
        ngJitMode: 'false',
        ngI18nClosureMode: 'false',
      },
      plugins: [
        {
          name: 'ndop-size',
          setup(build) {
            build.onResolve({ filter: /.*/ }, (args) => {
              if (
                SHARED.some((pattern) => pattern.test(args.path)) ||
                (!withCdk && CDK.test(args.path))
              ) {
                return { path: args.path, external: true };
              }
              if (args.path.startsWith('@/')) {
                return { path: compiled(`registry/${args.path.slice(2)}.ts`) };
              }
              const primitive = args.path.match(/^@ndop\/primitives\/(.+)$/);
              if (primitive) {
                return {
                  path: compiled(
                    `packages/primitives/${primitive[1]}/src/index.ts`,
                  ),
                };
              }
              return undefined;
            });
            build.onLoad({ filter: /\.m?js$/ }, async (args) => ({
              contents: await transformer.transformData(
                args.path,
                readFileSync(args.path, 'utf-8'),
                // Ndop's packages and the CDK declare no side effects.
                { sideEffects: async () => false },
              ),
              loader: 'js',
            }));
          },
        },
      ],
    });
    const code = result.outputFiles[0]?.contents ?? new Uint8Array();
    return gzipSync(code, { level: 9 }).length;
  };
  const sizes = new Map<string, ItemSize>();
  for (const item of items) {
    sizes.set(item.name, {
      gzip: await measure(item, false),
      withCdk: await measure(item, true),
    });
  }

  await transformer.close();

  const rows = checkSizes(sizes, budgets);
  const output = join(root, options.outputPath ?? 'dist/size');
  mkdirSync(output, { recursive: true });
  writeFileSync(
    join(output, 'report.json'),
    `${JSON.stringify(rows, null, 2)}\n`,
  );
  const report = formatSizes(rows);
  if (rows.some((row) => row.over)) {
    logger.error(report);
    return { success: false };
  }
  logger.info(report);
  return { success: true };
};

/**
 * Includes the public primitive APIs a styled item no longer forwards. Both
 * compilation and bundling consume this same list, retaining complete exports
 * on either side of a comparison rather than relying on incidental imports.
 *
 * @param files - The styled item's source files.
 * @param entries - Required primitive entry point names.
 * @param root - Absolute workspace root.
 * @param registry - Absolute registry root.
 * @returns Deduplicated registry-relative sources for one complete composition.
 */
export function compositionFiles(
  files: readonly { path: string }[],
  entries: readonly string[],
  root: string,
  registry: string,
): { path: string }[] {
  return [
    ...new Set([
      ...files.map((file) => file.path),
      ...entries.map((name) =>
        relative(
          registry,
          join(root, 'packages/primitives', name, 'src/index.ts'),
        ),
      ),
    ]),
  ].map((path) => ({ path }));
}

/**
 * Compares measured sizes with their budgets.
 *
 * @param sizes - Measurements by item name.
 * @param budgets - The budgets, for each item's own code.
 * @returns One row per item, in the order measured.
 */
export function checkSizes(
  sizes: ReadonlyMap<string, ItemSize>,
  budgets: Budgets,
): SizeRow[] {
  return [...sizes].map(([name, size]) => {
    const budget = budgets.items?.[name] ?? budgets.default;
    return { name, ...size, budget, over: size.gzip > budget };
  });
}

/**
 * The report printed after measuring.
 *
 * @param rows - The measurements.
 * @returns A table, then what is over budget.
 */
export function formatSizes(rows: readonly SizeRow[]): string {
  const kb = (bytes: number) => `${(bytes / 1000).toFixed(2)} kB`;
  const width = Math.max(4, ...rows.map((row) => row.name.length));
  const lines = [
    `${'Item'.padEnd(width)}  Own       Budget    With CDK`,
    ...rows.map(
      (row) =>
        `${row.name.padEnd(width)}  ${kb(row.gzip).padEnd(8)}  ${kb(row.budget).padEnd(8)}  ${kb(row.withCdk)}${row.over ? '  over' : ''}`,
    ),
  ];
  const over = rows.filter((row) => row.over);
  lines.push(
    '',
    over.length
      ? `Over budget: ${over.map((row) => row.name).join(', ')}.`
      : 'Every item is within its budget.',
  );
  return lines.join('\n');
}

/**
 * Runs a command to completion, with its output on this process's.
 *
 * @param command - Executable.
 * @param args - Arguments.
 * @param cwd - Working directory.
 * @returns Its exit code.
 */
function run(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

export default size;
