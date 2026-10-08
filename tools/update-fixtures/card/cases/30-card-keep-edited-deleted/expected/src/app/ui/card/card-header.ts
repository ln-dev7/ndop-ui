import { computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/** The title area at the top of a card. */
@Directive({
  selector: '[ndCardHeader]',
  host: { 'data-slot': 'card-header', '[class]': 'classes()' },
})
export class CardHeader {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('grid auto-rows-min gap-2 px-6', this.class()),
  );
}
