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
  type OnInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { NdRovingFocus, type NdRovingItem } from '@ndop/primitives/internal';

/** The enclosing {@link NdToggleGroup}, injected by its items. */
export const ND_TOGGLE_GROUP = new InjectionToken<NdToggleGroup>(
  'ND_TOGGLE_GROUP',
);

/** A toggle group item as the group's roving focus sees it. */
interface ToggleRovingItem extends NdRovingItem {
  readonly item: NdToggleGroupItem;
}

/**
 * Headless toggle group: a set of toggle buttons, `button[ndToggleGroupItem]`,
 * of which one (`type="single"`) or any number (`type="multiple"`) are
 * pressed. Only one item is in the tab order; arrow keys move focus between
 * items, wrapping, and Home and End jump to the ends. Its value is always
 * an array of the pressed items' values. It's a `ControlValueAccessor`
 * that every forms library binds (ADR-0004, amendments 1 and 4).
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <div ndToggleGroup aria-label="Text alignment" [(value)]="align">
 *   <button ndToggleGroupItem value="start" aria-label="Align start">…</button>
 *   <button ndToggleGroupItem value="center" aria-label="Center">…</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndToggleGroup]',
  exportAs: 'ndToggleGroup',
  providers: [
    { provide: ND_TOGGLE_GROUP, useExisting: NdToggleGroup },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdToggleGroup),
      multi: true,
    },
  ],
  host: {
    role: 'group',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(focusout)': 'leave($event)',
  },
})
export class NdToggleGroup
  implements ControlValueAccessor, FormValueControl<readonly string[]>, OnInit
{
  /**
   * The pressed items' values, in both modes. Two-way bindable with
   * `[(value)]`.
   */
  readonly value = model<readonly string[]>([]);

  /** Initial `value` when it isn't bound. */
  readonly defaultValue = input<readonly string[]>([]);

  /**
   * `single`: pressing an item releases the others. `multiple`: items are
   * pressed independently.
   */
  readonly type = input<'single' | 'multiple'>('single');

  /** Which arrow keys move focus: left and right, or up and down. */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /** Disables every item. A disabled bound field does too. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly formDisabled = signal(false);

  /** Whether the group is disabled, by its input or by a forms library. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /**
   * The items' roving tabindex; before any item has had focus, the first
   * pressed item is the tab stop.
   */
  readonly roving: NdRovingFocus<ToggleRovingItem> = new NdRovingFocus(() =>
    this.roving.items().find((entry) => entry.item.isPressed()),
  );

  private onChange: (value: readonly string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // initial state.
    const initial = this.defaultValue();
    if (initial.length > 0 && this.value().length === 0) {
      this.value.set(initial);
    }
  }

  /**
   * Presses or releases the item with a value, unless the group is
   * disabled. In `single` mode, pressing it releases the others.
   *
   * @param value - The item's value.
   */
  toggle(value: string): void {
    if (this.isDisabled()) {
      return;
    }
    const current = this.value();
    const next = current.includes(value)
      ? current.filter((other) => other !== value)
      : this.type() === 'single'
        ? [value]
        : [...current, value];
    this.value.set(next);
    this.onChange(next);
  }

  /**
   * Sets the pressed values from a forms library.
   *
   * @param value - The field's value: an array of strings, or a string in
   *   `single` mode; anything else releases every item.
   */
  writeValue(value: unknown): void {
    this.value.set(
      Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string')
        : typeof value === 'string'
          ? [value]
          : [],
    );
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new values on user changes.
   */
  registerOnChange(fn: (value: readonly string[]) => void): void {
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
 * One toggle button of a {@link NdToggleGroup}, on a native `button`. Give
 * it a name that doesn't change with its state, such as
 * `aria-label="Bold"`.
 *
 * @example
 * ```html
 * <button ndToggleGroupItem value="bold" aria-label="Bold">…</button>
 * ```
 */
@Directive({
  selector: 'button[ndToggleGroupItem]',
  exportAs: 'ndToggleGroupItem',
  host: {
    type: 'button',
    '[attr.aria-pressed]': 'isPressed()',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-orientation]': 'group.orientation()',
    '[disabled]': 'isDisabled()',
    '(click)': 'toggle()',
    '(focus)': 'group.roving.focused(roving)',
    '(keydown)': 'keydown($event)',
  },
})
export class NdToggleGroupItem implements OnInit {
  /** The value this item adds to the group's while pressed. */
  readonly value = input.required<string>();

  /** Disables this item; arrow keys skip it. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly group = inject(ND_TOGGLE_GROUP);

  /** Whether this item is disabled, by its input or by the group. */
  readonly isDisabled = computed(
    () => this.disabled() || this.group.isDisabled(),
  );

  /** Whether this item is pressed. */
  readonly isPressed = computed(() =>
    this.group.value().includes(this.value()),
  );

  /** `on` or `off`, for `data-state`. */
  readonly state = computed(() => (this.isPressed() ? 'on' : 'off'));

  protected readonly roving: ToggleRovingItem = (() => {
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

  /** Presses or releases this item, unless it or the group is disabled. */
  toggle(): void {
    if (!this.isDisabled()) {
      this.group.toggle(this.value());
    }
  }

  /**
   * Moves focus with the arrow keys of the group's orientation, Home and
   * End.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    this.group.roving.keydown(
      event,
      this.roving,
      this.group.orientation(),
      true,
    );
  }
}
