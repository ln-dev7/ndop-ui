import { computed, Directive, input } from '@angular/core';
import { NdCheckbox, NdCheckboxIndicator } from '@ndop/primitives/checkbox';
import { cn } from '@/lib/utils';

/**
 * A checkbox on a native `button` (`@ndop/primitives/checkbox`): checked,
 * unchecked or, with `indeterminate`, mixed. Bind it with `[(checked)]` or
 * any forms library, name it with a `label[ndLabel]` whose `for` is its
 * `id`, and put a `ndCheckboxIndicator` with a check icon inside.
 *
 * @example
 * ```html
 * <button ndCheckbox id="terms" [(checked)]="accepted">
 *   <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
 * </button>
 * <label ndLabel for="terms">Accept terms and conditions</label>
 * ```
 */
@Directive({
  selector: 'button[ndCheckbox]',
  hostDirectives: [
    {
      directive: NdCheckbox,
      inputs: [
        'checked',
        'indeterminate',
        'defaultChecked',
        'disabled',
        'required',
        'invalid',
        'id',
      ],
      outputs: ['checkedChange', 'indeterminateChange'],
    },
  ],
  host: { 'data-slot': 'checkbox', '[class]': 'classes()' },
})
export class Checkbox {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary',
      'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:data-[state=indeterminate]:bg-primary',
      this.class(),
    ),
  );
}

/**
 * The checkmark of a {@link Checkbox}, shown while it's checked or mixed.
 * Put a check icon inside, or a minus icon for a mixed checkbox.
 *
 * @example
 * ```html
 * <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndCheckboxIndicator]',
  hostDirectives: [NdCheckboxIndicator],
  host: { 'data-slot': 'checkbox-indicator', '[class]': 'classes()' },
})
export class CheckboxIndicator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'grid place-content-center text-current transition-none [&>svg]:size-3.5',
      this.class(),
    ),
  );
}
