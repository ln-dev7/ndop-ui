/*
 * Styles from shadcn/ui new-york-v4 "popover" (MIT License, Copyright (c)
 * 2023 shadcn), copied on 2026-10-02 (ADR-0014). Changes:
 * - data-[side=left|right] become data-[side=start|end] with
 *   slide-in-from-end|start: Ndop sides are logical (RFC-0001);
 * - origin-(--radix-popover-content-transform-origin) is dropped: the CDK
 *   overlay sets no such variable;
 * - no PopoverAnchor: the trigger is always the anchor;
 * - exit animations don't play, as for Dialog.
 */
import { computed, Directive, input } from '@angular/core';
import {
  NdPopover,
  NdPopoverClose,
  NdPopoverContent,
  NdPopoverPortal,
  NdPopoverTrigger,
} from '@ndop/primitives/popover';
import { cn } from '@/lib/utils';

export { NdPopover, NdPopoverClose, NdPopoverPortal, NdPopoverTrigger };

/**
 * The popover panel, placed next to its trigger.
 *
 * @example
 * ```html
 * <div ndPopoverContent align="start" aria-label="Filters">…</div>
 * ```
 */
@Directive({
  selector: '[ndPopoverContent]',
  hostDirectives: [
    { directive: NdPopoverContent, inputs: ['side', 'align', 'sideOffset'] },
  ],
  host: { 'data-slot': 'popover-content', '[class]': 'classes()' },
})
export class PopoverContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
      this.class(),
    ),
  );
}

/**
 * Layout for the popover's title and description.
 *
 * @example
 * ```html
 * <div ndPopoverHeader>…</div>
 * ```
 */
@Directive({
  selector: '[ndPopoverHeader]',
  host: { 'data-slot': 'popover-header', '[class]': 'classes()' },
})
export class PopoverHeader {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex flex-col gap-1 text-sm', this.class()),
  );
}

/**
 * The popover's title. Point the content's `aria-labelledby` at it.
 *
 * @example
 * ```html
 * <h2 ndPopoverTitle id="filters-title">Filters</h2>
 * ```
 */
@Directive({
  selector: '[ndPopoverTitle]',
  host: { 'data-slot': 'popover-title', '[class]': 'classes()' },
})
export class PopoverTitle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() => cn('font-medium', this.class()));
}

/**
 * Supporting text under the popover's title.
 *
 * @example
 * ```html
 * <p ndPopoverDescription>Narrow the results.</p>
 * ```
 */
@Directive({
  selector: '[ndPopoverDescription]',
  host: { 'data-slot': 'popover-description', '[class]': 'classes()' },
})
export class PopoverDescription {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('text-muted-foreground', this.class()),
  );
}
