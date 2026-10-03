/*
 * Styles from shadcn/ui new-york-v4 "tooltip" (MIT License, Copyright (c)
 * 2023 shadcn), copied on 2026-10-02 (ADR-0014). Changes:
 * - data-[side=left|right] become data-[side=start|end] with
 *   slide-in-from-end|start: Ndop sides are logical (RFC-0001);
 * - origin-(--radix-tooltip-content-transform-origin) is dropped: the CDK
 *   overlay sets no such variable;
 * - no arrow: the primitive doesn't position one;
 * - timing follows the primitive's contract (700 ms to open on hover,
 *   immediate on keyboard focus) rather than shadcn's instant default.
 */
import { computed, Directive, input } from '@angular/core';
import {
  NdTooltip,
  NdTooltipContent,
  NdTooltipPortal,
  NdTooltipTrigger,
} from '@ndop/primitives/tooltip';
import { cn } from '@/lib/utils';

export { NdTooltip, NdTooltipPortal, NdTooltipTrigger };

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
