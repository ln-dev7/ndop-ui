import { computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/** How large a {@link Stat} is. */
export type StatSize = 'sm' | 'lg';

/** A number with a label, for dashboards. */
@Directive({
  selector: '[ndStat]',
  host: { 'data-slot': 'stat', '[class]': 'classes()' },
})
export class Stat {
  /** How large the number is. */
  readonly size = input<StatSize>('sm');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'grid gap-1',
      this.size() === 'lg' ? 'text-3xl' : 'text-xl',
      this.class(),
    ),
  );
}
