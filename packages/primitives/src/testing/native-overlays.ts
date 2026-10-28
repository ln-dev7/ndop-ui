/**
 * Supplies only the native dialog methods missing in JSDOM. Browser suites
 * verify modality, focus containment, light dismiss and real focus restoration.
 */
export function installNativeOverlayMocks(): void {
  window.scrollTo = () => undefined;
  const previous = new WeakMap<HTMLDialogElement, Element | null>();
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      previous.set(this, document.activeElement);
      this.open = true;
      (
        this.querySelector<HTMLElement>(
          '[autofocus], input, button, [tabindex]',
        ) ?? this
      ).focus();
    };
    HTMLDialogElement.prototype.close = function () {
      if (!this.open) return;
      this.open = false;
      const target = previous.get(this);
      if (target instanceof HTMLElement) target.focus();
      this.dispatchEvent(new Event('close'));
    };
  }
  if (!HTMLElement.prototype.showPopover) {
    const opened = new WeakSet<Element>();
    const computedStyle = window.getComputedStyle;
    const resolvingStyle = new WeakSet<Element>();
    // JSDOM's internal :popover-open matcher asks for computed visibility
    // while its own UA stylesheet is resolving that same selector. Supply
    // native open state only for that recursive lookup; normal style and
    // accessibility queries still use JSDOM's complete cascade.
    window.getComputedStyle = function (element, pseudo) {
      if (resolvingStyle.has(element) && element.hasAttribute('popover')) {
        const state = document.createElement('div').style;
        state.display = opened.has(element) ? 'block' : 'none';
        state.visibility = 'visible';
        return state;
      }
      resolvingStyle.add(element);
      try {
        return computedStyle.call(this, element, pseudo);
      } finally {
        resolvingStyle.delete(element);
      }
    };
    const matches = Element.prototype.matches;
    Element.prototype.matches = function (this: Element, selector: string) {
      return selector === ':popover-open'
        ? opened.has(this)
        : matches.call(this, selector);
    } as typeof Element.prototype.matches;
    Object.defineProperty(HTMLElement.prototype, 'popover', {
      configurable: true,
      get() {
        return this.getAttribute('popover');
      },
      set(value: string) {
        this.setAttribute('popover', value);
      },
    });
    const toggle = (
      element: HTMLElement,
      newState: string,
      type = 'toggle',
    ) => {
      const event = new Event(type);
      Object.defineProperty(event, 'newState', { value: newState });
      element.dispatchEvent(event);
    };
    HTMLElement.prototype.showPopover = function () {
      toggle(this, 'open', 'beforetoggle');
      opened.add(this);
      // Invalidate JSDOM's style cache when the unimplemented native state changes.
      this.setAttribute('data-nd-test-popover-open', '');
      this.hidden = false;
      toggle(this, 'open');
    };
    HTMLElement.prototype.hidePopover = function () {
      if (!opened.has(this)) return;
      toggle(this, 'closed', 'beforetoggle');
      opened.delete(this);
      this.removeAttribute('data-nd-test-popover-open');
      this.hidden = true;
      toggle(this, 'closed');
    };
  }
}
