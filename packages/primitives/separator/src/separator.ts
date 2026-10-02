import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * Orientation of a {@link NdSeparator}.
 */
export type NdSeparatorOrientation = 'horizontal' | 'vertical';

/**
 * Headless separator between groups of content. Sets `role="separator"`,
 * with `aria-orientation` when vertical, or `role="none"` when decorative so
 * assistive technology skips it. `data-orientation` always reflects the
 * orientation, for styling. Not focusable.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/TR/wai-aria-1.2/#separator
 *
 * @example
 * ```html
 * <div ndSeparator orientation="vertical" decorative></div>
 * ```
 */
@Directive({
  selector: '[ndSeparator]',
  host: {
    '[attr.role]': 'decorative() ? "none" : "separator"',
    // Horizontal is the separator role's implicit orientation, so only
    // vertical is announced.
    '[attr.aria-orientation]':
      '!decorative() && orientation() === "vertical" ? "vertical" : null',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class NdSeparator {
  /** Layout direction of the separator. */
  readonly orientation = input<NdSeparatorOrientation>('horizontal');

  /**
   * Whether the separator is purely visual. Decorative separators are
   * hidden from assistive technology.
   */
  readonly decorative = input(false, { transform: booleanAttribute });
}
