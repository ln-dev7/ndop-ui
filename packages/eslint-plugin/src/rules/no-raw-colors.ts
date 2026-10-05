import { classListVisitors } from '../lib/class-lists';
import { rawColorClasses } from '../lib/classes';
import { createRule } from '../lib/create-rule';

/**
 * Flags Tailwind palette colors (`bg-red-500`) and arbitrary color values
 * (`text-[#333]`) in templates and class strings: they bypass the theme's
 * tokens, so they don't follow dark mode or a theme change (RFC-0001,
 * ADR-0018).
 */
export const noRawColors = createRule({
  name: 'no-raw-colors',
  meta: {
    type: 'problem',
    docs: {
      description:
        "Use the theme's color tokens instead of palette colors or arbitrary color values.",
    },
    schema: [],
    messages: {
      raw: "`{{token}}` bypasses the theme's tokens; use a token such as `bg-primary`, `text-muted-foreground` or `border-border`.",
    },
  },
  defaultOptions: [],
  create(context) {
    return classListVisitors(context, (list) => {
      for (const problem of rawColorClasses(list.text)) {
        const start = list.start + problem.offset;
        context.report({
          loc: {
            start: context.sourceCode.getLocFromIndex(start),
            end: context.sourceCode.getLocFromIndex(
              start + problem.token.length,
            ),
          },
          messageId: 'raw',
          data: { token: problem.token },
        });
      }
    });
  },
});
