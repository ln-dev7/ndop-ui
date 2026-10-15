import { readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type * as Ts from 'typescript';

/** A component template, with where its text sits in a file. */
export interface TemplateSource {
  /** The template's text. */
  text: string;
  /** Project-relative path of the file holding it. */
  file: string;
  /** Line and column, 0-based, of the template's first character. */
  start: { line: number; column: number };
}

/** A component found in a checked file. */
export interface FoundComponent {
  /** Class name. */
  name: string;
  /** Project-relative path of its `.ts` file. */
  file: string;
  /** Whether the file exports it, so the harness can import it. */
  exported: boolean;
  /** Its template, if it has one verify can read. */
  template?: TemplateSource;
  /** Names of its required inputs, which the harness can't fill in. */
  requiredInputs: string[];
  /** Project-relative paths of its `styleUrl` and `styleUrls` stylesheets. */
  stylesheets: string[];
}

/**
 * Finds the components a file declares, with their templates, required
 * inputs and stylesheets, by parsing it with the project's TypeScript.
 *
 * @param ts - The project's TypeScript.
 * @param root - Workspace root.
 * @param file - Absolute path of a `.ts` file.
 * @returns The components, in source order.
 */
export async function findComponents(
  ts: typeof Ts,
  root: string,
  file: string,
): Promise<FoundComponent[]> {
  const text = await readFile(file, 'utf-8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found: FoundComponent[] = [];
  for (const statement of source.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name) continue;
    const decorator = ts
      .getDecorators(statement)
      ?.find(
        (candidate) =>
          ts.isCallExpression(candidate.expression) &&
          ts.isIdentifier(candidate.expression.expression) &&
          candidate.expression.expression.text === 'Component',
      );
    if (!decorator || !ts.isCallExpression(decorator.expression)) continue;
    const [argument] = decorator.expression.arguments;
    const config =
      argument && ts.isObjectLiteralExpression(argument) ? argument : undefined;
    const property = (name: string) =>
      config?.properties.find(
        (node): node is Ts.PropertyAssignment =>
          ts.isPropertyAssignment(node) && node.name.getText(source) === name,
      )?.initializer;

    let template: TemplateSource | undefined;
    const inline = property('template');
    const url = property('templateUrl');
    if (inline && ts.isStringLiteralLike(inline)) {
      const position = source.getLineAndCharacterOfPosition(
        inline.getStart(source) + 1,
      );
      template = {
        text: inline.text,
        file: relative(root, file),
        start: { line: position.line, column: position.character },
      };
    } else if (url && ts.isStringLiteralLike(url)) {
      const path = join(dirname(file), url.text);
      template = {
        text: await readFile(path, 'utf-8'),
        file: relative(root, path),
        start: { line: 0, column: 0 },
      };
    }

    const styleUrls = property('styleUrls');
    const stylesheets = [
      property('styleUrl'),
      ...(styleUrls && ts.isArrayLiteralExpression(styleUrls)
        ? styleUrls.elements
        : []),
    ].flatMap((node) =>
      node && ts.isStringLiteralLike(node)
        ? [relative(root, join(dirname(file), node.text))]
        : [],
    );

    const requiredInputs = statement.members.flatMap((member) => {
      if (!ts.isPropertyDeclaration(member) || !member.initializer) return [];
      const call = member.initializer;
      return ts.isCallExpression(call) &&
        ts.isPropertyAccessExpression(call.expression) &&
        call.expression.name.text === 'required' &&
        ts.isIdentifier(call.expression.expression) &&
        ['input', 'model'].includes(call.expression.expression.text)
        ? [member.name.getText(source)]
        : [];
    });

    found.push({
      name: statement.name.text,
      file: relative(root, file),
      exported:
        ts
          .getModifiers(statement)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
        false,
      ...(template ? { template } : {}),
      requiredInputs,
      stylesheets,
    });
  }
  return found;
}
