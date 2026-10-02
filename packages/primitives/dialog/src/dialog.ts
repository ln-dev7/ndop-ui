import { Directive } from '@angular/core';

/**
 * Headless Dialog primitive. Owns behavior and accessibility and
 * renders no styles; its roles, keyboard map, focus and RTL rules are in
 * `spec.md` at the root of this entry point.
 *
 * @example
 * ```html
 * <div ndDialog></div>
 * ```
 */
@Directive({
  selector: '[ndDialog]',
})
export class NdDialog {}
