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

/** The enclosing {@link NdCheckbox}, injected by its indicator. */
export const ND_CHECKBOX = new InjectionToken<NdCheckbox>('ND_CHECKBOX');

/** A checkbox's `data-state`. */
export type NdCheckboxState = 'checked' | 'unchecked' | 'indeterminate';

/**
 * Headless checkbox on a native `button`: the WAI-ARIA checkbox pattern,
 * dual-state or, with `indeterminate`, mixed. It owns its value, so it's a
 * `ControlValueAccessor` that Signal Forms (`[formField]`), reactive and
 * template-driven forms bind (ADR-0004, amendments 1 and 4).
 *
 * Space toggles it; Enter does nothing, as for a native checkbox. A label
 * whose `for` is its `id` toggles it too.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
 *
 * @example
 * ```html
 * <button ndCheckbox id="terms" [(checked)]="accepted">
 *   <span ndCheckboxIndicator>✓</span>
 * </button>
 * <label ndLabel for="terms">Accept the terms</label>
 * ```
 */
@Directive({
  selector: 'button[ndCheckbox]',
  exportAs: 'ndCheckbox',
  providers: [
    { provide: ND_CHECKBOX, useExisting: NdCheckbox },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdCheckbox),
      multi: true,
    },
  ],
  host: {
    type: 'button',
    role: 'checkbox',
    '[attr.id]': 'id()',
    '[attr.aria-checked]': 'indeterminate() ? "mixed" : checked()',
    '[attr.aria-required]': 'required() || null',
    '[attr.aria-invalid]': 'showInvalid() || null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-invalid]': 'showInvalid() ? "" : null',
    '[disabled]': 'isDisabled()',
    '(click)': 'toggle()',
    // Checkboxes don't activate on Enter (APG), and a native button would.
    '(keydown.enter)': '$event.preventDefault()',
    '(blur)': 'onTouched()',
  },
})
export class NdCheckbox
  implements ControlValueAccessor, FormCheckboxControl, OnInit, AfterContentInit
{
  /** Whether it's checked. Two-way bindable with `[(checked)]`. */
  readonly checked = model(false);

  /**
   * Whether it's mixed: `aria-checked="mixed"` whatever `checked` is.
   * Activating it clears this. Two-way bindable.
   */
  readonly indeterminate = model(false);

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

  /** `checked`, `unchecked` or `indeterminate`, for `data-state`. */
  readonly state = computed<NdCheckboxState>(() =>
    this.indeterminate()
      ? 'indeterminate'
      : this.checked()
        ? 'checked'
        : 'unchecked',
  );

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

  /**
   * Checks it if unchecked or mixed, and unchecks it if checked, unless
   * it's disabled.
   */
  toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    const checked = this.indeterminate() || !this.checked();
    this.indeterminate.set(false);
    this.checked.set(checked);
    this.onChange(checked);
  }

  /**
   * Sets the checked state from a forms library.
   *
   * @param value - The field's value; anything truthy checks it.
   */
  writeValue(value: unknown): void {
    this.checked.set(Boolean(value));
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new checked state on user changes.
   */
  registerOnChange(fn: (checked: boolean) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the checkbox.
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
 * The checkmark of a {@link NdCheckbox}. It has the `hidden` attribute
 * while the checkbox is unchecked, so what's inside shows only while it's
 * checked or mixed.
 *
 * @example
 * ```html
 * <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndCheckboxIndicator]',
  host: {
    '[attr.data-state]': 'checkbox.state()',
    '[attr.hidden]': 'checkbox.state() === "unchecked" ? "" : null',
  },
})
export class NdCheckboxIndicator {
  protected readonly checkbox = inject(ND_CHECKBOX);
}
