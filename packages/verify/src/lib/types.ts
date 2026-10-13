import type { Metadata } from '@ndop/metadata';

/** The checks `ndop verify` runs, in order (ADR-0018). */
export type StepName = 'usage' | 'build' | 'lint' | 'render';

/** One problem, pointing at a file, a line and a rule. */
export interface Problem {
  /** Project-relative path. */
  file: string;
  /** 1-based line. */
  line: number;
  /** 1-based column. */
  column: number;
  /** Namespaced rule, such as `usage/unknown-input`, `build/TS2322`, `ndop/dialog-title` or `axe/button-name`. */
  rule: string;
  /** Errors fail verify; warnings don't. */
  severity: 'error' | 'warning';
  /** What's wrong. */
  message: string;
  /** How to fix it, when known. */
  fix?: string;
}

/** How one step went. */
export interface StepResult {
  /** The step. */
  name: StepName;
  /** Whether it found no errors. */
  ok: boolean;
  /** Why it didn't run, when it didn't. */
  skipped?: string;
  /** How long it took. */
  durationMs: number;
}

/** What `ndop verify --json` prints. */
export interface VerifyResult {
  /** Whether no step found an error. */
  ok: boolean;
  /** Each step, in order. */
  steps: StepResult[];
  /** Every problem, errors first. */
  problems: Problem[];
  /** Project-relative paths of the screenshots taken. */
  screenshots: string[];
}

/** A component's metadata, with its registry name. */
export interface ComponentDoc {
  /** Registry item name, such as `dialog`. */
  name: string;
  /** Its `metadata/<name>.json`. */
  metadata: Metadata;
}

/**
 * Where verify reads component metadata from: the registry the project
 * installs from. The CLI and the MCP server provide it, each through its
 * own registry access.
 */
export interface MetadataSource {
  /** Metadata of the components the lockfile lists. */
  installed(): Promise<ComponentDoc[]>;
  /** Metadata of every component the registry offers. */
  available(): Promise<ComponentDoc[]>;
}

/** Options of {@link verify}. */
export interface VerifyOptions {
  /** Folder to start from; the Angular workspace is found here or above. */
  cwd: string;
  /** Files or folders to check, relative to `cwd`. */
  paths: string[];
  /** Component metadata. */
  metadata: MetadataSource;
  /** Steps not to run. */
  skip?: StepName[];
  /** Angular project, when `angular.json` has several applications. */
  project?: string;
  /** The command that installs an item, for fixes; `npx @ndop/cli add <name>` by default. */
  addCommand?: (name: string) => string;
}
