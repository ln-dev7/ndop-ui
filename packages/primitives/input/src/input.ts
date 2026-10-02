import { Directive } from '@angular/core';

/**
 * Headless Input primitive. Owns behavior and accessibility and
 * renders no styles; its roles, keyboard map, focus and RTL rules are in
 * `spec.md` at the root of this entry point.
 *
 * @example
 * ```html
 * <div ndInput></div>
 * ```
 */
@Directive({
  selector: '[ndInput]',
})
export class NdInput {}
