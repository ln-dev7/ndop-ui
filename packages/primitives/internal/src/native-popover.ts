import { Directionality } from '@angular/cdk/bidi';
import { Platform } from '@angular/cdk/platform';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import {
  DestroyRef,
  DOCUMENT,
  inject,
  type EmbeddedViewRef,
  type Injector,
  type TemplateRef,
  type ViewContainerRef,
} from '@angular/core';

/** A popover anchor: a real element or context-menu viewport coordinates. */
export type NdNativeAnchor = HTMLElement | { x: number; y: number };

/** Native top-layer rendering and positioning callbacks. */
export interface NdNativePopoverOptions {
  /** Returns the current anchor, including after a trigger is replaced. */
  anchor(): NdNativeAnchor;
  /** Returns the invoker for native nesting and implicit CSS anchoring. */
  source?(): HTMLElement | null;
  /** Returns preferred and fallback positions, in priority order. */
  positions(): readonly ConnectedPosition[];
  /** Returns whether logical start/end resolve right to left. */
  rtl?(): boolean;
  /** Auto provides native light dismiss; hint preserves an open parent. */
  mode?: 'auto' | 'hint';
  /** Closes a tooltip on document scrolling rather than repositioning it. */
  closeOnScroll?: boolean;
  /** Synchronizes native light dismiss or Escape with the owning model. */
  onDismiss(): void;
  /**
   * Reports the chosen position after flipping.
   *
   * @param position - The applied logical connection points.
   */
  onPosition?(position: ConnectedPosition): void;
}

/** A local Angular view or direct element promoted to the native top layer. */
export interface NdNativePopover {
  /**
   * Registers an optional lazy local view; it is kept for exit transitions.
   *
   * @param template - The content template.
   * @param container - Its declaring view container.
   * @param context - Optional embedded-view context.
   * @param injector - Optional child-menu injection context.
   */
  setTemplate(
    template: TemplateRef<unknown>,
    container: ViewContainerRef,
    context?: unknown,
    injector?: Injector,
  ): void;
  /**
   * Registers content already in the declaring view, without moving it.
   *
   * @param element - The content element.
   */
  setElement(element: HTMLElement): void;
  /** Opens the native popover; returns null on the server or without content. */
  attach(): NdNativePopover | null;
  /** Closes without destroying the view or interrupting exit transitions. */
  detach(): void;
  /** Whether this controller has an open native popover. */
  hasAttached(): boolean;
  /** Recalculates placement after content, anchor or input changes. */
  updatePosition(): void;
  /** The content element, available after its first render. */
  element(): HTMLElement | null;
}

/** A viewport-space candidate for native popover positioning. */
export interface NdNativePosition {
  /** Physical horizontal offset. */
  left: number;
  /** Physical vertical offset. */
  top: number;
  /** The selected connection points. */
  position: ConnectedPosition;
  /** Whether the chosen candidate was shifted into the viewport. */
  shifted: boolean;
}

/** Width and height of a native popover or its viewport, in CSS pixels. */
export interface NdNativeSize {
  /** Physical width. */
  width: number;
  /** Physical height. */
  height: number;
}

/**
 * Chooses a fitting logical position, then shifts it inside the viewport.
 * This geometry fallback is independent of CSS anchor-positioning support.
 *
 * @param anchor - Anchor viewport bounds.
 * @param content - Untransformed content dimensions.
 * @param positions - Preferred connection points and fallback candidates.
 * @param viewport - Viewport dimensions.
 * @param rtl - Whether start/end are reversed.
 * @returns The least-overflowing candidate, shifted away from viewport edges.
 */
export function nativePopoverPosition(
  anchor: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  content: NdNativeSize,
  positions: readonly ConnectedPosition[],
  viewport: NdNativeSize,
  rtl: boolean,
): NdNativePosition {
  const horizontal = (value: 'start' | 'center' | 'end') =>
    value === 'center' ? 0.5 : (value === 'start') === rtl ? 1 : 0;
  const vertical = (value: 'top' | 'center' | 'bottom') =>
    value === 'center' ? 0.5 : value === 'top' ? 0 : 1;
  const candidates = positions.map((position) => {
    const left =
      anchor.left +
      anchor.width * horizontal(position.originX) -
      content.width * horizontal(position.overlayX) +
      (position.offsetX ?? 0);
    const top =
      anchor.top +
      anchor.height * vertical(position.originY) -
      content.height * vertical(position.overlayY) +
      (position.offsetY ?? 0);
    const overflow =
      Math.max(0, 8 - left) +
      Math.max(0, 8 - top) +
      Math.max(0, left + content.width + 8 - viewport.width) +
      Math.max(0, top + content.height + 8 - viewport.height);
    return { left, top, position, overflow };
  });
  const chosen = candidates.reduce((best, candidate) =>
    candidate.overflow < best.overflow ? candidate : best,
  );
  const left = Math.max(
    8,
    Math.min(chosen.left, viewport.width - content.width - 8),
  );
  const top = Math.max(
    8,
    Math.min(chosen.top, viewport.height - content.height - 8),
  );
  return {
    left,
    top,
    position: chosen.position,
    shifted: left !== chosen.left || top !== chosen.top,
  };
}

/**
 * Creates a browser-only native popover controller in an injection context.
 * Content stays in its Angular view, including within a modal dialog. Native
 * auto/hint popovers own layering and light dismiss. CSS anchors follow element
 * anchors where supported; JavaScript retains flipping, shifting and a fallback.
 *
 * @param options - Anchor, positioning, dismissal and mode callbacks.
 * @returns A controller cleaned up with its owning directive.
 */
export function injectNativePopover(
  options: NdNativePopoverOptions,
): NdNativePopover {
  const document = inject(DOCUMENT);
  const directionality = inject(Directionality, { optional: true });
  const browser = inject(Platform).isBrowser;
  let element: HTMLElement | null = null;
  let template: TemplateRef<unknown> | undefined;
  let container: ViewContainerRef | undefined;
  let context: unknown;
  let childInjector: Injector | undefined;
  let view: EmbeddedViewRef<unknown> | undefined;
  let shown = false;
  let cleanup: (() => void) | undefined;
  let cleanupPosition: (() => void) | undefined;

  const clearPosition = () => {
    cleanupPosition?.();
    cleanupPosition = undefined;
  };

  const updatePosition = () => {
    if (!shown || !element || !document.defaultView) return;
    const window = document.defaultView;
    const anchor = options.anchor();
    const isElement = 'getBoundingClientRect' in anchor;
    if (isElement && !anchor.isConnected) {
      controller.detach();
      options.onDismiss();
      return;
    }
    const rect = isElement
      ? anchor.getBoundingClientRect()
      : { left: anchor.x, top: anchor.y, width: 0, height: 0 };
    const bounds = element.getBoundingClientRect();
    if (
      !element.offsetWidth &&
      !element.offsetHeight &&
      !bounds.width &&
      !bounds.height
    )
      return;
    // offsetWidth rounds fractional widths; transformed rects include entry
    // animations. Computed layout dimensions keep centered hints pixel aligned.
    const style = window.getComputedStyle(element);
    const cssPixels = (value: string) => Number.parseFloat(value) || 0;
    const contentBox = style.boxSizing !== 'border-box';
    const dimensions = {
      width:
        (cssPixels(style.width) || element.offsetWidth || bounds.width) +
        (contentBox
          ? cssPixels(style.paddingLeft) +
            cssPixels(style.paddingRight) +
            cssPixels(style.borderLeftWidth) +
            cssPixels(style.borderRightWidth)
          : 0),
      height:
        (cssPixels(style.height) || element.offsetHeight || bounds.height) +
        (contentBox
          ? cssPixels(style.paddingTop) +
            cssPixels(style.paddingBottom) +
            cssPixels(style.borderTopWidth) +
            cssPixels(style.borderBottomWidth)
          : 0),
    };
    if (!dimensions.width && !dimensions.height) return;
    const rtl = options.rtl?.() ?? false;
    const result = nativePopoverPosition(
      rect,
      dimensions,
      options.positions(),
      { width: window.innerWidth, height: window.innerHeight },
      rtl,
    );
    const cssAnchor =
      isElement &&
      (options.source?.() ?? anchor) === anchor &&
      window.CSS?.supports('position-anchor', 'auto') &&
      window.CSS.supports('left', 'anchor(left, 0px)') &&
      !result.shifted;
    if (cssAnchor) {
      // showPopover's source is the implicit anchor. Numeric fallbacks also
      // cover engines that implement anchor() before implicit source anchoring.
      element.style.setProperty('position-anchor', 'auto');
      element.style.left = `calc(anchor(left, ${rect.left}px) + ${result.left - rect.left}px)`;
      element.style.top = `calc(anchor(top, ${rect.top}px) + ${result.top - rect.top}px)`;
    } else {
      element.style.removeProperty('position-anchor');
      element.style.left = `${result.left}px`;
      element.style.top = `${result.top}px`;
    }
    options.onPosition?.(result.position);
  };

  const bind = () => {
    if (!element) return;
    const content = element;
    content.setAttribute('data-nd-native-popover', '');
    content.popover = options.mode ?? 'auto';
    const manualHint = options.mode === 'hint' && content.popover !== 'hint';
    if (manualHint) content.popover = 'manual';
    content.style.position = 'fixed';
    content.style.inset = 'auto';
    content.style.margin = '0';
    const toggle = (event: Event) => {
      if (
        (event as ToggleEvent).newState === 'closed' &&
        !content.matches(':popover-open') &&
        shown
      ) {
        shown = false;
        clearPosition();
        options.onDismiss();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (
        manualHint &&
        shown &&
        event.key === 'Escape' &&
        !event.defaultPrevented
      ) {
        event.preventDefault();
        controller.detach();
        options.onDismiss();
      }
    };
    // State must change before the browser starts its discrete exit transition.
    const state = (event: Event) =>
      content.setAttribute('data-state', (event as ToggleEvent).newState);
    content.addEventListener('beforetoggle', state);
    content.addEventListener('toggle', toggle);
    if (manualHint) document.addEventListener('keydown', escape);
    cleanup = () => {
      content.removeEventListener('beforetoggle', state);
      content.removeEventListener('toggle', toggle);
      document.removeEventListener('keydown', escape);
    };
  };

  const listenPosition = () => {
    const window = document.defaultView;
    if (!window || !element) return;
    const scroll = () => {
      if (options.closeOnScroll) {
        controller.detach();
        options.onDismiss();
      } else updatePosition();
    };
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', scroll, true);
    const observer = window.ResizeObserver
      ? new window.ResizeObserver(updatePosition)
      : undefined;
    observer?.observe(element);
    const anchor = options.anchor();
    if ('getBoundingClientRect' in anchor) observer?.observe(anchor);
    const mutations = new window.MutationObserver(updatePosition);
    mutations.observe(document.body, { childList: true, subtree: true });
    cleanupPosition = () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', scroll, true);
      observer?.disconnect();
      mutations.disconnect();
    };
  };

  const controller: NdNativePopover = {
    setTemplate(next, declaringContainer, nextContext, injector) {
      if (template === next) return;
      controller.detach();
      cleanup?.();
      cleanup = undefined;
      view?.destroy();
      view = undefined;
      element = null;
      template = next;
      container = declaringContainer;
      context = nextContext;
      childInjector = injector;
    },
    setElement(next) {
      if (element === next) return;
      controller.detach();
      cleanup?.();
      cleanup = undefined;
      element = next;
    },
    attach() {
      if (!browser) return null;
      if (!view && template && container) {
        view = container.createEmbeddedView(template, context, {
          injector: childInjector,
        });
        view.detectChanges();
        const roots = view.rootNodes.filter(
          (node): node is HTMLElement => node instanceof HTMLElement,
        );
        element =
          roots.find((node) =>
            node.matches(
              '[ndPopoverContent], [ndTooltipContent], [ndHoverCardContent], [ndMenuContent]',
            ),
          ) ??
          roots.flatMap((node) =>
            Array.from(
              node.querySelectorAll<HTMLElement>(
                '[ndPopoverContent], [ndTooltipContent], [ndHoverCardContent], [ndMenuContent]',
              ),
            ),
          )[0] ??
          roots[0] ??
          null;
      }
      if (!element?.isConnected) return null;
      if (!cleanup) bind();
      if (!shown) {
        element.hidden = false;
        element.showPopover({
          source:
            options.source?.() ??
            ('getBoundingClientRect' in options.anchor()
              ? (options.anchor() as HTMLElement)
              : undefined),
        });
        shown = true;
        listenPosition();
      }
      updatePosition();
      return controller;
    },
    detach() {
      if (!shown) return;
      shown = false;
      if (element?.matches(':popover-open')) element.hidePopover();
      clearPosition();
    },
    hasAttached: () => shown,
    updatePosition,
    element: () => element,
  };
  const direction = directionality?.change.subscribe(updatePosition);
  inject(DestroyRef).onDestroy(() => {
    direction?.unsubscribe();
    controller.detach();
    cleanup?.();
    view?.destroy();
  });
  return controller;
}
