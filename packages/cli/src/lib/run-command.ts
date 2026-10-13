/**
 * How users run the CLI without installing it, as hints, agent files and
 * the MCP server print it: npm's `npx` with the scoped package, whose only
 * bin is `ndop`. npm refused the unscoped `ndop` name (ADR-0031). Once
 * `@ndop/cli` is a dev dependency, the command is `ndop`.
 *
 * @example
 * ```ts
 * `Run ${RUN_CLI} init in the app first.`; // 'Run npx @ndop/cli init in the app first.'
 * ```
 */
export const RUN_CLI = 'npx @ndop/cli';
