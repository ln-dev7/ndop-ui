/**
 * `@ndop/cli` as a library, for workspace tooling such as the
 * `registry-build` and `update-e2e` executors. The published package runs the `ndop` command
 * instead; see `main.ts`. `@ndop/mcp` imports the registry client alone,
 * as `@ndop/cli/registry`.
 *
 * @packageDocumentation
 */
export { buildRegistry } from './lib/build/build';
export { createProgram } from './lib/program';
export {
  nodeEnvironment,
  type CommandEnvironment,
} from './lib/commands/environment';
export type { CommandResult } from './lib/commands/run';
export type { FileStatus, FileUpdate, ItemUpdate } from './lib/update/update';
export { formatBuildResult } from './lib/build/report';
export { themeFromCss, type ThemeParts } from './lib/build/theme';
export type {
  BuildIssue,
  BuildOptions,
  BuildResult,
  SnapshotStatus,
} from './lib/build/types';
