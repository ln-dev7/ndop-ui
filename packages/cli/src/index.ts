/**
 * `@ndop/cli` as a library, for workspace tooling such as the
 * `registry-build` executor. The published package runs the `ndop` command
 * instead; see `main.ts`.
 *
 * @packageDocumentation
 */
export { buildRegistry } from './lib/build/build';
export { formatBuildResult } from './lib/build/report';
export { themeFromCss, type ThemeParts } from './lib/build/theme';
export type {
  BuildIssue,
  BuildOptions,
  BuildResult,
  SnapshotStatus,
} from './lib/build/types';
