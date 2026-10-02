import { Directive } from '@angular/core';

/**
 * Headless Label primitive. Owns behavior and accessibility and
 * renders no styles; its roles, keyboard map, focus and RTL rules are in
 * `spec.md` at the root of this entry point.
 *
 * @example
 * ```html
 * <div ndLabel></div>
 * ```
 */
@Directive({
  selector: '[ndLabel]',
})
export class NdLabel {}
