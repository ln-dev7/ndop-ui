import { Project, ts } from 'ts-morph';

/**
 * TypeScript errors a merge introduced into a file: errors in `merged`
 * that `local` doesn't have, compared by code and message (ADR-0003,
 * amendment 1). The file is checked on its own, so errors from imports it
 * can't resolve show up on both sides and cancel out, while a duplicate
 * object key or class member, which a union of insertions can create,
 * doesn't.
 *
 * @param path - Project-relative path, which picks the file kind.
 * @param local - The file before the merge.
 * @param merged - The merged file.
 * @returns The new errors' messages; empty when the merge added none.
 *
 * @example
 * ```ts
 * if (newTypeErrors(path, local, outcome.content).length > 0) {
 *   // merge again without the union
 * }
 * ```
 */
export function newTypeErrors(
  path: string,
  local: string,
  merged: string,
): string[] {
  const before = errorsOf(path, local);
  const added: string[] = [];
  for (const error of errorsOf(path, merged)) {
    const index = before.indexOf(error);
    if (index === -1) added.push(error);
    else before.splice(index, 1);
  }
  return added;
}

/**
 * Type-checks one file in isolation.
 *
 * @param path - Project-relative path.
 * @param text - File text.
 * @returns Each error as `TS<code>: <message>`.
 */
function errorsOf(path: string, text: string): string[] {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: true,
    },
  });
  const file = project.createSourceFile(`/${path}`, text);
  return file
    .getPreEmitDiagnostics()
    .filter(
      (diagnostic) => diagnostic.getCategory() === ts.DiagnosticCategory.Error,
    )
    .map(
      (diagnostic) =>
        `TS${diagnostic.getCode()}: ${ts.flattenDiagnosticMessageText(diagnostic.getMessageText() as string | ts.DiagnosticMessageChain, '\n')}`,
    );
}
