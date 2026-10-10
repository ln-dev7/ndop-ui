import { computed, Directive, input } from '@angular/core';
import { NdTooltip } from '@ndop/primitives/tooltip';
import {
  NdHoverCardContent,
  NdHoverCardPortal,
  NdHoverCardTrigger,
} from '@ndop/primitives/hover-card';
import { cn } from '@/lib/utils';

/**
 * A hover card (`@ndop/primitives/hover-card`): a preview of what's behind
 * a link, for sighted users, after a short delay on hover or keyboard
 * focus. Put it on an `ng-container`.
 *
 * @example
 * ```html
 * <ng-container ndHoverCard>…</ng-container>
 * ```
 */
@Directive({
  selector: '[ndHoverCard]',
  hostDirectives: [
    {
      directive: NdTooltip,
      inputs: ['open', 'defaultOpen', 'openDelay', 'closeDelay'],
      outputs: ['openChange'],
    },
  ],
})
export class HoverCard {}

/**
 * The link its card previews.
 *
 * @example
 * ```html
 * <a ndButton variant="link" ndHoverCardTrigger href="/ada">&#64;ada</a>
 * ```
 */
@Directive({
  selector: '[ndHoverCardTrigger]',
  hostDirectives: [NdHoverCardTrigger],
  host: { 'data-slot': 'hover-card-trigger' },
})
export class HoverCardTrigger {}

/**
 * Marks the `ng-template` its card renders while open.
 *
 * @example
 * ```html
 * <ng-template ndHoverCardPortal>…</ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[ndHoverCardPortal]',
  hostDirectives: [NdHoverCardPortal],
})
export class HoverCardPortal {}

/**
 * A hover card (`@ndop/primitives/hover-card`): a preview of what's behind
 * a link, shown after a short delay while the link is hovered or focused
 * with the keyboard, and kept open while the pointer is over it. It's for
 * sighted users only, so the link must make sense without it.
 *
 * @example
 * ```html
 * <ng-container ndHoverCard>
 *   <a ndButton variant="link" ndHoverCardTrigger href="/nextjs">&#64;nextjs</a>
 *   <ng-template ndHoverCardPortal>
 *     <div ndHoverCardContent>…</div>
 *   </ng-template>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndHoverCardContent]',
  hostDirectives: [
    {
      directive: NdHoverCardContent,
      inputs: ['side', 'align', 'sideOffset'],
    },
  ],
  host: { 'data-slot': 'hover-card-content', '[class]': 'classes()' },
})
export class HoverCardContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
      this.class(),
    ),
  );
}
