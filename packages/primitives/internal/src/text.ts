/**
 * The text a user reads in an element, for labels and filtering: its text
 * without what's hidden from assistive technology (`aria-hidden="true"`)
 * or matches `exclude`, such as an option's check mark, with whitespace
 * collapsed.
 *
 * @param element - The element.
 * @param exclude - A selector for descendants to leave out.
 * @returns The text.
 *
 * @example
 * ```ts
 * const label = readableText(item, '[ndSelectItemIndicator]');
 * ```
 */
export function readableText(element: HTMLElement, exclude?: string): string {
  const clone = element.cloneNode(true) as HTMLElement;
  const selector = ['[aria-hidden="true"]', exclude].filter(Boolean).join(',');
  clone.querySelectorAll(selector).forEach((node) => node.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}
