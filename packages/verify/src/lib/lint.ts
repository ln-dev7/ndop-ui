import { readdir } from 'node:fs/promises';
import { relative } from 'node:path';
import * as ndopModule from '@ndop/eslint-plugin';
import angular from 'angular-eslint';
import { ESLint, type Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import type { Problem } from './types';

/** The outcome of linting. */
export interface LintResult {
  /** Problems ESLint reported. */
  problems: Problem[];
  /** Why the project's own config wasn't used, when it wasn't. */
  note?: string;
}

/**
 * The plugin object, whichever way the CommonJS package is imported.
 *
 * @returns The plugin.
 */
function ndopPlugin(): typeof ndopModule.default {
  const loaded = ndopModule as unknown as {
    default?: {
      default?: typeof ndopModule.default;
    } & typeof ndopModule.default;
  };
  return (
    loaded.default?.default ?? (loaded.default as typeof ndopModule.default)
  );
}

/**
 * Ndop's rules with the parsers they need: angular-eslint's template parser
 * and inline template processor, and typescript-eslint's parser.
 *
 * @returns Flat config.
 */
export function ndopLintConfig(): Linter.Config[] {
  return [
    {
      files: ['**/*.ts'],
      languageOptions: { parser: tseslint.parser as Linter.Parser },
      processor: angular.processInlineTemplates as Linter.Processor,
    },
    {
      files: ['**/*.html'],
      languageOptions: { parser: angular.templateParser as Linter.Parser },
    },
    ...(ndopPlugin().configs['recommended'] as Linter.Config[]),
  ];
}

/**
 * Lints files with the project's ESLint config, if it has one, and Ndop's
 * rules on top (ADR-0018). When the project's config can't be loaded
 * alongside them, Ndop's rules run alone and the result says so.
 *
 * @param root - Workspace root.
 * @param files - Absolute paths.
 * @returns The problems.
 */
export async function lintFiles(
  root: string,
  files: readonly string[],
): Promise<LintResult> {
  const run = (eslint: ESLint) => eslint.lintFiles([...files]);
  const alone = () =>
    run(
      new ESLint({
        cwd: root,
        overrideConfigFile: true,
        overrideConfig: ndopLintConfig(),
      }),
    );
  let results: ESLint.LintResult[];
  let note: string | undefined;
  const configured = (await readdir(root)).some((file) =>
    /^eslint\.config\.[cm]?[jt]s$/.test(file),
  );
  if (!configured) {
    results = await alone();
  } else
    try {
      results = await run(
        new ESLint({ cwd: root, overrideConfig: ndopLintConfig() }),
      );
    } catch (error) {
      note = `The project's ESLint config couldn't be loaded with Ndop's rules (${(error as Error).message.split('\n')[0]}), so only Ndop's rules ran.`;
      results = await alone();
    }
  const problems = results.flatMap((result) =>
    result.messages.map(
      (message): Problem => ({
        file: relative(root, result.filePath),
        line: message.line,
        column: message.column,
        rule: message.ruleId ?? 'lint/parse',
        severity: message.severity === 2 ? 'error' : 'warning',
        message: message.message,
        ...(message.fix ? { fix: 'eslint --fix fixes it.' } : {}),
      }),
    ),
  );
  return { problems, ...(note ? { note } : {}) };
}
