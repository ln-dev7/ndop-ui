/**
 * Collapsible (`@ndop/primitives/collapsible`): a trigger that shows and
 * hides a section of content. It has no styles of its own; style the
 * trigger and content with other items, such as a ghost Button. Import the
 * parts from this file.
 *
 * @example
 * ```html
 * <div ndCollapsible [(open)]="open">
 *   <button ndCollapsibleTrigger ndButton variant="ghost">Show more</button>
 *   <div ndCollapsibleContent>…</div>
 * </div>
 * ```
 *
 * @packageDocumentation
 */
export {
  NdCollapsible,
  NdCollapsibleContent,
  NdCollapsibleTrigger,
} from '@ndop/primitives/collapsible';
