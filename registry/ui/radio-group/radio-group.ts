import { computed, Directive, input } from '@angular/core';
import {
  NdRadioGroup,
  NdRadioGroupIndicator,
  NdRadioGroupItem,
} from '@ndop/primitives/radio-group';
import { cn } from '@/lib/utils';

/**
 * A radio group (`@ndop/primitives/radio-group`): options of which one at
 * most is checked, with the arrow keys moving between them. Bind it with
 * `[(value)]` or any forms library, and name it with `aria-label` or
 * `aria-labelledby`.
 *
 * @example
 * ```html
 * <div ndRadioGroup aria-label="Plan" [(value)]="plan">
 *   <div class="flex items-center gap-3">
 *     <button ndRadioGroupItem value="free" id="free">
 *       <span ndRadioGroupIndicator><svg ndIcon="circle"></svg></span>
 *     </button>
 *     <label ndLabel for="free">Free</label>
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndRadioGroup]',
  hostDirectives: [
    {
      directive: NdRadioGroup,
      inputs: [
        'value',
        'defaultValue',
        'orientation',
        'disabled',
        'required',
        'invalid',
      ],
      outputs: ['valueChange'],
    },
  ],
  host: { 'data-slot': 'radio-group', '[class]': 'classes()' },
})
export class RadioGroup {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('group/radio-group grid gap-3', this.class()),
  );
}

/**
 * One option of a {@link RadioGroup}, on a native `button`, with a
 * `ndRadioGroupIndicator` inside. Name it with a `label[ndLabel]` whose
 * `for` is its `id`.
 *
 * @example
 * ```html
 * <button ndRadioGroupItem value="pro" id="pro">
 *   <span ndRadioGroupIndicator><svg ndIcon="circle"></svg></span>
 * </button>
 * ```
 */
@Directive({
  selector: 'button[ndRadioGroupItem]',
  hostDirectives: [
    { directive: NdRadioGroupItem, inputs: ['value', 'disabled'] },
  ],
  host: { 'data-slot': 'radio-group-item', '[class]': 'classes()' },
})
export class RadioGroupItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40',
      'group-aria-invalid/radio-group:border-destructive',
      this.class(),
    ),
  );
}

/**
 * The dot of a {@link RadioGroupItem}, shown while it's checked. Put a
 * circle icon inside.
 *
 * @example
 * ```html
 * <span ndRadioGroupIndicator><svg ndIcon="circle"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndRadioGroupIndicator]',
  hostDirectives: [NdRadioGroupIndicator],
  host: { 'data-slot': 'radio-group-indicator', '[class]': 'classes()' },
})
export class RadioGroupIndicator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative flex items-center justify-center [&>svg]:size-2 [&>svg]:fill-primary',
      this.class(),
    ),
  );
}
