import { classListVisitors } from '../lib/class-lists';
import { physicalClasses } from '../lib/classes';
import { createRule } from '../lib/create-rule';

/**
 * Flags physical direction utilities (`ml-2`, `pr-4`, `left-0`,
 * `text-left`, `rounded-l-md`) in templates and class strings, and fixes
 * them to their logical equivalents, which mirror in right-to-left layouts
 * (RFC-0001, ADR-0018).
 */
export const logicalProperties = createRule({
  name: 'logical-properties',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Use logical direction utilities, which mirror in right-to-left layouts.',
    },
    fixable: 'code',
    schema: [],
    messages: {
      physical:
        '`{{token}}` stays on one side in right-to-left layouts; use `{{fix}}`.',
    },
  },
  defaultOptions: [],
  create(context) {
    return classListVisitors(context, (list) => {
      for (const problem of physicalClasses(list.text)) {
        const start = list.start + problem.offset;
        const end = start + problem.token.length;
        context.report({
          loc: {
            start: context.sourceCode.getLocFromIndex(start),
            end: context.sourceCode.getLocFromIndex(end),
          },
          messageId: 'physical',
          data: { token: problem.token, fix: problem.fix ?? '' },
          fix: (fixer) =>
            fixer.replaceTextRange([start, end], problem.fix ?? problem.token),
        });
      }
    });
  },
});
