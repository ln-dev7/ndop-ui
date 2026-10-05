import type { TmplAstElement } from '@angular-eslint/bundled-angular-compiler';
import type { TSESTree } from '@typescript-eslint/utils';
import { getTemplateParserServices } from '@angular-eslint/utils';
import { CATALOG } from '../lib/catalog.generated';
import { createRule } from '../lib/create-rule';
import {
  attribute,
  isElement,
  matches,
  staticValue,
  tagName,
  walk,
  type TemplateNode,
} from '../lib/template';
import { NAME_ATTRIBUTES } from './icon-button-name';

/**
 * Flags form controls, such as `ndInput`, that nothing labels: no label
 * whose `for` is their `id`, no enclosing label, and no `aria-label` or
 * `aria-labelledby` (RFC-0001, ADR-0018). Placeholders don't count.
 */
export const formControlLabel = createRule({
  name: 'form-control-label',
  meta: {
    type: 'problem',
    docs: {
      description: 'Label every form control.',
    },
    schema: [],
    messages: {
      unlabelled:
        'Nothing labels this control. Add an `ndLabel` with `for` set to its id, wrap it in a label, or give it aria-label.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Program(program: TSESTree.Program) {
        // The template parser's root holds the template's nodes.
        const roots =
          (program as unknown as { templateNodes?: TemplateNode[] })
            .templateNodes ?? [];
        const labelled = new Set<string>();
        let boundFor = false;
        const controls: { element: TmplAstElement; inLabel: boolean }[] = [];
        walk(roots, (node, ancestors) => {
          if (!isElement(node)) return;
          if (tagName(node) === 'label') {
            const target = attribute(node, 'for');
            const value = staticValue(target);
            // A bound `for` can point anywhere, so it labels every control.
            if (value !== undefined) labelled.add(value);
            else if (target) boundFor = true;
          }
          if (matches(node, CATALOG.controls)) {
            controls.push({
              element: node,
              inLabel: ancestors.some(
                (ancestor) => tagName(ancestor) === 'label',
              ),
            });
          }
        });
        for (const { element, inLabel } of controls) {
          const id = attribute(element, 'id');
          const staticId = staticValue(id);
          if (
            inLabel ||
            NAME_ATTRIBUTES.some((name) => attribute(element, name)) ||
            staticValue(attribute(element, 'type')) === 'hidden' ||
            (staticId !== undefined && labelled.has(staticId)) ||
            (id && staticId === undefined) ||
            boundFor
          ) {
            continue;
          }
          context.report({
            loc: getTemplateParserServices(
              context,
            ).convertElementSourceSpanToLoc(context, element),
            messageId: 'unlabelled',
          });
        }
      },
    };
  },
});
