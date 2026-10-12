import { posix } from 'node:path';
import {
  type ArrayLiteralExpression,
  IndentationText,
  Node,
  Project,
  QuoteKind,
  type SourceFile,
  ts,
} from 'ts-morph';

/**
 * Parses one file for editing, without resolving its imports.
 *
 * @param path - Project-relative path.
 * @param text - File text.
 * @returns The source file.
 */
function parse(path: string, text: string): SourceFile {
  // Angular's style, so edits read well in projects without Prettier.
  return new Project({
    useInMemoryFileSystem: true,
    skipFileDependencyResolution: true,
    manipulationSettings: {
      quoteKind: QuoteKind.Single,
      indentationText: IndentationText.TwoSpaces,
    },
  }).createSourceFile(`/${path}`, text);
}

/**
 * A provider call to register in `app.config.ts`, and where its function
 * comes from.
 */
export interface ProviderCall {
  /** Function name, such as `provideNdop`. */
  name: string;
  /** Module specifier to import it from. */
  module: string;
}

/**
 * Adds provider calls to the `providers` array of an `ApplicationConfig`
 * object literal (`appConfig` in a standard `app.config.ts`), with their
 * imports. A provider whose function is already called is left alone.
 *
 * @param path - Project-relative path of the file.
 * @param text - File text.
 * @param providers - Calls to add, in order.
 * @returns The edited text, or `undefined` when the file has no
 *   `providers` array literal to edit.
 */
export function addProviders(
  path: string,
  text: string,
  providers: readonly ProviderCall[],
): string | undefined {
  const source = parse(path, text);
  const array = providersArray(source);
  if (!array) {
    return undefined;
  }

  for (const provider of providers) {
    const called = array
      .getElements()
      .some(
        (element) =>
          Node.isCallExpression(element) &&
          element.getExpression().getText() === provider.name,
      );
    if (!called) {
      array.addElement(`${provider.name}()`);
    }
    addNamedImport(source, provider.name, provider.module);
  }
  return source.getFullText();
}

/**
 * The functions called in the `providers` array of an `ApplicationConfig`
 * object literal, as {@link addProviders} finds it.
 *
 * @param path - Project-relative path of the file.
 * @param text - File text.
 * @returns The called names, such as `provideNdop`, or `undefined` when
 *   the file has no `providers` array literal.
 */
export function providerCalls(
  path: string,
  text: string,
): string[] | undefined {
  return providersArray(parse(path, text))
    ?.getElements()
    .flatMap((element) =>
      Node.isCallExpression(element) ? [element.getExpression().getText()] : [],
    );
}

/**
 * Finds the `providers` array literal of the app config: the `appConfig`
 * variable, or else one typed `ApplicationConfig`.
 *
 * @param source - The parsed file.
 * @returns The array, or `undefined`.
 */
function providersArray(
  source: SourceFile,
): ArrayLiteralExpression | undefined {
  const declarations = source.getVariableDeclarations();
  const config =
    declarations.find((declaration) => declaration.getName() === 'appConfig') ??
    declarations.find((declaration) =>
      declaration.getTypeNode()?.getText().includes('ApplicationConfig'),
    );
  const literal = config?.getInitializer();
  if (!literal || !Node.isObjectLiteralExpression(literal)) {
    return undefined;
  }
  const property = literal.getProperty('providers');
  const array =
    property && Node.isPropertyAssignment(property)
      ? property.getInitializer()
      : undefined;
  return array && Node.isArrayLiteralExpression(array) ? array : undefined;
}

/**
 * Imports a name, reusing an existing import of the same module.
 *
 * @param source - File to edit.
 * @param name - Exported name.
 * @param module - Module specifier.
 */
function addNamedImport(
  source: SourceFile,
  name: string,
  module: string,
): void {
  const existing = source.getImportDeclaration(
    (declaration) => declaration.getModuleSpecifierValue() === module,
  );
  if (!existing) {
    source.addImportDeclaration({
      namedImports: [name],
      moduleSpecifier: module,
    });
  } else if (
    !existing
      .getNamedImports()
      .some((specifier) => specifier.getName() === name)
  ) {
    existing.addNamedImport(name);
  }
}

/**
 * Rewrites module specifiers in a file. Strings and comments are never
 * touched, only import, export and dynamic import specifiers.
 *
 * @param path - Project-relative path of the file.
 * @param text - File text.
 * @param rewrite - Returns a new specifier, or `undefined` to keep it.
 * @returns The edited text; the same text when nothing changed.
 */
export function rewriteSpecifiers(
  path: string,
  text: string,
  rewrite: (specifier: string) => string | undefined,
): string {
  const source = parse(path, text);
  let changed = false;
  for (const literal of source.getImportStringLiterals()) {
    const next = rewrite(literal.getLiteralValue());
    if (next !== undefined && next !== literal.getLiteralValue()) {
      literal.setLiteralValue(next);
      changed = true;
    }
  }
  return changed ? source.getFullText() : text;
}

/**
 * The module specifiers a file imports or re-exports, statically or with
 * dynamic `import()`. Specifiers in strings and comments, such as code in
 * a TSDoc example, aren't counted.
 *
 * @param text - File text.
 * @returns The specifiers, in order, once each.
 */
export function importSpecifiers(text: string): string[] {
  // TypeScript's import scanner, without building a program: doctor runs
  // it on every installed file.
  return [
    ...new Set(
      ts
        .preProcessFile(text, true, true)
        .importedFiles.map((file) => file.fileName),
    ),
  ];
}

/**
 * A relative module specifier from one file to another, without the `.ts`
 * extension, as TypeScript expects.
 *
 * @param from - Project-relative path of the importing file.
 * @param to - Project-relative path of the imported file.
 * @returns A specifier starting with `./` or `../`.
 */
export function relativeSpecifier(from: string, to: string): string {
  const relative = posix
    .relative(posix.dirname(from), to)
    .replace(/(\/index)?\.ts$/, '');
  return relative.startsWith('.') ? relative : `./${relative}`;
}
