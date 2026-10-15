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

/** The plugin's stylesheet checks, which verify runs on stylesheet files. */
export type StylesheetTools = Pick<
  typeof ndopModule,
  'stylesheetColors' | 'stylesheetImports' | 'themeColors'
>;

/**
 * The plugin's stylesheet checks, whichever way the CommonJS package is
 * imported.
 *
 * @returns The functions.
 */
export function stylesheetTools(): StylesheetTools {
  const loaded = ndopModule as unknown as Partial<StylesheetTools> & {
    default?: Partial<StylesheetTools>;
  };
  return (loaded.stylesheetColors ? loaded : loaded.default) as StylesheetTools;
}

/**
 * The plugin object, whichever way the CommonJS package is imported.
 *
 * @returns The plugin.
 */
export function ndopPlugin(): typeof ndopModule.default {
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
 * The parsers Ndop's rules need: angular-eslint's template parser and
 * inline template processor, and typescript-eslint's parser.
 *
 * @returns Flat config.
 */
function ndopParsers(): Linter.Config[] {
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
  ];
}

/**
 * Ndop's rules with the parsers they need: angular-eslint's template parser
 * and inline template processor, and typescript-eslint's parser.
 *
 * @returns Flat config.
 */
export function ndopLintConfig(): Linter.Config[] {
  return [
    ...ndopParsers(),
    ...(ndopPlugin().configs['recommended'] as Linter.Config[]),
  ];
}

/**
 * Whether the workspace has a flat ESLint config of its own.
 *
 * @param root - Workspace root.
 * @returns True when an `eslint.config.*` file is there.
 */
async function hasProjectConfig(root: string): Promise<boolean> {
  return (await readdir(root)).some((file) =>
    /^eslint\.config\.[cm]?[jt]s$/.test(file),
  );
}

/**
 * Lints files with the project's ESLint config, if it has one, and Ndop's
 * rules (ADR-0018). Ndop's `recommended` config comes first, so the
 * project's own settings for Ndop's rules, such as
 * `'ndop/no-raw-colors': 'warn'`, win (ADR-0018 amendment 1); the parsers
 * come last, so templates are always parsed. When the project's config
 * can't be loaded alongside them, Ndop's rules run alone and the result
 * says so.
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
  if (!(await hasProjectConfig(root))) {
    results = await alone();
  } else
    try {
      results = await run(
        new ESLint({
          cwd: root,
          baseConfig: ndopPlugin().configs['recommended'] as Linter.Config[],
          overrideConfig: ndopParsers(),
        }),
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

/** How the project's ESLint config sets a rule for one file. */
export type RuleSetting = 'error' | 'warning' | 'off';

/** The stylesheet syntaxes verify checks, as config `files` patterns. */
const STYLESHEET_FILES = ['**/*.css', '**/*.scss', '**/*.sass', '**/*.less'];

/**
 * A rule's setting from a resolved config entry, such as `'warn'`, `1` or
 * `['error', {}]`. A rule the config doesn't mention keeps Ndop's default,
 * an error.
 *
 * @param entry - The rule's entry in the resolved config.
 * @returns The setting.
 */
function settingOf(entry: unknown): RuleSetting {
  const level = Array.isArray(entry) ? entry[0] : entry;
  if (level === 0 || level === 'off') return 'off';
  if (level === 1 || level === 'warn') return 'warning';
  return 'error';
}

/**
 * How the project's ESLint config sets a rule for stylesheets, which
 * verify checks itself because ESLint doesn't parse them (ADR-0018
 * amendment 1). Stylesheets match config entries without `files` and
 * entries whose `files` name them (`**\/*.css`); a stylesheet the config
 * ignores (`ignores`) is `off`. Without a project config, or when it
 * can't be loaded, every stylesheet gets Ndop's default, an error.
 *
 * @param root - Workspace root.
 * @param rule - The rule, such as `ndop/no-raw-colors`.
 * @returns The setting for an absolute stylesheet path.
 *
 * @example
 * ```ts
 * const setting = await stylesheetRuleSetting(root, 'ndop/no-raw-colors');
 * await setting(join(root, 'src/styles.css')); // 'warning' with `'ndop/no-raw-colors': 'warn'`
 * ```
 */
export async function stylesheetRuleSetting(
  root: string,
  rule: string,
): Promise<(file: string) => Promise<RuleSetting>> {
  if (!(await hasProjectConfig(root))) return async () => 'error';
  // Without an entry naming stylesheets, ESLint treats them as files it
  // doesn't lint, the same answer it gives for ignored ones. The plugin is
  // registered for config entries that set the rule without registering
  // it; when the project registers its own copy for stylesheets, the
  // second instance avoids redefining it.
  const instances = [
    { files: STYLESHEET_FILES, plugins: { ndop: ndopPlugin() } },
    { files: STYLESHEET_FILES },
  ].map(
    (entry) => new ESLint({ cwd: root, baseConfig: [entry as Linter.Config] }),
  );
  return async (file) => {
    for (const eslint of instances) {
      try {
        const config = (await eslint.calculateConfigForFile(file)) as
          | Linter.Config
          | undefined;
        return config ? settingOf(config.rules?.[rule]) : 'off';
      } catch {
        continue;
      }
    }
    return 'error';
  };
}
