import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
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
import type { FormValueControl } from '@angular/forms/signals';
import {
  injectFieldDescribedBy,
  injectFormState,
  NdRovingFocus,
  type NdRovingItem,
} from '@ndop/primitives/internal';

/** The enclosing {@link NdRadioGroup}, injected by its items. */
export const ND_RADIO_GROUP = new InjectionToken<NdRadioGroup>(
  'ND_RADIO_GROUP',
);

/** The enclosing {@link NdRadioGroupItem}, injected by its indicator. */
export const ND_RADIO_GROUP_ITEM = new InjectionToken<NdRadioGroupItem>(
  'ND_RADIO_GROUP_ITEM',
);

/** A radio group item as the group's roving focus sees it. */
interface RadioRovingItem extends NdRovingItem {
  readonly item: NdRadioGroupItem;
}

/**
 * Headless radio group: the WAI-ARIA radio group pattern, a set of
 * `button[ndRadioGroupItem]`s of which one at most is checked. Only one
 * item is in the tab order, and arrow keys move focus and the selection
 * together, wrapping, mirrored in right-to-left layouts. It owns its
 * value, so it's a `ControlValueAccessor` that Signal Forms
 * (`[formField]`), reactive and template-driven forms bind (ADR-0004,
 * amendments 1 and 4).
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 *
 * @example
 * ```html
 * <div ndRadioGroup aria-label="Plan" [(value)]="plan">
 *   <button ndRadioGroupItem value="free" id="free"></button>
 *   <label ndLabel for="free">Free</label>
 *   <button ndRadioGroupItem value="pro" id="pro"></button>
 *   <label ndLabel for="pro">Pro</label>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndRadioGroup]',
  exportAs: 'ndRadioGroup',
  providers: [
    { provide: ND_RADIO_GROUP, useExisting: NdRadioGroup },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdRadioGroup),
      multi: true,
    },
  ],
  host: {
    role: 'radiogroup',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-required]': 'required() || null',
    '[attr.aria-invalid]': 'showInvalid() || null',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-invalid]': 'showInvalid() ? "" : null',
    '(focusout)': 'leave($event)',
  },
})
export class NdRadioGroup
  implements
    ControlValueAccessor,
    FormValueControl<string | null>,
    OnInit,
    AfterContentInit
{
  /**
   * The checked item's value, or `null` when none is checked. Two-way
   * bindable with `[(value)]`.
   */
  readonly value = model<string | null>(null);

  /** Initial `value` when it isn't bound. */
  readonly defaultValue = input<string | null>(null);

  /**
   * The items' layout, for `aria-orientation` and `data-orientation`. All
   * four arrow keys work either way.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');

  /** Disables every item. A disabled bound field does too. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Marks the group required: `aria-required="true"`. */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * Marks the group invalid when no forms library is bound; with one, the
   * field's state decides.
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly form = injectFormState();
  private readonly formDisabled = signal(false);

  /** Whether the group is disabled, by its input or by a forms library. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /**
   * Whether the group presents as invalid: the bound field is invalid and
   * touched, or, without a forms library, the `invalid` input is set.
   */
  readonly showInvalid = computed(() =>
    this.form.bound() ? this.form.invalid() : this.invalid(),
  );

  /** The items' roving tabindex; the checked item is the first tab stop. */
  readonly roving: NdRovingFocus<RadioRovingItem> = new NdRovingFocus(() =>
    this.roving.items().find((entry) => entry.item.isChecked()),
  );

  protected readonly describedBy = injectFieldDescribedBy({
    invalid: this.showInvalid,
    disabled: this.isDisabled,
  });

  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // initial state.
    const initial = this.defaultValue();
    if (initial !== null && this.value() === null) {
      this.value.set(initial);
    }
  }

  ngAfterContentInit(): void {
    this.form.connect();
  }

  /**
   * Checks the item with a value, unless the group is disabled.
   *
   * @param value - The item's value.
   */
  select(value: string): void {
    if (this.isDisabled() || this.value() === value) {
      return;
    }
    this.value.set(value);
    this.onChange(value);
  }

  /**
   * Sets the checked value from a forms library.
   *
   * @param value - The field's value; anything but a string checks none.
   */
  writeValue(value: unknown): void {
    this.value.set(typeof value === 'string' ? value : null);
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new value on user changes.
   */
  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the group.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Disables or enables the group from a forms library.
   *
   * @param disabled - Whether the field is disabled.
   */
  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  /**
   * Marks the field touched when focus leaves the group, not when it moves
   * between items.
   *
   * @param event - The focusout event.
   */
  protected leave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node && this.element.contains(next))) {
      this.onTouched();
    }
  }
}

/**
 * One radio button of a {@link NdRadioGroup}, on a native `button`. Name it
 * with a `label[ndLabel]` whose `for` is its `id`, or with `aria-label`.
 *
 * @example
 * ```html
 * <button ndRadioGroupItem value="pro" id="pro">
 *   <span ndRadioGroupIndicator></span>
 * </button>
 * ```
 */
@Directive({
  selector: 'button[ndRadioGroupItem]',
  exportAs: 'ndRadioGroupItem',
  providers: [{ provide: ND_RADIO_GROUP_ITEM, useExisting: NdRadioGroupItem }],
  host: {
    type: 'button',
    role: 'radio',
    '[attr.aria-checked]': 'isChecked()',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-orientation]': 'group.orientation()',
    '[disabled]': 'isDisabled()',
    '(click)': 'check()',
    '(focus)': 'group.roving.focused(roving)',
    '(keydown)': 'keydown($event)',
  },
})
export class NdRadioGroupItem implements OnInit {
  /** The value the group takes when this item is checked. */
  readonly value = input.required<string>();

  /** Disables this item; arrow keys skip it. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly group = inject(ND_RADIO_GROUP);

  /** Whether this item is disabled, by its input or by the group. */
  readonly isDisabled = computed(
    () => this.disabled() || this.group.isDisabled(),
  );

  /** Whether this item is checked. */
  readonly isChecked = computed(() => this.group.value() === this.value());

  /** `checked` or `unchecked`, for `data-state`. */
  readonly state = computed(() => (this.isChecked() ? 'checked' : 'unchecked'));

  protected readonly roving: RadioRovingItem = (() => {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const isDisabled = this.isDisabled;
    return {
      item: this,
      element,
      focus: () => element.focus(),
      get disabled() {
        return isDisabled();
      },
    };
  })();

  protected readonly tabIndex = computed(() =>
    this.group.roving.tabStop() === this.roving ? 0 : -1,
  );

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Joins the group once its inputs are set: the group's tab stop reads
    // every item's value, and a required input can't be read before then.
    this.destroyRef.onDestroy(this.group.roving.register(this.roving));
  }

  /** Checks this item, unless it or the group is disabled. */
  check(): void {
    if (!this.isDisabled()) {
      this.group.select(this.value());
    }
  }

  /**
   * Moves focus and the selection with the arrow keys; stops Enter, which
   * doesn't check a native radio button.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    this.group.roving.keydown(event, this.roving, 'both')?.item.check();
  }
}

/**
 * The dot of a {@link NdRadioGroupItem}. It has the `hidden` attribute while
 * its item is unchecked.
 *
 * @example
 * ```html
 * <span ndRadioGroupIndicator></span>
 * ```
 */
@Directive({
  selector: '[ndRadioGroupIndicator]',
  host: {
    '[attr.data-state]': 'item.state()',
    '[attr.hidden]': 'item.isChecked() ? null : ""',
  },
})
export class NdRadioGroupIndicator {
  protected readonly item = inject(ND_RADIO_GROUP_ITEM);
}
