import {
  afterRenderEffect,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  type Signal,
} from '@angular/core';

/**
 * The state {@link injectCollapse} gives content that opens and closes.
 */
export interface NdCollapse {
  /**
   * Whether the content is shown: while open, and while a closing
   * animation runs. Bind `hidden` to its opposite.
   */
  readonly present: Signal<boolean>;
  /** Whether an opening or closing animation is running. */
  readonly animating: Signal<boolean>;
  /**
   * Whether the content has opened or closed since the first render.
   * Until then, animations are off, so a page loads without them.
   */
  readonly toggled: Signal<boolean>;
}

/**
 * Lets the styled layer animate content that opens and closes, such as an
 * accordion's or a collapsible's: on each change it sets a CSS variable to
 * the content's height, keeps the content shown until a closing animation
 * ends, and reports when an animation runs. Without animations, it hides
 * at once. Call it in an injection context on the content's directive.
 *
 * @param open - Whether the content is open.
 * @param heightVariable - The custom property to set, such as
 *   `--nd-accordion-content-height`.
 * @returns The content's state, as signals.
 *
 * @example
 * ```ts
 * protected readonly collapse = injectCollapse(this.item.isOpen, '--nd-accordion-content-height');
 * ```
 */
export function injectCollapse(
  open: Signal<boolean>,
  heightVariable: string,
): NdCollapse {
  const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const closing = signal(false);
  const animating = signal(false);
  const toggled = signal(false);
  // Counts changes, so animations of an earlier change, cancelled by a
  // quick toggle back, don't end the current one.
  const change = signal(0);

  let wasOpen: boolean | undefined;
  effect(() => {
    const isOpen = open();
    if (wasOpen !== undefined && isOpen !== wasOpen) {
      change.update((count) => count + 1);
      toggled.set(true);
      closing.set(!isOpen);
      animating.set(true);
    }
    wasOpen = isOpen;
  });

  afterRenderEffect({
    earlyRead: () => (closing() || open() ? element.scrollHeight : 0),
    write: (height) => {
      const value = height();
      if (value > 0) {
        element.style.setProperty(heightVariable, `${value}px`);
      }
    },
    read: () => {
      const current = change();
      if (!animating()) {
        return;
      }
      // jsdom has no Web Animations API.
      const animations = element.getAnimations?.() ?? [];
      Promise.all(animations.map((animation) => animation.finished)).then(
        () => {
          if (current !== change()) {
            return;
          }
          if (!open()) {
            // Hidden at once: the animation has ended, and waiting for the
            // next render would show the full height for a frame.
            element.hidden = true;
            closing.set(false);
          }
          animating.set(false);
        },
        // A cancelled animation belongs to an earlier change, which the
        // next one replaces.
        () => undefined,
      );
    },
  });

  return {
    present: computed(() => open() || closing()),
    animating: animating.asReadonly(),
    toggled: toggled.asReadonly(),
  };
}
