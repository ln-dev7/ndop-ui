import {
  ASTWithSource,
  LiteralMap,
  LiteralPrimitive,
  type AST,
  type TmplAstBoundAttribute,
  type TmplAstTextAttribute,
} from '@angular-eslint/bundled-angular-compiler';
import type { TSESTree } from '@typescript-eslint/utils';
import { classListVisitors } from '../lib/class-lists';
import { rawColorClasses } from '../lib/classes';
import { colorLiterals } from '../lib/colors';
import { createRule } from '../lib/create-rule';
import { stylesheetColors, type StylesheetColor } from '../lib/css';

/** Template bindings whose value is a whole `style`. */
const STYLE_OBJECTS = new Set(['style', 'ngStyle']);

/**
 * Flags colors that bypass the theme's tokens, so they don't follow dark
 * mode or a theme change (RFC-0001, ADR-0018 and its amendment 1):
 *
 * - Tailwind palette colors (`bg-red-500`), arbitrary color values
 *   (`text-[#333]`, `shadow-[0_0_0_1px_red]`) and arbitrary color
 *   properties (`[color:#fff]`), in templates and class strings;
 * - color literals in `style` attributes, `[style.color]`, `[style]` and
 *   `[ngStyle]` bindings;
 * - color literals and custom properties defined with a color
 *   (`--ink: #18332d`) in a component's inline `styles`.
 *
 * `ndop verify` applies the same check to stylesheet files.
 */
export const noRawColors = createRule({
  name: 'no-raw-colors',
  meta: {
    type: 'problem',
    docs: {
      description:
        "Use the theme's color tokens instead of palette colors, color literals or a palette of your own.",
    },
    schema: [],
    messages: {
      raw: "`{{token}}` bypasses the theme's tokens; use a token such as `bg-primary`, `text-muted-foreground` or `border-border`.",
      literal:
        "`{{color}}` is a color outside the theme's tokens; use a token: `bg-primary`, `text-muted-foreground` or `border-border` in classes, `var(--primary)` in CSS.",
      palette:
        "`{{name}}` defines its own color (`{{color}}`), a palette beside the theme's; use the theme's tokens, such as `var(--primary)` or `bg-primary`, or add the color to the theme in the Tailwind stylesheet or a stylesheet it imports.",
    },
  },
  defaultOptions: [],
  create(context) {
    const report = (start: number, length: number, color: StylesheetColor) => {
      const loc = {
        start: context.sourceCode.getLocFromIndex(start),
        end: context.sourceCode.getLocFromIndex(start + length),
      };
      if (color.kind === 'palette') {
        context.report({
          loc,
          messageId: 'palette',
          data: { name: color.text, color: color.color ?? '' },
        });
      } else if (color.kind === 'class') {
        context.report({ loc, messageId: 'raw', data: { token: color.text } });
      } else {
        context.report({
          loc,
          messageId: 'literal',
          data: { color: color.text },
        });
      }
    };
    const checkCss = (css: string, start: number) => {
      for (const color of stylesheetColors(css)) {
        report(start + color.offset, color.text.length, color);
      }
    };
    const checkValue = (value: string, property: string, start: number) => {
      const literals = colorLiterals(value, property);
      if (property.startsWith('--') && literals.length) {
        report(start, value.length, {
          kind: 'palette',
          text: property,
          color: literals.map((literal) => literal.text).join(', '),
          offset: 0,
        });
        return;
      }
      for (const literal of literals) {
        report(start + literal.offset, literal.text.length, {
          kind: 'literal',
          text: literal.text,
          offset: 0,
        });
      }
    };
    // Every string literal of a bound expression, wherever it sits, with
    // the style property it sets when a map key names one.
    const checkExpression = (node: AST, property: string | undefined) => {
      if (node instanceof LiteralPrimitive) {
        if (typeof node.value === 'string') {
          const start = node.sourceSpan.start + 1;
          if (property) checkValue(node.value, property, start);
          else checkCss(node.value, start);
        }
        return;
      }
      if (node instanceof LiteralMap) {
        node.keys.forEach((key, index) => {
          const value = node.values[index];
          if (value) {
            checkExpression(
              value,
              key.kind === 'property' ? key.key.split('.')[0] : undefined,
            );
          }
        });
        return;
      }
      for (const [key, child] of Object.entries(node)) {
        // ESLint's traversal adds `parent`, which would walk back up.
        if (key === 'parent') continue;
        for (const item of Array.isArray(child) ? child : [child]) {
          if (item && typeof item === 'object' && 'sourceSpan' in item) {
            checkExpression(item as AST, property);
          }
        }
      }
    };

    const classes = classListVisitors(context, (list) => {
      for (const problem of rawColorClasses(list.text)) {
        report(list.start + problem.offset, problem.token.length, {
          kind: 'class',
          text: problem.token,
          offset: 0,
        });
      }
    });
    const classBinding = classes['BoundAttribute'] as (
      binding: TmplAstBoundAttribute,
    ) => void;

    return {
      ...classes,
      ['TextAttribute[name="style"]'](attribute: TmplAstTextAttribute) {
        if (attribute.valueSpan) {
          checkCss(attribute.value, attribute.valueSpan.start.offset);
        }
      },
      ['BoundAttribute'](binding: TmplAstBoundAttribute) {
        classBinding(binding);
        const key = binding.keySpan.toString();
        const ast =
          binding.value instanceof ASTWithSource
            ? binding.value.ast
            : binding.value;
        if (key.startsWith('style.')) {
          checkExpression(ast, key.slice(6).split('.')[0]);
        } else if (STYLE_OBJECTS.has(key)) {
          checkExpression(ast, undefined);
        }
      },
      ['Property[key.name="styles"]'](node: TSESTree.Property) {
        if (!inComponentDecorator(node)) return;
        const values =
          node.value.type === 'ArrayExpression'
            ? node.value.elements
            : [node.value];
        for (const value of values) {
          if (value?.type === 'Literal' && typeof value.value === 'string') {
            checkCss(value.raw.slice(1, -1), value.range[0] + 1);
          } else if (
            value?.type === 'TemplateLiteral' &&
            value.expressions.length === 0 &&
            value.quasis[0]
          ) {
            checkCss(value.quasis[0].value.raw, value.quasis[0].range[0] + 1);
          }
        }
      },
    };
  },
});

/**
 * Whether a property belongs to the object passed to `@Component()`.
 *
 * @param node - A property.
 * @returns True for component metadata.
 */
function inComponentDecorator(node: TSESTree.Property): boolean {
  const call = node.parent.parent;
  return (
    node.parent.type === 'ObjectExpression' &&
    call?.type === 'CallExpression' &&
    call.callee.type === 'Identifier' &&
    call.callee.name === 'Component'
  );
}
