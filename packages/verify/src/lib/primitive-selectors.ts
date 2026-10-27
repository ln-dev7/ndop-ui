import { dirname } from 'node:path';
import type * as Ts from 'typescript';

/**
 * Reads actual Angular selectors from primitive entry points imported by the
 * checked source graph. Registry metadata intentionally describes styled
 * exports; behavior-only imports now come directly from the installed package.
 * No package code is executed and unresolved imports supply no guessed names.
 * Angular's build remains responsible for primitive input/type validation.
 *
 * @param ts - The application's TypeScript installation.
 * @param files - Absolute paths of the checked source files.
 * @param root - Application root, for its TypeScript path aliases.
 * @returns Selectors exported by the imported primitive entry points.
 */
export function primitiveSelectors(
  ts: typeof Ts,
  files: readonly string[],
  root: string,
): string[] {
  if (!files.length) return [];
  const configPath = ts.findConfigFile(root, ts.sys.fileExists);
  const config = configPath
    ? ts.parseJsonConfigFileContent(
        ts.readConfigFile(configPath, ts.sys.readFile).config,
        ts.sys,
        dirname(configPath),
      ).options
    : {};
  const program = ts.createProgram([...files], {
    ...config,
    module: config.module ?? ts.ModuleKind.ESNext,
    moduleResolution:
      config.moduleResolution ?? ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    skipLibCheck: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const seen = new Set<Ts.Symbol>();
  const selectors = new Set<string>();
  for (const source of program.getSourceFiles()) {
    if (source.isDeclarationFile) continue;
    for (const statement of source.statements) {
      if (
        (!ts.isImportDeclaration(statement) &&
          !ts.isExportDeclaration(statement)) ||
        !statement.moduleSpecifier ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.startsWith('@ndop/primitives/')
      ) {
        continue;
      }
      const module = checker.getSymbolAtLocation(statement.moduleSpecifier);
      if (!module || seen.has(module)) continue;
      seen.add(module);
      for (const exported of checker.getExportsOfModule(module)) {
        const symbol =
          exported.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(exported)
            : exported;
        for (const declaration of symbol.declarations ?? []) {
          if (!ts.isClassDeclaration(declaration)) continue;
          for (const member of declaration.members) {
            if (
              !ts.isPropertyDeclaration(member) ||
              member.name.getText() !== 'ɵdir' ||
              !member.type ||
              !ts.isTypeReferenceNode(member.type)
            ) {
              continue;
            }
            const name = member.type.typeName;
            const typeName = ts.isIdentifier(name)
              ? name.text
              : name.right.text;
            const selector = member.type.typeArguments?.[1];
            if (
              typeName === 'ɵɵDirectiveDeclaration' &&
              selector &&
              ts.isLiteralTypeNode(selector) &&
              ts.isStringLiteral(selector.literal)
            ) {
              selectors.add(selector.literal.text);
            }
          }
        }
      }
    }
  }
  return [...selectors].sort();
}
