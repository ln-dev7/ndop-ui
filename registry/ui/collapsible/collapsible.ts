import { computed, Directive, input } from '@angular/core';
import {
  NdCollapsible,
  NdCollapsibleContent,
  NdCollapsibleTrigger,
} from '@ndop/primitives/collapsible';
import { cn } from '@/lib/utils';

/**
 * A collapsible (`@ndop/primitives/collapsible`): a trigger that shows and
 * hides a section of content, which stays in the page and slides open and
 * closed. Style the trigger with other items, such as a ghost Button.
 * `open` is two-way bindable.
 *
 * @example
 * ```html
 * <div ndCollapsible [(open)]="open">
 *   <button ndButton variant="ghost" ndCollapsibleTrigger>Show more</button>
 *   <div ndCollapsibleContent>…</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndCollapsible]',
  hostDirectives: [
    {
      directive: NdCollapsible,
      inputs: ['open', 'defaultOpen', 'disabled'],
      outputs: ['openChange'],
    },
  ],
  host: { 'data-slot': 'collapsible' },
})
export class Collapsible {}

/**
 * The button that shows and hides its collapsible's content, with
 * `aria-expanded` and `aria-controls`.
 *
 * @example
 * ```html
 * <button ndButton variant="ghost" ndCollapsibleTrigger>Show more</button>
 * ```
 */
@Directive({
  selector: 'button[ndCollapsibleTrigger]',
  hostDirectives: [NdCollapsibleTrigger],
  host: { 'data-slot': 'collapsible-trigger' },
})
export class CollapsibleTrigger {}

/**
 * The content a collapsible shows and hides, sliding open and closed;
 * hidden content leaves the accessibility tree and the tab order. It clips
 * its content only while it animates, so focus rings inside it show.
 *
 * @example
 * ```html
 * <div ndCollapsibleContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndCollapsibleContent]',
  hostDirectives: [NdCollapsibleContent],
  host: { 'data-slot': 'collapsible-content', '[class]': 'classes()' },
})
export class CollapsibleContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'data-animating:overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
      // tw-animate-css's collapsible keyframes read this height.
      '[--radix-collapsible-content-height:var(--nd-collapsible-content-height)]',
      this.class(),
    ),
  );
}
