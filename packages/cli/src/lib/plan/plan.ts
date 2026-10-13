import { createHash } from 'node:crypto';
import type { ProjectFs } from '../project/fs';
import type { Formatter } from '../project/format';

/**
 * One file a command will create or change.
 */
export interface PlannedFile {
  /** Project-relative path. */
  path: string;
  /** Whether the file is new, changed or deleted. */
  action: 'create' | 'update' | 'delete';
  /** Current text, for updates and deletions. */
  before?: string;
  /** Full text to write, already formatted; empty for deletions. */
  after: string;
}

/**
 * A file a command left alone, and why.
 */
export interface SkippedFile {
  /** Project-relative path. */
  path: string;
  /** Why it wasn't written. */
  reason: string;
}

/**
 * Everything a write command would do (ADR-0011). An empty plan, with no
 * files and no dependencies, means the project is already up to date:
 * that's how re-running a command is a no-op.
 */
export interface Plan {
  /** Files to create or update. Unchanged files are left out. */
  files: PlannedFile[];
  /** npm packages to add, as `name` or `name@range`. */
  dependencies: string[];
  /** npm packages to add as dev dependencies. */
  devDependencies: string[];
  /** Files deliberately not written. */
  skipped: SkippedFile[];
  /** Things the user should know, such as a step to do by hand. */
  warnings: string[];
}

/**
 * The npm package name in a dependency spec.
 *
 * @param spec - `name` or `name@range`, scoped or not.
 * @returns The name alone.
 */
export function dependencyName(spec: string): string {
  return spec.replace(/(?<=.)@.*$/, '');
}

/**
 * SHA-256 of a text, as recorded in `ndop.lock.json`.
 *
 * @param content - File text.
 * @returns Lowercase hex digest.
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Options for {@link PlanBuilder.stage}.
 */
export interface StageOptions {
  /**
   * `false` stages the text as is, for files the CLI only partly owns,
   * where formatting would also change the user's text.
   */
  format?: boolean;
}

/**
 * Collects a command's changes before anything is written. Reads see
 * earlier staged changes, so several edits to one file chain; every staged
 * text is formatted at once, so {@link PlanBuilder.finish} compares exactly
 * what would be written with what is on disk.
 */
export class PlanBuilder {
  // null marks a file to delete.
  private readonly staged = new Map<string, string | null>();
  private readonly dependencies = new Set<string>();
  private readonly devDependencies = new Set<string>();
  private readonly replacements = new Set<string>();
  private readonly skipped: SkippedFile[] = [];
  private readonly warnings: string[] = [];

  /**
   * Starts an empty plan.
   *
   * @param fs - The project.
   * @param format - Formatter applied to every staged file.
   */
  constructor(
    readonly fs: ProjectFs,
    private readonly format: Formatter,
  ) {}

  /**
   * Reads a file as it will be after the changes staged so far.
   *
   * @param path - Project-relative path.
   * @returns The text, or `undefined` when it doesn't exist.
   */
  async read(path: string): Promise<string | undefined> {
    return this.staged.has(path)
      ? (this.staged.get(path) ?? undefined)
      : this.fs.read(path);
  }

  /**
   * Stages a file's deletion.
   *
   * @param path - Project-relative path.
   */
  remove(path: string): void {
    this.staged.set(path, null);
  }

  /**
   * Stages a file's new text.
   *
   * @param path - Project-relative path.
   * @param content - Full new text; it is formatted here.
   * @param options - How to stage it.
   * @returns The formatted text that will be written.
   */
  async stage(
    path: string,
    content: string,
    options: StageOptions = {},
  ): Promise<string> {
    const formatted =
      options.format === false ? content : await this.format(path, content);
    this.staged.set(path, formatted);
    return formatted;
  }

  /**
   * Formats a text as {@link PlanBuilder.stage} would, without staging it.
   *
   * @param path - Project-relative path, which picks the parser.
   * @param content - Text to format.
   * @returns The formatted text.
   */
  formatted(path: string, content: string): Promise<string> {
    return this.format(path, content);
  }

  /**
   * Requires npm packages; ones the project's `package.json` already lists
   * are dropped when the plan is finished, unless `replace` is set.
   *
   * @param specs - `name` or `name@range`.
   * @param dev - Whether they are dev dependencies.
   * @param replace - Install them even when listed, to move a package to
   *   another version.
   */
  depend(specs: readonly string[], dev = false, replace = false): void {
    for (const spec of specs) {
      (dev ? this.devDependencies : this.dependencies).add(spec);
      if (replace) this.replacements.add(spec);
    }
  }

  /**
   * Whether the project depends on a package once the plan is applied:
   * its `package.json` lists it, or the plan installs it. Text that names
   * the package's command, such as the agent files, reads this, so it
   * matches the project after the install the plan makes.
   *
   * @param name - Package name.
   * @returns True when it's, or will be, a dependency.
   */
  async dependsOn(name: string): Promise<boolean> {
    return (
      [...this.dependencies, ...this.devDependencies].some(
        (spec) => dependencyName(spec) === name,
      ) || (await this.installedPackages()).has(name)
    );
  }

  /**
   * Records a file deliberately left alone.
   *
   * @param path - Project-relative path.
   * @param reason - Why.
   */
  skip(path: string, reason: string): void {
    this.skipped.push({ path, reason });
  }

  /**
   * Records something the user should know.
   *
   * @param message - The warning.
   */
  warn(message: string): void {
    this.warnings.push(message);
  }

  /**
   * Compares staged files with the disk and drops what's unchanged.
   *
   * @returns The plan.
   */
  async finish(): Promise<Plan> {
    const files: PlannedFile[] = [];
    for (const [path, after] of this.staged) {
      const before = await this.fs.read(path);
      if (after === null) {
        if (before !== undefined) {
          files.push({ path, action: 'delete', before, after: '' });
        }
      } else if (before === undefined) {
        files.push({ path, action: 'create', after });
      } else if (before !== after) {
        files.push({ path, action: 'update', before, after });
      }
    }
    const installed = await this.installedPackages();
    const missing = (specs: Set<string>) =>
      [...specs]
        .filter(
          (spec) =>
            this.replacements.has(spec) || !installed.has(dependencyName(spec)),
        )
        .sort();
    return {
      files,
      dependencies: missing(this.dependencies),
      devDependencies: missing(this.devDependencies),
      skipped: this.skipped,
      warnings: this.warnings,
    };
  }

  /**
   * Package names the project's `package.json` lists in any dependency
   * field.
   *
   * @returns The names.
   */
  private async installedPackages(): Promise<Set<string>> {
    const text = await this.fs.read('package.json');
    if (!text) {
      return new Set();
    }
    const manifest = JSON.parse(text) as Record<
      string,
      Record<string, string> | undefined
    >;
    return new Set(
      ['dependencies', 'devDependencies', 'peerDependencies'].flatMap((field) =>
        Object.keys(manifest[field] ?? {}),
      ),
    );
  }
}

/**
 * Whether a plan changes nothing.
 *
 * @param plan - A finished plan.
 * @returns True when there is nothing to write or install.
 */
export function isEmptyPlan(plan: Plan): boolean {
  return (
    plan.files.length === 0 &&
    plan.dependencies.length === 0 &&
    plan.devDependencies.length === 0
  );
}
