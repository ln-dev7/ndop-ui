import { posix } from 'node:path';
import type { RegistryItem } from '@ndop/schema';
import { Node, Project, type SourceFile } from 'ts-morph';
import { packageName } from './theme';
import type { BuildIssue } from './types';

/**
 * Parses TypeScript files without resolving or type-checking them, which is
 * all the import and export checks need; `ngc` does the type-checking.
 *
 * @returns A ts-morph project on an in-memory file system.
 */
export function sourceProject(): Project {
  return new Project({
    useInMemoryFileSystem: true,
    skipFileDependencyResolution: true,
  });
}

/**
 * Checks every import in an item's TypeScript files against the dependency
 * rules (ADR-0012). Allowed:
 *
 * - `@angular/*`, which every Angular app already has;
 * - packages in the item's `dependencies`;
 * - relative imports of the item's own files;
 * - `@/` imports of files belonging to the item or to an item in its
 *   `registryDependencies`, installed where the same `@/` path finds them.
 *
 * @param item - The item, with file contents loaded.
 * @param byName - Every item in the manifest, by name.
 * @param project - Project from {@link sourceProject}.
 * @returns Issues found; empty when every import is allowed.
 */
export function checkImports(
  item: RegistryItem,
  byName: ReadonlyMap<string, RegistryItem>,
  project: Project,
): BuildIssue[] {
  const issues: BuildIssue[] = [];
  const packages = new Set(
    (item.dependencies ?? []).map((dependency) =>
      dependency.replace(/(?<=.)@.*$/, ''),
    ),
  );
  const ownFiles = new Map((item.files ?? []).map((file) => [file.path, file]));
  const reachable = new Map(ownFiles);
  for (const name of item.registryDependencies ?? []) {
    for (const file of byName.get(name)?.files ?? []) {
      reachable.set(file.path, file);
    }
  }

  for (const file of item.files ?? []) {
    if (!file.path.endsWith('.ts')) {
      continue;
    }
    const source = parse(project, file.path, file.content ?? '');
    for (const literal of source.getImportStringLiterals()) {
      const specifier = literal.getLiteralValue();
      const problem = importProblem(specifier, file.path, {
        packages,
        ownFiles,
        reachable,
      });
      if (problem) {
        issues.push({
          item: item.name,
          file: file.path,
          message: `Line ${literal.getStartLineNumber()}: "${specifier}" ${problem}`,
        });
      }
    }
  }
  return issues;
}

/**
 * What one item's files may import.
 */
interface ImportScope {
  /** Package names from the item's `dependencies`. */
  packages: ReadonlySet<string>;
  /** The item's own files, by path. */
  ownFiles: ReadonlyMap<string, unknown>;
  /** Files of the item and of its registry dependencies, by path. */
  reachable: ReadonlyMap<string, { path: string; target: string }>;
}

/**
 * Explains why one import breaks the rules.
 *
 * @param specifier - The module specifier.
 * @param from - Registry-relative path of the importing file.
 * @param scope - What the item may import.
 * @returns The reason, or `undefined` when the import is allowed.
 */
function importProblem(
  specifier: string,
  from: string,
  scope: ImportScope,
): string | undefined {
  if (specifier.startsWith('.')) {
    const target = candidates(posix.join(posix.dirname(from), specifier)).find(
      (path) => scope.ownFiles.has(path),
    );
    return target ? undefined : "is not one of this item's files.";
  }
  if (specifier.startsWith('@/')) {
    const path = specifier.slice(2);
    const target = candidates(path)
      .map((candidate) => scope.reachable.get(candidate))
      .find(Boolean);
    if (!target) {
      return 'is not a file of this item or of its registryDependencies.';
    }
    // Installed files keep `@/` imports unchanged, which only works when the
    // file lands where the same `@/` path points.
    const [root, ...rest] = target.path.split('/');
    if (target.target !== `{${root}}/${rest.join('/')}`) {
      return `points at ${target.path}, whose target ${target.target} isn't {${root}}/${rest.join('/')}.`;
    }
    return undefined;
  }
  if (specifier.startsWith('@angular/')) {
    return undefined;
  }
  return scope.packages.has(packageName(specifier))
    ? undefined
    : `needs "${packageName(specifier)}" in the item's dependencies.`;
}

/**
 * Files an extensionless specifier may refer to.
 *
 * @param path - Normalized path without extension.
 * @returns Candidate file paths, in TypeScript's resolution order.
 */
function candidates(path: string): string[] {
  const normalized = posix.normalize(path);
  return [normalized, `${normalized}.ts`, `${normalized}/index.ts`];
}

/**
 * Checks that every name in `angular.exports` is exported by one of the
 * item's files, so the docs and agents never point at a missing symbol.
 *
 * @param item - The item, with file contents loaded.
 * @param project - Project from {@link sourceProject}.
 * @returns Issues found; empty when every export exists.
 */
export function checkExports(
  item: RegistryItem,
  project: Project,
): BuildIssue[] {
  const exported = new Set<string>();
  for (const file of item.files ?? []) {
    if (file.path.endsWith('.ts')) {
      for (const name of exportedNames(
        parse(project, file.path, file.content ?? ''),
      )) {
        exported.add(name);
      }
    }
  }
  return (item.angular?.exports ?? [])
    .filter((name) => !exported.has(name))
    .map((name) => ({
      item: item.name,
      message: `angular.exports lists "${name}", which no file of the item exports.`,
    }));
}

/**
 * Names a file exports, read from its syntax alone: exported declarations
 * and `export { … }` lists, including re-exports.
 *
 * @param source - A parsed file.
 * @returns Exported names.
 */
function exportedNames(source: SourceFile): string[] {
  const names: string[] = [];
  for (const statement of source.getStatements()) {
    if (Node.isExportDeclaration(statement)) {
      for (const specifier of statement.getNamedExports()) {
        names.push(specifier.getAliasNode()?.getText() ?? specifier.getName());
      }
    } else if (Node.isVariableStatement(statement)) {
      if (statement.isExported()) {
        names.push(...statement.getDeclarations().map((d) => d.getName()));
      }
    } else if (
      (Node.isClassDeclaration(statement) ||
        Node.isFunctionDeclaration(statement) ||
        Node.isInterfaceDeclaration(statement) ||
        Node.isTypeAliasDeclaration(statement) ||
        Node.isEnumDeclaration(statement)) &&
      statement.isExported()
    ) {
      const name = statement.getName();
      if (name) {
        names.push(name);
      }
    }
  }
  return names;
}

/**
 * Parses a file into the project, replacing any earlier copy.
 *
 * @param project - Project from {@link sourceProject}.
 * @param path - Registry-relative path.
 * @param content - File text.
 * @returns The parsed file.
 */
function parse(project: Project, path: string, content: string): SourceFile {
  return project.createSourceFile(`/${path}`, content, { overwrite: true });
}
