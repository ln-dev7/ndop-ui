import { computed, Directive, input } from '@angular/core';
import { NdTooltipContent } from '@ndop/primitives/tooltip';
import { cn } from '@/lib/utils';

/**
 * The tooltip bubble.
 *
 * @example
 * ```html
 * <div ndTooltipContent>Delete permanently</div>
 * ```
 */
@Directive({
  selector: '[ndTooltipContent]',
  hostDirectives: [
    { directive: NdTooltipContent, inputs: ['side', 'align', 'sideOffset'] },
  ],
  host: { 'data-slot': 'tooltip-content', '[class]': 'classes()' },
})
export class TooltipContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'z-50 w-fit animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      this.class(),
    ),
  );
}
