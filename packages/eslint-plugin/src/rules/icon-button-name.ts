import type { TmplAstElement } from '@angular-eslint/bundled-angular-compiler';
import { getTemplateParserServices } from '@angular-eslint/utils';
import { CATALOG } from '../lib/catalog.generated';
import { createRule } from '../lib/create-rule';
import {
  attribute,
  childrenOf,
  isElement,
  matches,
  staticValue,
  tagName,
  type TemplateNode,
} from '../lib/template';

/** Attributes and bindings that give an element an accessible name. */
export const NAME_ATTRIBUTES = [
  'aria-label',
  'aria-labelledby',
  'arialabel',
  'arialabelledby',
];

/** Elements whose text is the button's text. */
const PHRASING = new Set([
  'abbr',
  'b',
  'bdi',
  'bdo',
  'code',
  'data',
  'del',
  'em',
  'i',
  'ins',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
  'div',
]);

/** What a button's content gives it. */
interface Content {
  /** Whether it has visible or visually hidden text. */
  text: boolean;
  /** How many icons it has. */
  icons: number;
  /** Whether it has content the rule can't see into, such as a component. */
  unknown: boolean;
}

/**
 * Whether an element is an icon: an `svg`, an `ndIcon`, or an icon
 * component such as `<lucide-icon>`.
 *
 * @param element - A template element.
 * @returns True for icons.
 */
function isIcon(element: TmplAstElement): boolean {
  const name = tagName(element);
  return (
    name === 'svg' ||
    attribute(element, 'ndicon') !== undefined ||
    /(^lucide-|-icon$|^icon$)/.test(name)
  );
}

/**
 * Describes a button's content.
 *
 * @param nodes - Its child nodes.
 * @param content - Accumulates what's found.
 * @returns What it gives the button.
 */
function describe(
  nodes: readonly TemplateNode[],
  content: Content = { text: false, icons: 0, unknown: false },
): Content {
  for (const node of nodes) {
    if (node.type === 'Text') {
      if ((node as unknown as { value: string }).value.trim()) {
        content.text = true;
      }
    } else if (node.type === 'BoundText' || node.type === 'Icu') {
      content.text = true;
    } else if (isElement(node)) {
      if (staticValue(attribute(node, 'aria-hidden')) === 'true') continue;
      if (isIcon(node)) {
        content.icons++;
      } else if (tagName(node) === 'img') {
        if (attribute(node, 'alt')) content.text = true;
      } else if (PHRASING.has(tagName(node))) {
        describe(node.children as TemplateNode[], content);
      } else {
        content.unknown = true;
      }
    } else if (node.type === 'Content') {
      content.unknown = true;
    } else {
      describe(childrenOf(node), content);
    }
  }
  return content;
}

/**
 * Flags buttons and button links whose only content is icons, or nothing,
 * with no `aria-label` or `aria-labelledby`: screen readers announce them
 * as just "button" (RFC-0001, ADR-0018). Text inside the button, visually
 * hidden (`sr-only`) or not, names it. Form controls on buttons, such as
 * `button[ndCheckbox]`, are left to `form-control-label`.
 */
export const iconButtonName = createRule({
  name: 'icon-button-name',
  meta: {
    type: 'problem',
    docs: {
      description: 'Give icon-only buttons an accessible name.',
    },
    schema: [],
    messages: {
      iconOnly:
        'This button only has an icon, so screen readers announce it as just "button". Add aria-label, or text in a `<span class="sr-only">`.',
      empty:
        'This button has no content and no aria-label, so it has no accessible name.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Element(element: TmplAstElement) {
        if (
          (tagName(element) !== 'button' &&
            !matches(element, CATALOG.buttons)) ||
          // Controls on buttons, such as a checkbox, take their name from a
          // label; form-control-label checks that they have one.
          matches(element, CATALOG.controls)
        ) {
          return;
        }
        if (NAME_ATTRIBUTES.some((name) => attribute(element, name))) return;
        const content = describe(element.children as TemplateNode[]);
        if (content.text || content.unknown) return;
        context.report({
          loc: getTemplateParserServices(context).convertElementSourceSpanToLoc(
            context,
            element,
          ),
          messageId: content.icons ? 'iconOnly' : 'empty',
        });
      },
    };
  },
});
