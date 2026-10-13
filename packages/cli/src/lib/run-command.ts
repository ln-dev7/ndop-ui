/**
 * How users run the CLI without installing it, as hints, agent files and
 * the MCP server print it: npm's `npx` with the scoped package, whose only
 * bin is `ndop`. npm refused the unscoped `ndop` name (ADR-0031). Once
 * `@ndop/cli` is a dependency of the project, {@link LOCAL_CLI} runs it.
 *
 * @example
 * ```ts
 * `Run ${RUN_CLI} init in the app first.`; // 'Run npx @ndop/cli init in the app first.'
 * ```
 */
export const RUN_CLI = 'npx @ndop/cli';

/**
 * How users run the CLI once `@ndop/cli` is a dependency of the project, as
 * `ndop init` adds it (ADR-0031, amendment 1): `npx` runs the `ndop` bin
 * from `node_modules/.bin`, looking up from the current folder, before it
 * fetches anything, in npm, pnpm and bun projects alike.
 *
 * @example
 * ```ts
 * `Run ${LOCAL_CLI} add dialog.`; // 'Run npx ndop add dialog.'
 * ```
 */
export const LOCAL_CLI = 'npx ndop';

/** The CLI's npm package. */
export const CLI_PACKAGE = '@ndop/cli';

/**
 * The command that runs the CLI in a project: {@link LOCAL_CLI} when the
 * project depends on `@ndop/cli`, {@link RUN_CLI} otherwise.
 *
 * @param installed - Whether the project's `package.json` lists `@ndop/cli`.
 * @returns The command, without arguments.
 *
 * @example
 * ```ts
 * cliCommand(true); // 'npx ndop'
 * cliCommand(false); // 'npx @ndop/cli'
 * ```
 */
export function cliCommand(installed: boolean): string {
  return installed ? LOCAL_CLI : RUN_CLI;
}

/**
 * The dev dependency `ndop init` and `ndop doctor --fix` add for the
 * running CLI: a caret range from its version, or the exact version for a
 * prerelease, which is one particular build (such as the install test's
 * `0.0.0-e2e.<time>`). npm saves that with its `^` save-prefix, which only
 * matches prereleases of the same version.
 *
 * @param version - The running CLI's version; `undefined` when unknown.
 * @returns The spec, such as `@ndop/cli@^0.2.0`, or `@ndop/cli` for the
 *   latest when the version is unknown.
 *
 * @example
 * ```ts
 * cliDependency('0.2.0'); // '@ndop/cli@^0.2.0'
 * cliDependency('0.0.0-e2e.1760000000000'); // '@ndop/cli@0.0.0-e2e.1760000000000'
 * ```
 */
export function cliDependency(version: string | undefined): string {
  if (!version) return CLI_PACKAGE;
  return version.includes('-')
    ? `${CLI_PACKAGE}@${version}`
    : `${CLI_PACKAGE}@^${version}`;
}
