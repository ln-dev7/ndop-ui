import type { TmplAstElement } from '@angular-eslint/bundled-angular-compiler';
import { getTemplateParserServices } from '@angular-eslint/utils';
import { CATALOG } from '../lib/catalog.generated';
import { createRule } from '../lib/create-rule';
import { attribute, isElement, matches, walk } from '../lib/template';
import { NAME_ATTRIBUTES } from './icon-button-name';

/**
 * Flags dialog panels, such as `ndDialogContent`, with no title part inside
 * them and no `aria-label`: the title names the dialog for screen readers
 * (RFC-0001, ADR-0018).
 */
export const dialogTitle = createRule({
  name: 'dialog-title',
  meta: {
    type: 'problem',
    docs: {
      description: 'Give every dialog a title.',
    },
    schema: [],
    messages: {
      missing:
        'This dialog has no {{title}}, so screen readers announce it without a name. Add one inside it.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Element(element: TmplAstElement) {
        const dialog = CATALOG.dialogs.find(({ content }) =>
          matches(element, [content]),
        );
        if (!dialog) return;
        if (NAME_ATTRIBUTES.some((name) => attribute(element, name))) return;
        let titled = false;
        walk(element.children, (node) => {
          titled ||= isElement(node) && matches(node, [dialog.title]);
        });
        if (titled) return;
        context.report({
          loc: getTemplateParserServices(context).convertElementSourceSpanToLoc(
            context,
            element,
          ),
          messageId: 'missing',
          data: { title: `\`${dialog.title}\`` },
        });
      },
    };
  },
});
