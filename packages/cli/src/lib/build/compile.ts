import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type { RegistryItem } from '@ndop/schema';
import { ts } from 'ts-morph';
import { x } from 'tinyexec';
import { importSpecifiers } from '../edit/typescript';
import { packageName } from './theme';
import type { BuildIssue } from './types';

/**
 * Compiler options of a fresh `ng new` project, so items are checked as
 * strictly as the apps they're installed into.
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
  types: [],
  noEmit: true,
};

const ANGULAR_OPTIONS = {
  strictInjectionParameters: true,
  strictInputAccessModifiers: true,
  strictTemplates: true,
};

/**
 * A tsconfig written to a temporary folder for one build: the items'
 * TypeScript files, `ng new`'s strict options, and `@/` resolving to the
 * registry root as an installed app resolves it to its source folder
 * (ADR-0012). The compile check and the metadata extractor both use it.
 */
export interface ScratchTsconfig {
  /** Absolute path of the tsconfig. */
  path: string;
  /**
   * Folder the fetched Ndop items' files are written to, under the
   * registry root, when there are any.
   */
  external?: string;
  /** Deletes the temporary folders. */
  dispose(): Promise<void>;
}

/**
 * Writes a {@link ScratchTsconfig}. Files of fetched `@ndop` items
 * (ADR-0025) are written at their registry paths to a temporary folder
 * inside the registry root, so their package imports resolve from the
 * registry's `node_modules` as its own files' do, and `@/` resolves to
 * that folder after the registry root.
 *
 * @param root - Registry root.
 * @param files - Registry-relative TypeScript files.
 * @param base - Optional tsconfig to extend, keeping its `paths`.
 * @param external - Fetched Ndop items, with file contents.
 * @returns The tsconfig.
 */
export async function writeScratchTsconfig(
  root: string,
  files: readonly string[],
  base?: string,
  external: readonly RegistryItem[] = [],
): Promise<ScratchTsconfig> {
  const folder = await mkdtemp(join(tmpdir(), 'ndop-build-'));
  const externalFiles = external.flatMap((item) => item.files ?? []);
  const outside =
    externalFiles.length > 0
      ? await mkdtemp(join(resolve(root), '.ndop-build-'))
      : undefined;
  for (const file of outside ? externalFiles : []) {
    const target = join(outside ?? '', file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content ?? '');
  }
  const path = join(folder, 'tsconfig.json');
  await writeFile(
    path,
    JSON.stringify({
      ...(base ? { extends: resolve(base) } : {}),
      compilerOptions: {
        ...APP_OPTIONS,
        paths: {
          ...(base ? inheritedPaths(resolve(base)) : {}),
          '@/*': [`${resolve(root)}/*`, ...(outside ? [`${outside}/*`] : [])],
        },
      },
      files: files.map((file) => resolve(root, file)),
      angularCompilerOptions: ANGULAR_OPTIONS,
    }),
  );
  return {
    path,
    ...(outside ? { external: outside } : {}),
    dispose: async () => {
      await rm(folder, { recursive: true, force: true });
      if (outside) await rm(outside, { recursive: true, force: true });
    },
  };
}

/**
 * Checks that every package the fetched Ndop items' files import resolves
 * from the registry, through its `node_modules` or the `paths` of the
 * tsconfig it extends, so a missing one is reported by name instead of as
 * a compiler error (ADR-0025).
 *
 * @param tsconfig - The scratch tsconfig, with the fetched files.
 * @param external - Fetched Ndop items, by `@ndop/<name>`.
 * @returns One issue per package that doesn't resolve.
 */
export function missingPackages(
  tsconfig: ScratchTsconfig,
  external: ReadonlyMap<string, RegistryItem>,
): BuildIssue[] {
  if (!tsconfig.external) return [];
  const { config } = ts.readConfigFile(tsconfig.path, ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    dirname(tsconfig.path),
  );
  const missing = new Map<string, string>();
  for (const [key, item] of external) {
    for (const file of item.files ?? []) {
      if (!file.path.endsWith('.ts')) continue;
      const from = join(tsconfig.external, file.path);
      for (const specifier of importSpecifiers(file.content ?? '')) {
        if (specifier.startsWith('.') || specifier.startsWith('@/')) continue;
        const name = packageName(specifier);
        if (missing.has(name)) continue;
        const resolved = ts.resolveModuleName(
          specifier,
          from,
          options,
          ts.sys,
        ).resolvedModule;
        if (!resolved) missing.set(name, key);
      }
    }
  }
  return [...missing].map(([name, key]) => ({
    message: `${key} imports ${name}, which the registry can't resolve. Install it in the registry project, for example with npm install -D ${name}.`,
  }));
}

/**
 * Type-checks the files of a {@link ScratchTsconfig} with the Angular
 * compiler (`ngc`) the registry itself would use.
 *
 * @param root - Registry root.
 * @param tsconfig - The scratch tsconfig.
 * @returns `skipped` when `@angular/compiler-cli` can't be resolved from
 *   the root, otherwise the type errors found.
 */
export async function compileFiles(
  root: string,
  tsconfig: ScratchTsconfig,
): Promise<{ skipped: true } | { skipped: false; issues: BuildIssue[] }> {
  const ngc = resolveNgc(root);
  if (!ngc) {
    return { skipped: true };
  }
  const result = await x(process.execPath, [ngc, '-p', tsconfig.path], {
    nodeOptions: { cwd: root },
  });
  if (result.exitCode === 0) {
    return { skipped: false, issues: [] };
  }
  return {
    skipped: false,
    issues: diagnostics(
      stripVTControlCharacters(`${result.stdout}\n${result.stderr}`),
      root,
      dirname(tsconfig.path),
    ),
  };
}

/**
 * Reads a tsconfig's `paths` as absolute paths, since a `paths` object in
 * the extending config replaces the inherited one instead of merging.
 *
 * @param tsconfig - Absolute path of the tsconfig.
 * @returns Its `paths`, with every target made absolute.
 */
function inheritedPaths(tsconfig: string): Record<string, string[]> {
  const { config } = ts.readConfigFile(tsconfig, ts.sys.readFile);
  const options = (config?.compilerOptions ?? {}) as {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
  const from = resolve(dirname(tsconfig), options.baseUrl ?? '.');
  return Object.fromEntries(
    Object.entries(options.paths ?? {}).map(([key, targets]) => [
      key,
      targets.map((target) => resolve(from, target)),
    ]),
  );
}

/**
 * Finds the `ngc` entry point of the `@angular/compiler-cli` the registry
 * itself would use.
 *
 * @param root - Registry root.
 * @returns Absolute path to `ngc`'s script, or `undefined`.
 */
function resolveNgc(root: string): string | undefined {
  try {
    const manifest = createRequire(join(resolve(root), 'noop.js')).resolve(
      '@angular/compiler-cli/package.json',
    );
    const { bin } = createRequire(manifest)(manifest) as {
      bin: Record<string, string>;
    };
    return bin['ngc'] ? join(dirname(manifest), bin['ngc']) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Turns `ngc` output into issues, one per diagnostic. `ngc` prints
 * colored `file:line:column - error TS…` whatever `--pretty` says; the
 * `file(line,column): error TS…` form is TypeScript's plain format.
 *
 * @param output - Compiler output.
 * @param root - Registry root, which reported paths are made relative to.
 * @param configDir - Folder of the tsconfig `ngc` ran with.
 * @returns Issues; one with the raw output when nothing could be parsed.
 */
function diagnostics(
  output: string,
  root: string,
  configDir: string,
): BuildIssue[] {
  const issues: BuildIssue[] = [];
  for (const match of output.matchAll(
    /^(.+?)(?::(\d+):(\d+) - |\((\d+),(\d+)\): )error (\w+): (.*)$/gm,
  )) {
    const [, file = '', line1, column1, line2, column2, code, message] = match;
    const line = line1 ?? line2;
    const column = column1 ?? column2;
    issues.push({
      // ngc prints paths relative to the tsconfig's folder, not its cwd.
      file: relative(resolve(root), resolve(configDir, file)),
      message: `Line ${line}, column ${column}: ${code} ${message}`,
    });
  }
  return issues.length > 0
    ? issues
    : [{ message: `ngc failed:\n${output.trim()}` }];
}
