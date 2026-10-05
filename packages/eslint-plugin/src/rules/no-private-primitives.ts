import type { TSESTree } from '@typescript-eslint/utils';
import { CATALOG } from '../lib/catalog.generated';
import { createRule } from '../lib/create-rule';

/**
 * Flags imports from `@ndop/primitives` paths outside its public entry
 * points, such as `@ndop/primitives/internal` or a file inside an entry
 * point: they can change in any release (RFC-0001, ADR-0018).
 */
export const noPrivatePrimitives = createRule({
  name: 'no-private-primitives',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Import @ndop/primitives only through its public entry points.',
    },
    schema: [],
    messages: {
      private:
        '`{{source}}` is private to @ndop/primitives and can change in any release; import from one of its entry points, such as `@ndop/primitives/dialog`.',
    },
  },
  defaultOptions: [],
  create(context) {
    const check = (source: TSESTree.Node | null | undefined) => {
      if (
        source?.type === 'Literal' &&
        typeof source.value === 'string' &&
        /^@ndop\/primitives(\/|$)/.test(source.value) &&
        !CATALOG.primitiveEntryPoints.includes(source.value)
      ) {
        context.report({
          node: source,
          messageId: 'private',
          data: { source: source.value },
        });
      }
    };
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    };
  },
});
