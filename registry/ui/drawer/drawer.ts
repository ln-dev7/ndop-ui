import { computed, Directive, input } from '@angular/core';
import {
  NdDrawerContent,
  NdDrawerDescription,
  NdDrawerHandle,
  NdDrawerTitle,
} from '@ndop/primitives/drawer';
import { cn } from '@/lib/utils';

/**
 * The drawer panel (`@ndop/primitives/drawer`): a modal dialog at the edge
 * its `direction` names (`bottom` by default, `top`, `start` or `end`),
 * which follows a drag toward that edge and closes past a quarter of its
 * size. Motion stops for reduced-motion
 * users; the drag still works.
 *
 * @example
 * ```html
 * <dialog ndDrawerContent>
 *   <div ndDrawerHandle></div>
 *   <div ndDrawerHeader><h2 ndDrawerTitle>Move goal</h2></div>
 * </dialog>
 * ```
 */
@Directive({
  selector: '[ndDrawerContent]',
  hostDirectives: [{ directive: NdDrawerContent, inputs: ['direction'] }],
  host: { 'data-slot': 'drawer-content', '[class]': 'classes()' },
})
export class DrawerContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'backdrop:bg-black/50 group/drawer-content fixed z-50 flex h-auto flex-col bg-background',
      'data-[direction=top]:inset-x-0 data-[direction=top]:top-0 data-[direction=top]:mb-24 data-[direction=top]:max-h-[80vh] data-[direction=top]:rounded-b-lg data-[direction=top]:border-b',
      'data-[direction=bottom]:inset-x-0 data-[direction=bottom]:bottom-0 data-[direction=bottom]:mt-24 data-[direction=bottom]:max-h-[80vh] data-[direction=bottom]:rounded-t-lg data-[direction=bottom]:border-t',
      'data-[direction=end]:inset-y-0 data-[direction=end]:end-0 data-[direction=end]:w-3/4 data-[direction=end]:border-s data-[direction=end]:sm:max-w-sm',
      'data-[direction=start]:inset-y-0 data-[direction=start]:start-0 data-[direction=start]:w-3/4 data-[direction=start]:border-e data-[direction=start]:sm:max-w-sm',
      // Follows the drag, and springs back when released short of closing.
      'transition-[translate] duration-300 ease-out data-dragging:transition-none motion-reduce:transition-none',
      'data-[direction=bottom]:translate-y-(--nd-drawer-drag) data-[direction=top]:-translate-y-(--nd-drawer-drag)',
      'data-[direction=end]:translate-x-(--nd-drawer-drag) rtl:data-[direction=end]:-translate-x-(--nd-drawer-drag)',
      'data-[direction=start]:-translate-x-(--nd-drawer-drag) rtl:data-[direction=start]:translate-x-(--nd-drawer-drag)',
      'data-[state=open]:animate-in data-[state=open]:duration-500 motion-reduce:animate-none data-[direction=bottom]:slide-in-from-bottom data-[direction=top]:slide-in-from-top data-[direction=end]:slide-in-from-end data-[direction=start]:slide-in-from-start',
      this.class(),
    ),
  );
}

/**
 * The grip at the top of a bottom drawer, showing it can be dragged;
 * hidden from assistive technology, and on other edges.
 *
 * @example
 * ```html
 * <div ndDrawerHandle></div>
 * ```
 */
@Directive({
  selector: '[ndDrawerHandle]',
  hostDirectives: [NdDrawerHandle],
  host: { 'data-slot': 'drawer-handle', '[class]': 'classes()' },
})
export class DrawerHandle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[direction=bottom]/drawer-content:block',
      this.class(),
    ),
  );
}

/**
 * Lays out a drawer's title and description, centered on top and bottom
 * drawers on small screens.
 *
 * @example
 * ```html
 * <div ndDrawerHeader>…</div>
 * ```
 */
@Directive({
  selector: '[ndDrawerHeader]',
  host: { 'data-slot': 'drawer-header', '[class]': 'classes()' },
})
export class DrawerHeader {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex flex-col gap-0.5 p-4 group-data-[direction=bottom]/drawer-content:text-center group-data-[direction=top]/drawer-content:text-center md:gap-1.5 md:text-start',
      this.class(),
    ),
  );
}

/**
 * Lays out a drawer's buttons at its bottom.
 *
 * @example
 * ```html
 * <div ndDrawerFooter>…</div>
 * ```
 */
@Directive({
  selector: '[ndDrawerFooter]',
  host: { 'data-slot': 'drawer-footer', '[class]': 'classes()' },
})
export class DrawerFooter {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('mt-auto flex flex-col gap-2 p-4', this.class()),
  );
}

/**
 * A drawer's title, which labels it.
 *
 * @example
 * ```html
 * <h2 ndDrawerTitle>Move goal</h2>
 * ```
 */
@Directive({
  selector: '[ndDrawerTitle]',
  hostDirectives: [NdDrawerTitle],
  host: { 'data-slot': 'drawer-title', '[class]': 'classes()' },
})
export class DrawerTitle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('font-semibold text-foreground', this.class()),
  );
}

/**
 * A drawer's description.
 *
 * @example
 * ```html
 * <p ndDrawerDescription>Set your daily activity goal.</p>
 * ```
 */
@Directive({
  selector: '[ndDrawerDescription]',
  hostDirectives: [NdDrawerDescription],
  host: { 'data-slot': 'drawer-description', '[class]': 'classes()' },
})
export class DrawerDescription {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('text-sm text-muted-foreground', this.class()),
  );
}
