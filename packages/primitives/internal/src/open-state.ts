import {
  afterNextRender,
  effect,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';

/**
 * What {@link bindOpenState} calls when the open state changes.
 */
export interface NdOpenStateHandlers {
  /** Renders the overlay; called when the state becomes open. */
  show(): void;
  /** Removes the overlay; called when the state becomes closed. */
  hide(): void;
}

/**
 * Connects a primitive's `open` model to its overlay. Nothing is shown
 * before hydration: the server renders closed, then `defaultOpen` and an
 * initially bound `open` take effect after the first render in the browser.
 * `hide` runs only after a `show`, so a primitive that starts closed never
 * runs its closing work, such as returning focus to its trigger.
 * Call it in an injection context.
 *
 * @param open - The primitive's `open` model.
 * @param defaultOpen - The primitive's `defaultOpen` input.
 * @param handlers - Show and hide callbacks.
 * @returns Whether the first render has happened.
 */
export function bindOpenState(
  open: WritableSignal<boolean>,
  defaultOpen: Signal<boolean>,
  handlers: NdOpenStateHandlers,
): Signal<boolean> {
  const hydrated = signal(false);

  afterNextRender(() => {
    if (defaultOpen()) {
      open.set(true);
    }
    hydrated.set(true);
  });

  let shown = false;
  effect(() => {
    const isOpen = open();
    if (!hydrated() || isOpen === shown) {
      return;
    }
    shown = isOpen;
    untracked(() => (isOpen ? handlers.show() : handlers.hide()));
  });

  return hydrated.asReadonly();
}
