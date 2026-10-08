import { computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/** Padding of a {@link Card}. */
export type CardSize = 'sm' | 'default';

/** A bordered surface that groups related content. */
@Directive({
  selector: '[ndCard], [appPanel]',
  host: { 'data-slot': 'card', '[class]': 'classes()' },
})
export class Card {
  /** Padding. */
  readonly size = input<CardSize>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex flex-col gap-6 rounded-2xl border bg-card text-card-foreground shadow-sm',
      this.size() === 'sm' ? 'py-4' : 'py-6',
      this.class(),
    ),
  );
}
