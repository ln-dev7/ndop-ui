import { computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/**
 * A spinning loading indicator, announced as a status. Put the loading
 * icon inside it: the icon stays hidden from assistive technology, and the
 * spinner carries the name.
 *
 * @example
 * ```html
 * <span ndSpinner><svg ndIcon="loader-circle"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndSpinner]',
  host: {
    'data-slot': 'spinner',
    role: 'status',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
  },
})
export class Spinner {
  /** What is loading, read by screen readers. */
  readonly label = input('Loading');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('size-4 animate-spin', 'inline-flex [&>svg]:size-full', this.class()),
  );
}
