import { computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/** How large a {@link StatCard} is. */
export type StatSize = 'sm' | 'lg';

/** A number with a label, for dashboards. */
@Directive({
  selector: '[ndStat]',
  host: { 'data-slot': 'stat', '[class]': 'classes()' },
})
export class StatCard {
  /** How large the number is. */
  readonly scale = input<StatSize>('sm');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'grid gap-1',
      this.scale() === 'lg' ? 'text-3xl' : 'text-xl',
      this.class(),
    ),
  );
}
