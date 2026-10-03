/*
 * Styles from shadcn/ui new-york-v4 "separator" (MIT License, Copyright (c)
 * 2023 shadcn), copied on 2026-10-02 (ADR-0014). Change: shadcn defaults to
 * decorative; Ndop keeps the primitive's semantic default
 * (role="separator"), so pass `decorative` for purely visual lines.
 */
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
      'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
      this.class(),
    ),
  );
}
