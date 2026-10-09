/**
 * Whether an element is in a right-to-left context: its nearest `dir`
 * attribute, on itself or an ancestor, is `rtl`. Read when a key or the
 * pointer needs it, so a `dir` set on any ancestor after rendering applies.
 *
 * @param element - The element.
 * @returns `true` in a right-to-left context.
 */
export function isRtl(element: Element): boolean {
  return element.closest('[dir]')?.getAttribute('dir')?.toLowerCase() === 'rtl';
}
