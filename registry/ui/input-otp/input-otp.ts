import { computed, Directive, input } from '@angular/core';
import {
  NdInputOtp,
  NdInputOtpGroup,
  NdInputOtpInput,
  NdInputOtpSeparator,
  NdInputOtpSlot,
} from '@ndop/primitives/input-otp';
import { cn } from '@/lib/utils';

/**
 * A one-time code input (`@ndop/primitives/input-otp`): one native
 * `input[ndInputOtpInput]` holds the code, invisible over the slots that
 * draw it. Set `length`, bind it with `[(value)]` or any forms library on
 * this element, and name the input with a label or `aria-label`.
 *
 * @example
 * ```html
 * <div ndInputOtp [length]="6" [(value)]="code">
 *   <input ndInputOtpInput aria-label="Verification code" />
 *   <div ndInputOtpGroup>
 *     @for (index of [0, 1, 2, 3, 4, 5]; track index) {
 *       <div ndInputOtpSlot [index]="index"></div>
 *     }
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndInputOtp]',
  hostDirectives: [
    {
      directive: NdInputOtp,
      inputs: [
        'value',
        'defaultValue',
        'length',
        'allow',
        'inputMode',
        'disabled',
        'invalid',
      ],
      outputs: ['valueChange', 'completed'],
    },
  ],
  host: { 'data-slot': 'input-otp', '[class]': 'classes()' },
})
export class InputOtp {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex items-center gap-2 has-disabled:opacity-50',
      'relative w-fit',
      this.class(),
    ),
  );
}

/**
 * The native input of an {@link InputOtp}: transparent and stretched over
 * the slots, so clicking them focuses it.
 *
 * @example
 * ```html
 * <input ndInputOtpInput aria-label="Verification code" />
 * ```
 */
@Directive({
  selector: 'input[ndInputOtpInput]',
  hostDirectives: [{ directive: NdInputOtpInput, inputs: ['id'] }],
  host: { 'data-slot': 'input-otp-input', '[class]': 'classes()' },
})
export class InputOtpInput {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'absolute inset-0 z-20 size-full bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed',
      this.class(),
    ),
  );
}

/**
 * A row of {@link InputOtpSlot}s that join into one box.
 *
 * @example
 * ```html
 * <div ndInputOtpGroup>…</div>
 * ```
 */
@Directive({
  selector: '[ndInputOtpGroup]',
  hostDirectives: [NdInputOtpGroup],
  host: { 'data-slot': 'input-otp-group', '[class]': 'classes()' },
})
export class InputOtpGroup {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex items-center', this.class()),
  );
}

/**
 * One character of an {@link InputOtp}, ringed while it's where the next
 * one goes, with a blinking caret while that slot is empty.
 *
 * @example
 * ```html
 * <div ndInputOtpSlot [index]="0"></div>
 * ```
 */
@Directive({
  selector: '[ndInputOtpSlot]',
  hostDirectives: [{ directive: NdInputOtpSlot, inputs: ['index'] }],
  host: { 'data-slot': 'input-otp-slot', '[class]': 'classes()' },
})
export class InputOtpSlot {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative flex h-9 w-9 items-center justify-center border-y border-e border-input text-sm shadow-xs transition-all outline-none first:rounded-s-md first:border-s last:rounded-e-md data-invalid:border-destructive data-active:z-10 data-active:border-ring data-active:ring-[3px] data-active:ring-ring/50 data-active:data-invalid:border-destructive data-active:data-invalid:ring-destructive/20 dark:bg-input/30 dark:data-active:data-invalid:ring-destructive/40',
      'data-caret:after:pointer-events-none data-caret:after:absolute data-caret:after:h-4 data-caret:after:w-px data-caret:after:animate-caret-blink data-caret:after:bg-foreground data-caret:after:duration-1000',
      this.class(),
    ),
  );
}

/**
 * A separator between groups of slots. Put a minus icon inside.
 *
 * @example
 * ```html
 * <div ndInputOtpSeparator><svg ndIcon="minus"></svg></div>
 * ```
 */
@Directive({
  selector: '[ndInputOtpSeparator]',
  hostDirectives: [NdInputOtpSeparator],
  host: { 'data-slot': 'input-otp-separator' },
})
export class InputOtpSeparator {}
