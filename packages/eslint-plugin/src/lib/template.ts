import type {
  ParseSourceSpan,
  TmplAstBoundAttribute,
  TmplAstElement,
  TmplAstTextAttribute,
} from '@angular-eslint/bundled-angular-compiler';

/** A node of an Angular template, as the template parser gives rules. */
export interface TemplateNode {
  /** Node kind, such as `Element`, `Text` or `IfBlock`. */
  type?: string;
  /** Where it is in the template. */
  sourceSpan: ParseSourceSpan;
}

/** One compound selector: an element name and attribute names. */
interface CompoundSelector {
  element?: string;
  attributes: string[];
}

/** Properties that hold a node's child nodes, control flow included. */
const CHILD_KEYS = [
  'children',
  'branches',
  'cases',
  'groups',
  'empty',
  'placeholder',
  'loading',
  'error',
] as const;

/**
 * Parses a directive selector list, such as `button[ndButton], a[ndButton]`.
 * Attribute values and `:not()` aren't used by Ndop's selectors and are
 * ignored.
 *
 * @param selector - The selector list.
 * @returns One compound selector per comma-separated part.
 */
export function parseSelector(selector: string): CompoundSelector[] {
  return selector
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({
      ...(/^[a-z][\w-]*/i.test(part)
        ? { element: /^[a-z][\w-]*/i.exec(part)?.[0].toLowerCase() }
        : {}),
      attributes: [...part.matchAll(/\[([^\]=]+)(?:=[^\]]*)?\]/g)].map(
        (match) => (match[1] ?? '').toLowerCase(),
      ),
    }));
}

/**
 * The element name without its namespace, such as `svg` for `:svg:svg`.
 *
 * @param element - A template element.
 * @returns The lowercase name.
 */
export function tagName(element: TmplAstElement): string {
  return element.name.replace(/^:[^:]+:/, '').toLowerCase();
}

/**
 * Every attribute name on an element: static attributes, property and
 * attribute bindings (`[x]`, `[attr.x]`), lowercase.
 *
 * @param element - A template element.
 * @returns The names.
 */
export function attributeNames(element: TmplAstElement): Set<string> {
  return new Set(
    [...element.attributes, ...element.inputs].map((attribute) =>
      attribute.name.toLowerCase(),
    ),
  );
}

/**
 * Whether an element matches any of the selectors.
 *
 * @param element - A template element.
 * @param selectors - Directive selector lists.
 * @returns True when one compound selector matches.
 */
export function matches(
  element: TmplAstElement,
  selectors: readonly string[],
): boolean {
  const name = tagName(element);
  const names = attributeNames(element);
  return selectors.some((selector) =>
    parseSelector(selector).some(
      (compound) =>
        (!compound.element || compound.element === name) &&
        compound.attributes.every((attribute) => names.has(attribute)),
    ),
  );
}

/**
 * A static attribute, or a binding to it, by name.
 *
 * @param element - A template element.
 * @param name - Attribute name, lowercase.
 * @returns The attribute or binding, if present.
 */
export function attribute(
  element: TmplAstElement,
  name: string,
): TmplAstTextAttribute | TmplAstBoundAttribute | undefined {
  return [...element.attributes, ...element.inputs].find(
    (candidate) => candidate.name.toLowerCase() === name,
  );
}

/**
 * The child nodes of a node, through elements, `ng-template`s and control
 * flow blocks.
 *
 * @param node - Any template node.
 * @returns Its direct children.
 */
export function childrenOf(node: TemplateNode): TemplateNode[] {
  const record = node as unknown as Record<string, unknown>;
  return CHILD_KEYS.flatMap((key) => {
    const value = record[key];
    if (Array.isArray(value)) return value as TemplateNode[];
    return value && typeof value === 'object' && 'sourceSpan' in value
      ? [value as TemplateNode]
      : [];
  });
}

/**
 * Visits every node under the given ones, with the elements enclosing it.
 *
 * @param nodes - Root nodes.
 * @param visit - Called for each node, outermost first.
 * @param ancestors - Elements enclosing the roots.
 */
export function walk(
  nodes: readonly TemplateNode[],
  visit: (node: TemplateNode, ancestors: readonly TmplAstElement[]) => void,
  ancestors: readonly TmplAstElement[] = [],
): void {
  for (const node of nodes) {
    visit(node, ancestors);
    walk(
      childrenOf(node),
      visit,
      isElement(node) ? [...ancestors, node] : ancestors,
    );
  }
}

/**
 * Whether a node is an element.
 *
 * @param node - A template node.
 * @returns True for elements.
 */
export function isElement(node: TemplateNode): node is TmplAstElement {
  return node.type === 'Element';
}

/**
 * The value of a static attribute; `undefined` for a binding, whose value
 * is only known at run time.
 *
 * @param found - An attribute or binding, from {@link attribute}.
 * @returns The static value.
 */
export function staticValue(
  found: TmplAstTextAttribute | TmplAstBoundAttribute | undefined,
): string | undefined {
  return typeof found?.value === 'string' ? found.value : undefined;
}
