import { computed, Directive, input, numberAttribute } from '@angular/core';
import { cn } from '@/lib/utils';

/**
 * Keeps its content at a width-to-height ratio, with the CSS
 * `aspect-ratio` property. Put an image or media inside, sized to fill it.
 *
 * @example
 * ```html
 * <div ndAspectRatio [ratio]="16 / 9">
 *   <img src="/cover.jpg" alt="…" class="size-full object-cover" />
 * </div>
 * ```
 */
@Directive({
  selector: '[ndAspectRatio]',
  host: {
    'data-slot': 'aspect-ratio',
    '[style.aspect-ratio]': 'ratio()',
    '[class]': 'classes()',
  },
})
export class AspectRatio {
  /** Width divided by height, such as `16 / 9`. */
  readonly ratio = input(1, { transform: numberAttribute });

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('relative w-full', this.class()),
  );
}
