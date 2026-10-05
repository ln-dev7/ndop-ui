import {
  ASTWithSource,
  LiteralPrimitive,
  type TmplAstBoundAttribute,
  type TmplAstTextAttribute,
} from '@angular-eslint/bundled-angular-compiler';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

/** A class list found in a template or in TypeScript. */
export interface ClassList {
  /** The classes, space-separated. */
  text: string;
  /** Offset of the list's first character in the file. */
  start: number;
}

/** Functions whose string arguments are class lists. */
const CLASS_FUNCTIONS = new Set(['cn', 'variants', 'clsx', 'cva', 'twMerge']);

/**
 * Visitors that find every class list a file sets, in templates and in
 * TypeScript: `class="…"`, `[class]="'…'"` and `[class.x]` bindings; and
 * string literals passed to `cn()`, `variants()` and similar, or set as a
 * `class` property, as in a directive's `host`.
 *
 * @param context - The rule context.
 * @param check - Called with each class list.
 * @returns The rule's visitors, for both parsers.
 */
export function classListVisitors(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
  check: (list: ClassList) => void,
): TSESLint.RuleListener {
  const fromLiteral = (node: TSESTree.Node, raw: string, start: number) => {
    if (inClassContext(node)) check({ text: raw, start });
  };
  return {
    ['TextAttribute[name="class"]'](attribute: TmplAstTextAttribute) {
      if (attribute.valueSpan) {
        check({
          text: attribute.value,
          start: attribute.valueSpan.start.offset,
        });
      }
    },
    ['BoundAttribute'](binding: TmplAstBoundAttribute) {
      if (binding.keySpan.toString().startsWith('class.')) {
        check({ text: binding.name, start: binding.keySpan.start.offset + 6 });
        return;
      }
      if (binding.name !== 'class') return;
      const ast =
        binding.value instanceof ASTWithSource ? binding.value.ast : undefined;
      if (ast instanceof LiteralPrimitive && typeof ast.value === 'string') {
        check({ text: ast.value, start: ast.sourceSpan.start + 1 });
      }
    },
    Literal(node: TSESTree.Literal) {
      // The raw text, quotes dropped, keeps offsets exact for fixes.
      if (typeof node.value === 'string') {
        fromLiteral(node, node.raw.slice(1, -1), node.range[0] + 1);
      }
    },
    TemplateElement(node: TSESTree.TemplateElement) {
      fromLiteral(node, node.value.raw, node.range[0] + 1);
    },
  };
}

/**
 * Whether a string sits where classes go: inside a class function's
 * arguments, or as the value of a `class` property.
 *
 * @param node - A string literal or template element.
 * @returns True for class lists.
 */
function inClassContext(node: TSESTree.Node): boolean {
  for (let current = node; current.parent; current = current.parent) {
    const parent: TSESTree.Node = current.parent;
    if (
      parent.type === 'CallExpression' &&
      parent.callee !== current &&
      parent.callee.type === 'Identifier' &&
      CLASS_FUNCTIONS.has(parent.callee.name)
    ) {
      return true;
    }
    if (
      parent.type === 'Property' &&
      parent.value === current &&
      ((parent.key.type === 'Identifier' && parent.key.name === 'class') ||
        (parent.key.type === 'Literal' && parent.key.value === 'class'))
    ) {
      return true;
    }
  }
  return false;
}
