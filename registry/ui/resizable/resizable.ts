import { computed, Directive, input } from '@angular/core';
import {
  NdResizableHandle,
  NdResizablePanel,
  NdResizablePanelGroup,
} from '@ndop/primitives/resizable';
import { cn } from '@/lib/utils';

/**
 * A group of resizable panels (`@ndop/primitives/resizable`), side by side
 * or stacked, with a handle between each pair.
 *
 * @example
 * ```html
 * <div ndResizablePanelGroup orientation="horizontal">
 *   <div ndResizablePanel [defaultSize]="30">Sidebar</div>
 *   <div ndResizableHandle aria-label="Resize sidebar"></div>
 *   <div ndResizablePanel>Content</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndResizablePanelGroup]',
  hostDirectives: [
    {
      directive: NdResizablePanelGroup,
      inputs: ['orientation', 'sizes', 'keyboardStep'],
      outputs: ['sizesChange'],
    },
  ],
  host: { 'data-slot': 'resizable-panel-group', '[class]': 'classes()' },
})
export class ResizablePanelGroup {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex h-full w-full data-[orientation=vertical]:flex-col', this.class()),
  );
}

/**
 * One panel; its size is in percent of the group.
 *
 * @example
 * ```html
 * <div ndResizablePanel [defaultSize]="30" [minSize]="20">…</div>
 * ```
 */
@Directive({
  selector: '[ndResizablePanel]',
  hostDirectives: [
    {
      directive: NdResizablePanel,
      inputs: ['defaultSize', 'minSize', 'maxSize'],
    },
  ],
  host: { 'data-slot': 'resizable-panel' },
})
export class ResizablePanel {}

/**
 * The line between two panels, which arrow keys and dragging move. Put a
 * {@link ResizableHandleGrip} in it to show it can be dragged. Name it
 * with `aria-label`.
 *
 * @example
 * ```html
 * <div ndResizableHandle aria-label="Resize sidebar"></div>
 * ```
 */
@Directive({
  selector: '[ndResizableHandle]',
  hostDirectives: [{ directive: NdResizableHandle, inputs: ['disabled'] }],
  host: { 'data-slot': 'resizable-handle', '[class]': 'classes()' },
})
export class ResizableHandle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:start-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90',
      this.class(),
    ),
  );
}

/**
 * A grip in a handle, showing it can be dragged. It's decorative.
 *
 * @example
 * ```html
 * <div ndResizableHandleGrip><svg ndIcon="grip-vertical"></svg></div>
 * ```
 */
@Directive({
  selector: '[ndResizableHandleGrip]',
  host: {
    'data-slot': 'resizable-handle-grip',
    'aria-hidden': 'true',
    '[class]': 'classes()',
  },
})
export class ResizableHandleGrip {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border',
      '[&>svg]:size-2.5',
      this.class(),
    ),
  );
}
