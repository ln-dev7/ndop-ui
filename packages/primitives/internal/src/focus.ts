import { FocusTrapFactory, InteractivityChecker } from '@angular/cdk/a11y';
import { inject } from '@angular/core';

/**
 * Picks where focus returns when an overlay closes: the focused element at
 * opening time, or the trigger when nothing was focused. Safari doesn't
 * focus a button on click, so opening from a click can leave only `body`
 * focused.
 *
 * @param document - The document.
 * @param trigger - The primitive's trigger, if any.
 * @returns The element to refocus on close.
 */
export function focusReturnTarget(
  document: Document,
  trigger: HTMLElement | null,
): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement && active !== document.body
    ? active
    : trigger;
}

/**
 * Returns a function that focuses the first focusable element inside a
 * container, or the container itself when it has none. Call it in an
 * injection context.
 *
 * @returns The focus function.
 */
export function injectFocusFirst(): (container: HTMLElement) => void {
  const factory = inject(FocusTrapFactory);
  return (container) => {
    // A trap with deferred anchors adds nothing to the DOM; it is used only
    // for the CDK's tabbability checks and destroyed right away.
    const trap = factory.create(container, true);
    const focused = trap.focusInitialElement();
    trap.destroy();
    if (!focused) {
      container.focus();
    }
  };
}

/**
 * Elements that can take focus, before the tabbability check.
 */
const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';

/**
 * Returns a function listing the tabbable elements inside a root, in
 * document order. Call it in an injection context.
 *
 * @returns The listing function.
 */
export function injectTabbables(): (root: ParentNode) => HTMLElement[] {
  const checker = inject(InteractivityChecker);
  return (root) =>
    Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => checker.isTabbable(element),
    );
}
