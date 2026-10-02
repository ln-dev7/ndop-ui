import {
  booleanAttribute,
  DestroyRef,
  Directive,
  ElementRef,
  HOST_TAG_NAME,
  HostAttributeToken,
  inject,
  input,
  Renderer2,
} from '@angular/core';

/**
 * Headless button for a native `button` or an `a` styled as a button.
 *
 * - On `button`: `disabled` sets the native attribute, and a missing static
 *   `type` becomes `type="button"` so it never submits a form by accident.
 * - On `a`: anchors can't be natively disabled, so `disabled` sets
 *   `aria-disabled="true"`, removes it from the tab order and cancels
 *   clicks before any other listener sees them.
 * - `data-disabled` is present while disabled, on both.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 *
 * @example
 * ```html
 * <button ndButton (click)="save()">Save</button>
 * <a ndButton href="/docs" [disabled]="offline()">Docs</a>
 * ```
 */
@Directive({
  selector: 'button[ndButton], a[ndButton]',
  host: {
    '[attr.type]': 'type',
    '[attr.disabled]': 'isButton && disabled() ? "" : null',
    '[attr.aria-disabled]': '!isButton && disabled() ? "true" : null',
    '[attr.tabindex]': '!isButton && disabled() ? "-1" : tabindex',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class NdButton {
  /** Whether the button or link is disabled. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly isButton = inject(HOST_TAG_NAME) === 'button';

  // Static attributes are written back through the host bindings, which
  // otherwise would remove them when they evaluate to null.
  private readonly staticType = inject(new HostAttributeToken('type'), {
    optional: true,
  });
  protected readonly tabindex = inject(new HostAttributeToken('tabindex'), {
    optional: true,
  });
  protected readonly type = this.isButton
    ? (this.staticType ?? 'button')
    : this.staticType;

  constructor() {
    if (this.isButton) {
      return;
    }
    // Capture phase: at the target, capture listeners run before the
    // template's (click) handlers, so a disabled link never activates them.
    const stop = inject(Renderer2).listen(
      inject<ElementRef<HTMLAnchorElement>>(ElementRef).nativeElement,
      'click',
      (event: MouseEvent) => {
        if (this.disabled()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
    inject(DestroyRef).onDestroy(stop);
  }
}
