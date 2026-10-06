/** One scoring check's outcome. */
export interface Check {
  /** Which check. */
  name: 'verify' | 'components' | 'scope';
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
  /** Components the prompt requires. */
  components: readonly string[];
  /** Project-relative paths created, changed or deleted. */
  changed: readonly string[];
  /** Paths `ndop add` wrote, from the lockfile. */
  ndopFiles: ReadonlySet<string>;
  /** Item names in the lockfile. */
  installed: ReadonlySet<string>;
  /** Text of the agent's own source files, by path. */
  sources: Readonly<Record<string, string>>;
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

/**
 * Scores one prompt's result (ADR-0019). It passes when:
 *
 * 1. `ndop verify` on the agent's files found no error, with no step
 *    skipped;
 * 2. those files use every required component, installed through the
 *    registry (in the lockfile) and imported from its installed file;
 * 3. nothing changed outside `src/` but the files installing items
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

  const missing = input.components.filter(
    (component) =>
      !input.installed.has(component) ||
      !Object.values(input.sources).some((source) =>
        new RegExp(`/ui/${component}/${component}['"]`).test(source),
      ),
  );
  checks.push({
    name: 'components',
    ok: missing.length === 0,
    detail: missing.length
      ? `Not installed and imported: ${missing.join(', ')}.`
      : `Uses ${input.components.join(', ')}.`,
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
