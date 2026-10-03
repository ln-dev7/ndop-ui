import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { ts } from 'ts-morph';
import { x } from 'tinyexec';
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
 * Type-checks registry files with the Angular compiler (`ngc`), resolving
 * `@/` to the registry root as an installed app resolves it to its source
 * folder (ADR-0012).
 *
 * @param root - Registry root.
 * @param files - Registry-relative TypeScript files to check.
 * @param base - Optional tsconfig to extend, keeping its `paths`.
 * @returns `skipped` when `@angular/compiler-cli` can't be resolved from
 *   the root, otherwise the type errors found.
 */
export async function compileFiles(
  root: string,
  files: readonly string[],
  base?: string,
): Promise<{ skipped: true } | { skipped: false; issues: BuildIssue[] }> {
  const ngc = resolveNgc(root);
  if (!ngc) {
    return { skipped: true };
  }
  const scratch = await mkdtemp(join(tmpdir(), 'ndop-build-'));
  try {
    const tsconfig = join(scratch, 'tsconfig.json');
    await writeFile(
      tsconfig,
      JSON.stringify({
        ...(base ? { extends: resolve(base) } : {}),
        compilerOptions: {
          ...APP_OPTIONS,
          paths: {
            ...(base ? inheritedPaths(resolve(base)) : {}),
            '@/*': [`${resolve(root)}/*`],
          },
        },
        files: files.map((file) => resolve(root, file)),
        angularCompilerOptions: ANGULAR_OPTIONS,
      }),
    );
    const result = await x(process.execPath, [ngc, '-p', tsconfig], {
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
        scratch,
      ),
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
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
