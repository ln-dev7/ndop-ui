import { computed, Directive, inject, input } from '@angular/core';
import { NdControlRegistry } from '@ndop/primitives/input';

/**
 * Elements inside a label that handle their own double clicks, such as a
 * nested link or the control itself.
 */
const INTERACTIVE =
  'button, input, select, textarea, a[href], [contenteditable]';

/**
 * Headless label. Keeps native `label` semantics and, when `for` names an
 * `input[ndInput]`, mirrors that input's state as `data-disabled` and
 * `data-invalid`, through {@link NdControlRegistry} rather than DOM queries.
 * Double-clicking the label's own text doesn't select it.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <label ndLabel for="email">Email</label>
 * <input ndInput id="email" />
 * ```
 */
@Directive({
  selector: 'label[ndLabel]',
  host: {
    '[attr.for]': 'for()',
    '[attr.data-disabled]': 'control()?.disabled() ? "" : null',
    '[attr.data-invalid]': 'control()?.invalid() ? "" : null',
    '(mousedown)': 'preventTextSelection($event)',
  },
})
export class NdLabel {
  /** Id of the labelled control. */
  readonly for = input<string>();

  /** State of the labelled `input[ndInput]`, if one is registered. */
  protected readonly control = inject(NdControlRegistry).lookup(() =>
    this.for(),
  );

  /** Whether the labelled control is disabled. */
  readonly disabled = computed(() => this.control()?.disabled() ?? false);

  /**
   * Stops a double click on the label text from selecting it, leaving
   * interactive elements nested in the label alone.
   *
   * @param event - The mousedown event.
   */
  protected preventTextSelection(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (event.detail > 1 && !target?.closest(INTERACTIVE)) {
      event.preventDefault();
    }
  }
}
