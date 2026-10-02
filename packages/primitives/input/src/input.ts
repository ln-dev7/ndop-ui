import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  type OnInit,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import { NdControlRegistry } from './control-registry';

/**
 * Headless text input. Forms own the value: Signal Forms (`[formField]`) or
 * reactive and template-driven forms bind the native input directly, and Ndop
 * adds no value accessor (ADR-0004, amendment 1). The directive reads the
 * bound field's state and reflects it:
 *
 * - `aria-invalid="true"` and `data-invalid` while invalid, meaning the
 *   `invalid` input is set, or the field is invalid and touched;
 * - `data-disabled` while the input is disabled.
 *
 * With an `id`, it publishes that state for a `label[ndLabel]` pointing at
 * it.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <label ndLabel for="email">Email</label>
 * <input ndInput id="email" type="email" [formField]="form.email" />
 * ```
 */
@Directive({
  selector: 'input[ndInput]',
  host: {
    '[attr.id]': 'id()',
    '[attr.aria-invalid]': 'showInvalid() ? "true" : null',
    '[attr.data-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class NdInput implements OnInit {
  /** Element id; also the key a `label[ndLabel]` uses to find this input. */
  readonly id = input<string>();

  /**
   * Marks the input invalid when no forms library is bound; with one, the
   * field's state decides.
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  private readonly element =
    inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly formField = inject(FormField, {
    self: true,
    optional: true,
  });
  private readonly ngControl = inject(NgControl, {
    self: true,
    optional: true,
  });

  // Reactive forms state isn't signal-based, so control events bump this
  // counter to recompute the derived signals.
  private readonly controlVersion = signal(0);
  private readonly nativeDisabled = signal(this.element.disabled);

  /**
   * Whether the input presents as invalid. With a forms library, the bound
   * field is invalid and has been touched; without one, the `invalid` input
   * is set.
   */
  readonly showInvalid = computed(() => {
    // Signal Forms binds the field's raw validity into any `invalid` input
    // on the element (the FormUiControl contract), so with a forms library
    // only the field state is read, gated on touched.
    const field = this.formField?.state();
    if (field) {
      return field.invalid() && field.touched();
    }
    const control = this.ngControl?.control;
    if (control) {
      this.controlVersion();
      return control.invalid && control.touched;
    }
    return this.invalid();
  });

  /** Whether the input is disabled. */
  readonly disabled = computed(() => {
    const field = this.formField?.state();
    if (field) {
      return field.disabled();
    }
    this.controlVersion();
    const control = this.ngControl?.control;
    return control ? control.disabled : this.nativeDisabled();
  });

  constructor() {
    const registry = inject(NdControlRegistry);
    effect((onCleanup) => {
      const id = this.id();
      if (id) {
        onCleanup(
          registry.register(id, {
            disabled: this.disabled,
            invalid: this.showInvalid,
          }),
        );
      }
    });

    // Without a forms library the disabled state lives only on the native
    // element (for example a [disabled] binding), so watch the attribute.
    // Browser only: MutationObserver doesn't exist during SSR.
    afterNextRender(() => {
      if (this.formField || this.ngControl) {
        return;
      }
      const observer = new MutationObserver(() =>
        this.nativeDisabled.set(this.element.disabled),
      );
      observer.observe(this.element, { attributeFilter: ['disabled'] });
      this.nativeDisabled.set(this.element.disabled);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Subscribes to reactive or template-driven forms events, once the forms
   * directive on this element has its control.
   */
  ngOnInit(): void {
    // Signal Forms also provides an interop NgControl without an event
    // stream; its state is read from FormField instead.
    if (this.formField) {
      return;
    }
    const subscription = this.ngControl?.control?.events.subscribe(() =>
      this.controlVersion.update((version) => version + 1),
    );
    this.destroyRef.onDestroy(() => subscription?.unsubscribe());
  }
}
