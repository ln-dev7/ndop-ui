import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  forwardRef,
  inject,
  InjectionToken,
  input,
  model,
  signal,
  type AfterContentInit,
  type OnInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { FormCheckboxControl } from '@angular/forms/signals';
import { NdControlRegistry } from '@ndop/primitives/input';
import {
  injectFieldDescribedBy,
  injectFormState,
} from '@ndop/primitives/internal';

/** The enclosing {@link NdSwitch}, injected by its thumb. */
export const ND_SWITCH = new InjectionToken<NdSwitch>('ND_SWITCH');

/**
 * Headless switch on a native `button`: the WAI-ARIA switch pattern, an
 * on/off control that takes effect at once. It owns its value, so it's a
 * `ControlValueAccessor` that Signal Forms (`[formField]`), reactive and
 * template-driven forms bind (ADR-0004, amendments 1 and 4).
 *
 * Space and Enter turn it on or off. A label whose `for` is its `id` does
 * too.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/switch/
 *
 * @example
 * ```html
 * <button ndSwitch id="airplane" [(checked)]="airplaneMode">
 *   <span ndSwitchThumb></span>
 * </button>
 * <label ndLabel for="airplane">Airplane mode</label>
 * ```
 */
@Directive({
  selector: 'button[ndSwitch]',
  exportAs: 'ndSwitch',
  providers: [
    { provide: ND_SWITCH, useExisting: NdSwitch },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdSwitch),
      multi: true,
    },
  ],
  host: {
    type: 'button',
    role: 'switch',
    '[attr.id]': 'id()',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-required]': 'required() || null',
    '[attr.aria-invalid]': 'showInvalid() || null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-invalid]': 'showInvalid() ? "" : null',
    '[disabled]': 'isDisabled()',
    '(click)': 'toggle()',
    '(blur)': 'onTouched()',
  },
})
export class NdSwitch
  implements ControlValueAccessor, FormCheckboxControl, OnInit, AfterContentInit
{
  /** Whether it's on. Two-way bindable with `[(checked)]`. */
  readonly checked = model(false);

  /** Initial `checked` when it isn't bound. */
  readonly defaultChecked = input(false, { transform: booleanAttribute });

  /** Disables it. A disabled bound field disables it too. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Marks it required: `aria-required="true"`. */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * Marks it invalid when no forms library is bound; with one, the field's
   * state decides.
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Element id; also the key a `label[ndLabel]` uses to find it. */
  readonly id = input<string>();

  private readonly form = injectFormState();
  private readonly formDisabled = signal(false);

  /** Whether it's disabled, by its input or by a forms library. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /**
   * Whether it presents as invalid: the bound field is invalid and
   * touched, or, without a forms library, the `invalid` input is set.
   */
  readonly showInvalid = computed(() =>
    this.form.bound() ? this.form.invalid() : this.invalid(),
  );

  /** `checked` or `unchecked`, for `data-state`. */
  readonly state = computed(() => (this.checked() ? 'checked' : 'unchecked'));

  protected readonly describedBy = injectFieldDescribedBy({
    invalid: this.showInvalid,
    disabled: this.isDisabled,
  });

  private onChange: (checked: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  constructor() {
    const registry = inject(NdControlRegistry);
    effect((onCleanup) => {
      const id = this.id();
      if (id) {
        onCleanup(
          registry.register(id, {
            disabled: this.isDisabled,
            invalid: this.showInvalid,
          }),
        );
      }
    });
  }

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // initial state.
    if (this.defaultChecked()) {
      this.checked.set(true);
    }
  }

  ngAfterContentInit(): void {
    this.form.connect();
  }

  /** Turns it on if off, and off if on, unless it's disabled. */
  toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    const checked = !this.checked();
    this.checked.set(checked);
    this.onChange(checked);
  }

  /**
   * Sets the checked state from a forms library.
   *
   * @param value - The field's value; anything truthy turns it on.
   */
  writeValue(value: unknown): void {
    this.checked.set(Boolean(value));
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new state on user changes.
   */
  registerOnChange(fn: (checked: boolean) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the switch.
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

/**
 * The thumb of a {@link NdSwitch}: presentational, with the switch's
 * `data-state` for styling its position.
 *
 * @example
 * ```html
 * <span ndSwitchThumb></span>
 * ```
 */
@Directive({
  selector: '[ndSwitchThumb]',
  host: { '[attr.data-state]': 'switchControl.state()' },
})
export class NdSwitchThumb {
  protected readonly switchControl = inject(ND_SWITCH);
}
