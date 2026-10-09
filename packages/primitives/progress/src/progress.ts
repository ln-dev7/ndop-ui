import {
  computed,
  Directive,
  inject,
  InjectionToken,
  input,
  numberAttribute,
} from '@angular/core';

/** Whether a {@link NdProgress} is indeterminate, under way or done. */
export type NdProgressState = 'indeterminate' | 'loading' | 'complete';

/**
 * The enclosing {@link NdProgress}, injected by its indicator.
 */
export const ND_PROGRESS = new InjectionToken<NdProgress>('ND_PROGRESS');

/**
 * Converts a `value` binding: a number, or `null` (or nothing) while the
 * progress is indeterminate.
 *
 * @param value - The bound value.
 * @returns A number, or `null`.
 */
function valueAttribute(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = numberAttribute(value, Number.NaN);
  return Number.isNaN(number) ? null : number;
}

/**
 * Headless progress bar, the WAI-ARIA `progressbar` role: how far a task
 * has got, from 0 to `max`, or indeterminate while `value` is `null`. It
 * announces the percentage, and exposes it for styling the indicator's
 * width. Give it a name with `aria-label` or `aria-labelledby`.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/TR/wai-aria-1.2/#progressbar
 *
 * @example
 * ```html
 * <div ndProgress [value]="60" aria-label="Upload">
 *   <div ndProgressIndicator></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndProgress]',
  exportAs: 'ndProgress',
  providers: [{ provide: ND_PROGRESS, useExisting: NdProgress }],
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'safeMax()',
    '[attr.aria-valuenow]': 'clamped()',
    '[attr.aria-valuetext]': 'percent() === null ? null : percent() + "%"',
    '[attr.data-state]': 'state()',
    '[attr.data-value]': 'clamped()',
    '[attr.data-max]': 'safeMax()',
  },
})
export class NdProgress {
  /** How far the task has got, from 0 to `max`; `null` while unknown. */
  readonly value = input<number | null, unknown>(null, {
    transform: valueAttribute,
  });

  /** The value of a finished task. */
  readonly max = input(100, { transform: numberAttribute });

  /** `max`, or 100 when it isn't a positive number. */
  protected readonly safeMax = computed(() =>
    this.max() > 0 ? this.max() : 100,
  );

  /** The value within 0 and `max`, or `null` while indeterminate. */
  readonly clamped = computed(() => {
    const value = this.value();
    return value === null ? null : Math.min(Math.max(value, 0), this.safeMax());
  });

  /** The value as a whole percentage, or `null` while indeterminate. */
  readonly percent = computed(() => {
    const value = this.clamped();
    return value === null ? null : Math.round((value / this.safeMax()) * 100);
  });

  /** `indeterminate`, `loading` or `complete`, for `data-state`. */
  readonly state = computed<NdProgressState>(() => {
    const value = this.clamped();
    if (value === null) return 'indeterminate';
    return value >= this.safeMax() ? 'complete' : 'loading';
  });
}

/**
 * The filled part of a {@link NdProgress}. Presentational: the root
 * announces the value.
 *
 * @example
 * ```html
 * <div ndProgressIndicator></div>
 * ```
 */
@Directive({
  selector: '[ndProgressIndicator]',
  host: { '[attr.data-state]': 'progress.state()' },
})
export class NdProgressIndicator {
  /** The progress bar it fills. */
  readonly progress = inject(ND_PROGRESS);
}
