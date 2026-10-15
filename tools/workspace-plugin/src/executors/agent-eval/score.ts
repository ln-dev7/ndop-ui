/** One scoring check's outcome. */
export interface Check {
  /** Which check. */
  name: 'verify' | 'components' | 'styles' | 'scope';
  /** Whether it passed. */
  ok: boolean;
  /** Why it failed, or what it saw. */
  detail: string;
}

/** What `ndop verify --json` returned, as far as scoring reads it. */
export interface VerifyOutput {
  /** Whether no error was found. */
  ok: boolean;
  /** Each step, with why it was skipped. */
  steps: { name: string; ok: boolean; skipped?: string }[];
  /** Problems found. */
  problems: {
    rule: string;
    file: string;
    line: number;
    message: string;
    severity: string;
  }[];
  /** Screenshot paths. */
  screenshots: string[];
}

/** What a prompt's result is scored on. */
export interface ScoreInput {
  /**
   * Components and blocks the prompt requires; an entry such as
   * `dialog|alert-dialog` is met by any one of them.
   */
  components: readonly string[];
  /** Project-relative paths created, changed or deleted. */
  changed: readonly string[];
  /** Paths `ndop add` wrote, from the lockfile. */
  ndopFiles: ReadonlySet<string>;
  /** Item names in the lockfile. */
  installed: ReadonlySet<string>;
  /** Text of the agent's own source files, by path. */
  sources: Readonly<Record<string, string>>;
  /**
   * The agent's stylesheet text under `src/`, by path: a new file whole,
   * and only the added lines of one the fixture already had.
   */
  styles?: Readonly<Record<string, string>>;
  /** Verify's result on the agent's files; absent when it couldn't run. */
  verify?: VerifyOutput;
}

/** Files outside `src/` that installing items or verifying may change. */
const ALLOWED_OUTSIDE_SRC = [
  /^package\.json$/,
  /^(pnpm-lock\.yaml|package-lock\.json|bun\.lockb?)$/,
  /^ndop\.lock\.json$/,
  /^(AGENTS|CLAUDE)\.md$/,
  /^\.claude\/skills\/ndop\//,
  /^\.github\/copilot-instructions\.md$/,
  /^\.cursor\/rules\/ndop\.mdc$/,
];

/**
 * The agent's own files: changed `.ts` and `.html` files under `src/` that
 * `ndop add` didn't write.
 *
 * @param changed - Changed paths.
 * @param ndopFiles - Paths `ndop add` wrote.
 * @returns The agent's files, sorted.
 */
export function authoredFiles(
  changed: readonly string[],
  ndopFiles: ReadonlySet<string>,
): string[] {
  return changed
    .filter(
      (path) =>
        path.startsWith('src/') &&
        /\.(ts|html)$/.test(path) &&
        !/\.spec\.ts$/.test(path) &&
        !ndopFiles.has(path),
    )
    .sort();
}

/** File extensions of stylesheets. */
const STYLESHEET = /\.(css|scss|sass|less)$/;

/**
 * The agent's stylesheets: changed stylesheets under `src/` that
 * `ndop add` didn't write, the global one included.
 *
 * @param changed - Changed paths.
 * @param ndopFiles - Paths `ndop add` wrote.
 * @returns The stylesheets, sorted.
 */
export function authoredStylesheets(
  changed: readonly string[],
  ndopFiles: ReadonlySet<string>,
): string[] {
  return changed
    .filter(
      (path) =>
        path.startsWith('src/') &&
        STYLESHEET.test(path) &&
        !ndopFiles.has(path),
    )
    .sort();
}

/** A CSS color function with a literal value, such as `rgb(0 0 0)`. */
const COLOR_FUNCTION =
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[-+.\d]/gi;

/** A hex color. */
const HEX = /#[\da-f]{3,8}\b/gi;

/** A declaration's value in a stylesheet, where colors go, not selectors. */
const DECLARATION_VALUE = /:([^;{}]*)/g;

/**
 * A hex color in a template or script: in a Tailwind arbitrary value or
 * array (`bg-[#fff]`, `['#fff']`), or set as a color, background, border,
 * fill, stroke, outline or shadow (`color: #fff`, `[style.color]="'#fff'"`),
 * so `#ref` template variables and order numbers don't count.
 */
const HEX_IN_CODE =
  /(?:\[\s*['"`]?|\b[\w-]*(?:colou?rs?|background|bg|border|fill|stroke|outline|shadow)['"\]]?\s*[:=]\s*['"`]*)(#[\da-f]{3,8})\b/gi;

/** A custom property definition, such as `--brand: …` or `[--brand:…]`. */
const CUSTOM_PROPERTY = /(?:^|[\s;{"'`[])(--[a-z][\w-]*)\s*:/gi;

/** A custom property set by a style binding, such as `[style.--brand]`. */
const CUSTOM_PROPERTY_BINDING = /\bstyle\.(--[a-z][\w-]*)/gi;

/**
 * Color literals and custom property definitions in the agent's code,
 * which the agent files rule out: every color comes from the theme's
 * tokens (ADR-0017, amendment 1).
 *
 * @param sources - The agent's `.ts` and `.html` files, by path.
 * @param styles - The agent's stylesheet text, by path.
 * @returns What each offending file has, as `path (values)`.
 */
export function styleOffenses(
  sources: Readonly<Record<string, string>>,
  styles: Readonly<Record<string, string>>,
): string[] {
  const found: string[] = [];
  const add = (path: string, values: string[]) => {
    const unique = [...new Set(values)];
    if (unique.length) found.push(`${path} (${unique.join(', ')})`);
  };
  for (const [path, text] of Object.entries(styles)) {
    const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
    add(path, [
      ...[...css.matchAll(DECLARATION_VALUE)].flatMap(([, value = '']) =>
        [...value.matchAll(HEX)].map((match) => match[0]),
      ),
      ...[...css.matchAll(COLOR_FUNCTION)].map((match) =>
        match[0].replace(/\(.*/, '()'),
      ),
      ...[...css.matchAll(CUSTOM_PROPERTY)].map((match) => match[1] ?? ''),
    ]);
  }
  for (const [path, text] of Object.entries(sources)) {
    add(path, [
      ...[...text.matchAll(HEX_IN_CODE)].map((match) => match[1] ?? ''),
      ...[...text.matchAll(COLOR_FUNCTION)].map((match) =>
        match[0].replace(/\(.*/, '()'),
      ),
      ...[...text.matchAll(CUSTOM_PROPERTY)].map((match) => match[1] ?? ''),
      ...[...text.matchAll(CUSTOM_PROPERTY_BINDING)].map(
        (match) => match[1] ?? '',
      ),
    ]);
  }
  return found.sort();
}

/**
 * Scores one prompt's result (ADR-0019). It passes when:
 *
 * 1. `ndop verify` on the agent's files found no error, with no step
 *    skipped;
 * 2. those files use every required component, installed through the
 *    registry (in the lockfile) and imported from its installed file;
 * 3. they and the agent's stylesheets have no color literals and define
 *    no CSS variables (amendment 3);
 * 4. nothing changed outside `src/` but the files installing items
 *    changes.
 *
 * @param input - What the agent changed and what verify found.
 * @returns Whether it passed, and each check.
 */
export function score(input: ScoreInput): { passed: boolean; checks: Check[] } {
  const files = Object.keys(input.sources);
  const checks: Check[] = [];

  const skipped = input.verify?.steps.filter((step) => step.skipped) ?? [];
  checks.push(
    !files.length
      ? {
          name: 'verify',
          ok: false,
          detail: 'The agent wrote no source files under src/.',
        }
      : !input.verify
        ? { name: 'verify', ok: false, detail: "ndop verify couldn't run." }
        : skipped.length
          ? {
              name: 'verify',
              ok: false,
              detail: `ndop verify skipped ${skipped.map((step) => `${step.name} (${step.skipped})`).join(', ')}.`,
            }
          : input.verify.ok
            ? { name: 'verify', ok: true, detail: 'ndop verify passed.' }
            : {
                name: 'verify',
                ok: false,
                detail: input.verify.problems
                  .filter((problem) => problem.severity === 'error')
                  .map(
                    (problem) =>
                      `${problem.rule} at ${problem.file}:${problem.line}`,
                  )
                  .join('; '),
              },
  );

  const used = (component: string) =>
    input.installed.has(component) &&
    Object.values(input.sources).some((source) =>
      new RegExp(`/(?:ui|blocks)/${component}/${component}['"]`).test(source),
    );
  const missing = input.components.filter(
    (entry) => !entry.split('|').some(used),
  );
  checks.push({
    name: 'components',
    ok: missing.length === 0,
    detail: missing.length
      ? `Not installed and imported: ${missing.map((entry) => entry.split('|').join(' or ')).join(', ')}.`
      : `Uses ${input.components
          .map((entry) => entry.split('|').find(used) ?? entry)
          .join(', ')}.`,
  });

  const offenses = styleOffenses(input.sources, input.styles ?? {});
  checks.push({
    name: 'styles',
    ok: offenses.length === 0,
    detail: offenses.length
      ? `Colors or CSS variables of its own: ${offenses.join('; ')}.`
      : 'Every color comes from the theme.',
  });

  const outside = input.changed.filter(
    (path) =>
      !path.startsWith('src/') &&
      !ALLOWED_OUTSIDE_SRC.some((pattern) => pattern.test(path)),
  );
  checks.push({
    name: 'scope',
    ok: outside.length === 0,
    detail: outside.length
      ? `Changed outside src/: ${outside.join(', ')}.`
      : 'Only src/ and install files changed.',
  });

  return { passed: checks.every((check) => check.ok), checks };
}
