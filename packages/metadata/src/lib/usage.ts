import type * as Ts from 'typescript';

/**
 * The smallest correct usage of an item, as stored in its metadata's
 * `usage`.
 */
export interface Usage {
  /** The example's `@/ui/` imports, one statement per line. */
  imports: string;
  /** The example component's template, flush left. */
  template: string;
}

/**
 * The smallest correct usage of an item, taken from its main example: the
 * imports of the item's parts and the component's template.
 *
 * @param ts - The TypeScript module, loaded by the caller.
 * @param source - The main example's source.
 * @returns The imports and the template.
 *
 * @example
 * ```ts
 * usageOf(ts, exampleSource);
 * // { imports: "import { Button } from '@/ui/button/button';", template: '<button ndButton>Save</button>' }
 * ```
 */
export function usageOf(ts: typeof Ts, source: string): Usage {
  const file = ts.createSourceFile(
    'example.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = file.statements
    .filter(
      (statement): statement is Ts.ImportDeclaration =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text.startsWith('@/ui/'),
    )
    .map((statement) => statement.getText(file))
    .join('\n');
  let template = '';
  const visit = (node: Ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(file) === 'template' &&
      ts.isNoSubstitutionTemplateLiteral(node.initializer)
    ) {
      template = dedent(node.initializer.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { imports, template };
}

/**
 * Removes a block's common indentation and its blank first and last lines.
 *
 * @param text - Indented text.
 * @returns The text, flush left.
 */
function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const indent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => /^ */.exec(line)?.[0].length ?? 0),
  );
  return lines.map((line) => line.slice(indent)).join('\n');
}
