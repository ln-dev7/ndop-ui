import { computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/**
 * A pulsing placeholder in the shape of content that's loading. It's
 * hidden from assistive technology; mark the region that's loading with
 * `aria-busy="true"` instead.
 *
 * @example
 * ```html
 * <div aria-busy="true"><div ndSkeleton class="h-4 w-48"></div></div>
 * ```
 */
@Directive({
  selector: '[ndSkeleton]',
  host: {
    'data-slot': 'skeleton',
    'aria-hidden': 'true',
    '[class]': 'classes()',
  },
})
export class Skeleton {
  /** Extra classes, merged last so they win: usually a size and shape. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('animate-pulse rounded-md bg-accent', this.class()),
  );
}
