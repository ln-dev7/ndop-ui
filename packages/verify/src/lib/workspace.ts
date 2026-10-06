import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import type * as Ts from 'typescript';

/** An Angular application, as verify needs it. */
export interface AngularApp {
  /** Absolute workspace root, holding `angular.json`. */
  root: string;
  /** Project name. */
  project: string;
  /** Its source root, such as `src`. */
  sourceRoot: string;
}

/**
 * Finds the Angular workspace around a folder and picks the application.
 *
 * @param cwd - Folder to start from.
 * @param project - Application name, when there are several.
 * @returns The application.
 * @throws When there's no `angular.json`, or no single application.
 */
export async function findApp(
  cwd: string,
  project?: string,
): Promise<AngularApp> {
  let root = resolve(cwd);
  while (!(await exists(join(root, 'angular.json')))) {
    if (dirname(root) === root) {
      throw new Error(
        `No angular.json in ${resolve(cwd)} or above; run ndop verify inside an Angular workspace.`,
      );
    }
    root = dirname(root);
  }
  const workspace = JSON.parse(
    await readFile(join(root, 'angular.json'), 'utf-8'),
  ) as {
    projects?: Record<
      string,
      { projectType?: string; sourceRoot?: string; root?: string }
    >;
  };
  const apps = Object.entries(workspace.projects ?? {}).filter(
    ([, definition]) => definition.projectType === 'application',
  );
  const chosen = project
    ? apps.find(([name]) => name === project)
    : apps.length === 1
      ? apps[0]
      : undefined;
  if (!chosen) {
    throw new Error(
      project
        ? `angular.json has no application named "${project}".`
        : `angular.json has ${apps.length} applications; pick one with --project.`,
    );
  }
  const [name, definition] = chosen;
  return {
    root,
    project: name,
    sourceRoot: definition.sourceRoot ?? join(definition.root ?? '', 'src'),
  };
}

/**
 * The project's own TypeScript, so components parse the way its compiler
 * parses them.
 *
 * @param root - Workspace root.
 * @returns The TypeScript module.
 */
export function projectTypescript(root: string): typeof Ts {
  return createRequire(join(root, 'package.json'))('typescript') as typeof Ts;
}

/**
 * Whether a path exists.
 *
 * @param path - Absolute path.
 * @returns True when it does.
 */
export async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}
