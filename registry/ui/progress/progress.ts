import { computed, Directive, inject, input } from '@angular/core';
import {
  ND_PROGRESS,
  NdProgress,
  NdProgressIndicator,
} from '@ndop/primitives/progress';
import { cn } from '@/lib/utils';

/**
 * A progress bar (`@ndop/primitives/progress`): how far a task has got,
 * from 0 to `max`, or indeterminate while `value` is `null`. Give it a
 * name with `aria-label` or `aria-labelledby`, and put a
 * `ndProgressIndicator` inside.
 *
 * @example
 * ```html
 * <div ndProgress [value]="uploaded()" aria-label="Upload">
 *   <div ndProgressIndicator></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndProgress]',
  hostDirectives: [{ directive: NdProgress, inputs: ['value', 'max'] }],
  host: { 'data-slot': 'progress', '[class]': 'classes()' },
})
export class Progress {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
      this.class(),
    ),
  );
}

/**
 * The filled part of a progress bar. It fills from the start side, so
 * from the right in right-to-left layouts, and pulses across the whole
 * bar while indeterminate.
 *
 * @example
 * ```html
 * <div ndProgressIndicator></div>
 * ```
 */
@Directive({
  selector: '[ndProgressIndicator]',
  hostDirectives: [NdProgressIndicator],
  host: {
    'data-slot': 'progress-indicator',
    '[style.width.%]': 'progress.percent()',
    '[class]': 'classes()',
  },
})
export class ProgressIndicator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly progress = inject(ND_PROGRESS);

  protected readonly classes = computed(() =>
    cn(
      'h-full flex-1 bg-primary transition-all',
      'data-[state=indeterminate]:w-full data-[state=indeterminate]:animate-pulse',
      this.class(),
    ),
  );
}
