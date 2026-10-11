/**
 * What the rules know about Ndop's components (ADR-0018), derived from the
 * registry's metadata and `@ndop/primitives`' package exports by
 * {@link deriveCatalog}, so new components are covered without editing the
 * rules.
 */
export interface Catalog {
  /** Selectors of parts that render a button or a link. */
  buttons: string[];
  /** Selectors of form controls, which need a label. */
  controls: string[];
  /**
   * Selectors of parts the primitive hides from assistive technology, such
   * as a combobox's pointer-only buttons, which need no name.
   */
  hidden: string[];
  /** Dialog panels, with the title part each must contain. */
  dialogs: { content: string; title: string }[];
  /** Public `@ndop/primitives` entry points, the package root included. */
  primitiveEntryPoints: string[];
}

/** The metadata fields {@link deriveCatalog} reads. */
export interface CatalogMetadata {
  /** Component name. */
  name: string;
  /** Its parts. */
  parts: {
    name: string;
    selector: string;
    role?: string;
    ariaAttributes?: string[];
  }[];
}

/** Roles of form controls, besides native `input`, `select` and `textarea`. */
const CONTROL_ROLES = [
  'checkbox',
  'combobox',
  'listbox',
  'radio',
  'radiogroup',
  'slider',
  'spinbutton',
  'switch',
  'textbox',
];

/**
 * The element names a selector list targets.
 *
 * @param selector - A selector list, such as `button[ndButton], a[ndButton]`.
 * @returns The element of each compound selector; empty for attribute-only
 *   parts.
 */
function elementsOf(selector: string): string[] {
  return selector
    .split(',')
    .map((part) => /^\s*([a-z][\w-]*)/i.exec(part)?.[1]?.toLowerCase() ?? '');
}

/**
 * Derives the rules' catalog from the registry's metadata and the
 * primitives' package exports.
 *
 * - Buttons: parts on `button` or `a` elements only.
 * - Controls: parts on `input`, `select` or `textarea`, or with a form
 *   control role, unless the primitive names them itself (`aria-label` or
 *   `aria-labelledby` among their ARIA attributes), as a select's listbox
 *   takes its trigger's label.
 * - Hidden: parts with `aria-hidden` among their ARIA attributes.
 * - Dialogs: parts with the `dialog` role that are labelled by a title
 *   (`aria-labelledby`), paired with the component's `…Title` part.
 * - Entry points: every export but `package.json` and `internal`, which the
 *   primitives document as private.
 *
 * @param metadata - Every component's metadata.
 * @param primitiveExports - The keys of `@ndop/primitives`' `exports`.
 * @returns The catalog, sorted so it serializes stably.
 */
export function deriveCatalog(
  metadata: readonly CatalogMetadata[],
  primitiveExports: readonly string[],
): Catalog {
  const parts = metadata.flatMap((component) =>
    component.parts.map((part) => ({ component, part })),
  );
  const buttons = parts
    .filter(({ part }) => {
      const elements = elementsOf(part.selector);
      return elements.every(
        (element) => element === 'button' || element === 'a',
      );
    })
    .map(({ part }) => part.selector);
  const controls = parts
    .filter(
      ({ part }) =>
        (elementsOf(part.selector).some((element) =>
          ['input', 'select', 'textarea'].includes(element),
        ) ||
          CONTROL_ROLES.includes(part.role ?? '')) &&
        !part.ariaAttributes?.some(
          (name) => name === 'aria-label' || name === 'aria-labelledby',
        ),
    )
    .map(({ part }) => part.selector);
  const hidden = parts
    .filter(({ part }) => part.ariaAttributes?.includes('aria-hidden'))
    .map(({ part }) => part.selector);
  const dialogs = parts.flatMap(({ component, part }) => {
    if (
      part.role !== 'dialog' ||
      !part.ariaAttributes?.includes('aria-labelledby')
    ) {
      return [];
    }
    const title = component.parts.find((candidate) =>
      candidate.name.endsWith('Title'),
    );
    return title ? [{ content: part.selector, title: title.selector }] : [];
  });
  const primitiveEntryPoints = primitiveExports
    .filter((key) => key !== './package.json' && key !== './internal')
    .map((key) =>
      key === '.' ? '@ndop/primitives' : `@ndop/primitives/${key.slice(2)}`,
    );
  return {
    buttons: [...new Set(buttons)].sort(),
    controls: [...new Set(controls)].sort(),
    hidden: [...new Set(hidden)].sort(),
    dialogs: dialogs.sort((a, b) => a.content.localeCompare(b.content)),
    primitiveEntryPoints: primitiveEntryPoints.sort(),
  };
}
