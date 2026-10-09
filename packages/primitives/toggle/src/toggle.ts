import {
  booleanAttribute,
  computed,
  Directive,
  forwardRef,
  input,
  model,
  signal,
  type OnInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

/**
 * Headless toggle button on a native `button`: pressed or not, announced
 * with `aria-pressed`. Space and Enter press or release it. It's also a
 * `ControlValueAccessor` for a boolean, which every forms library binds
 * (ADR-0004, amendments 1 and 4).
 *
 * Keep its label the same in both states: "Bold", not "Bold on".
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
 *
 * @example
 * ```html
 * <button ndToggle aria-label="Bold" [(pressed)]="bold">B</button>
 * ```
 */
@Directive({
  selector: 'button[ndToggle]',
  exportAs: 'ndToggle',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdToggle),
      multi: true,
    },
  ],
  host: {
    type: 'button',
    '[attr.aria-pressed]': 'pressed()',
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[disabled]': 'isDisabled()',
    '(click)': 'toggle()',
    '(blur)': 'onTouched()',
  },
})
export class NdToggle implements ControlValueAccessor, OnInit {
  /** Whether it's pressed. Two-way bindable with `[(pressed)]`. */
  readonly pressed = model(false);

  /** Initial `pressed` when it isn't bound. */
  readonly defaultPressed = input(false, { transform: booleanAttribute });

  /** Disables it. A disabled bound field disables it too. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly formDisabled = signal(false);

  /** Whether it's disabled, by its input or by a forms library. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /** `on` or `off`, for `data-state`. */
  readonly state = computed(() => (this.pressed() ? 'on' : 'off'));

  private onChange: (pressed: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // initial state.
    if (this.defaultPressed()) {
      this.pressed.set(true);
    }
  }

  /** Presses it if released, and releases it if pressed, unless disabled. */
  toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    const pressed = !this.pressed();
    this.pressed.set(pressed);
    this.onChange(pressed);
  }

  /**
   * Sets the pressed state from a forms library.
   *
   * @param value - The field's value; anything truthy presses it.
   */
  writeValue(value: unknown): void {
    this.pressed.set(Boolean(value));
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new pressed state on user changes.
   */
  registerOnChange(fn: (pressed: boolean) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the toggle.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Disables or enables it from a forms library.
   *
   * @param disabled - Whether the field is disabled.
   */
  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }
}
