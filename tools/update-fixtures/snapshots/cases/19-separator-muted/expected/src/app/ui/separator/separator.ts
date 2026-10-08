import { computed, Directive, input } from '@angular/core';
import { NdSeparator } from '@ndop/primitives/separator';
import { cn } from '@/lib/utils';

/**
 * Styled separator line, horizontal or vertical
 * (`@ndop/primitives/separator`).
 *
 * @example
 * ```html
 * <div ndSeparator orientation="vertical" decorative></div>
 * ```
 */
@Directive({
  selector: '[ndSeparator]',
  hostDirectives: [
    { directive: NdSeparator, inputs: ['orientation', 'decorative'] },
  ],
  host: { 'data-slot': 'separator', '[class]': 'classes()' },
})
export class Separator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'shrink-0 bg-muted data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
      this.class(),
    ),
  );
}
