import { computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/** Which way a {@link ScrollArea} scrolls. */
export type ScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

/**
 * A scrollable region with thin, themed scrollbars, using the browser's
 * own scrolling (ADR-0021): touch, wheel and keyboard scrolling all work,
 * and it can take focus, so keyboard users can scroll it. Give it a size
 * and, when it holds more than a list, a name with `aria-label`.
 *
 * @example
 * ```html
 * <div ndScrollArea class="h-72 w-48 rounded-md border" aria-label="Tags">…</div>
 * ```
 */
@Directive({
  selector: '[ndScrollArea]',
  host: {
    'data-slot': 'scroll-area',
    tabindex: '0',
    '[attr.data-orientation]': 'orientation()',
    '[class]': 'classes()',
  },
})
export class ScrollArea {
  /** Which way it scrolls. */
  readonly orientation = input<ScrollAreaOrientation>('vertical');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative',
      'size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1',
      '[scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]',
      this.orientation() === 'horizontal'
        ? 'overflow-x-auto overflow-y-hidden'
        : this.orientation() === 'both'
          ? 'overflow-auto'
          : 'overflow-x-hidden overflow-y-auto',
      this.class(),
    ),
  );
}
