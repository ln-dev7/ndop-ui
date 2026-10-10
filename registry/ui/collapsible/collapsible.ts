import { Directive } from '@angular/core';
import {
  NdCollapsible,
  NdCollapsibleContent,
  NdCollapsibleTrigger,
} from '@ndop/primitives/collapsible';

/**
 * A collapsible (`@ndop/primitives/collapsible`): a trigger that shows and
 * hides a section of content, which stays in the page. It has no styles of
 * its own; style the trigger and content with other items, such as a ghost
 * Button. `open` is two-way bindable.
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
 * The content a collapsible shows and hides; hidden content leaves the
 * accessibility tree and the tab order.
 *
 * @example
 * ```html
 * <div ndCollapsibleContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndCollapsibleContent]',
  hostDirectives: [NdCollapsibleContent],
  host: { 'data-slot': 'collapsible-content' },
})
export class CollapsibleContent {}
