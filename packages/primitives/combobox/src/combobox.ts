import { Directionality } from '@angular/cdk/bidi';
import {
  createFlexibleConnectedPositionStrategy,
  createRepositionScrollStrategy,
  type FlexibleConnectedPositionStrategy,
  type OverlayRef,
} from '@angular/cdk/overlay';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  forwardRef,
  HostAttributeToken,
  inject,
  InjectionToken,
  Injector,
  input,
  model,
  numberAttribute,
  signal,
  untracked,
  type AfterContentInit,
  type OnInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import {
  connectedPositions,
  injectFieldDescribedBy,
  injectFormState,
  injectId,
  injectOverlay,
  NdActiveList,
  ndContainsFilter,
  placementOf,
  readableText,
  type NdActiveOption,
  type NdAlign,
  type NdFilter,
  type NdPlacement,
  type NdSide,
} from '@ndop/primitives/internal';

export {
  ndContainsFilter,
  type NdAlign,
  type NdFilter,
  type NdSide,
} from '@ndop/primitives/internal';

/** The enclosing {@link NdCombobox}, injected by its parts. */
export const ND_COMBOBOX = new InjectionToken<NdCombobox>('ND_COMBOBOX');

/** The enclosing {@link NdComboboxItem}, injected by its indicator. */
export const ND_COMBOBOX_ITEM = new InjectionToken<NdComboboxItem>(
  'ND_COMBOBOX_ITEM',
);

/** The enclosing {@link NdComboboxGroup}, injected by its parts. */
export const ND_COMBOBOX_GROUP = new InjectionToken<NdComboboxGroup>(
  'ND_COMBOBOX_GROUP',
);

/** The enclosing {@link NdComboboxChip}, injected by its remove button. */
export const ND_COMBOBOX_CHIP = new InjectionToken<NdComboboxChip>(
  'ND_COMBOBOX_CHIP',
);

/** An option as the list's key manager sees it. */
interface ComboboxOption extends NdActiveOption {
  readonly item: NdComboboxItem;
}

/**
 * Root of a combobox: the WAI-ARIA editable combobox pattern with list
 * autocomplete, a text field that filters a popup listbox of options.
 * Focus stays in the field while `aria-activedescendant` points at the
 * highlighted option, on the CDK's `ActiveDescendantKeyManager`; the popup
 * is written in place and opening moves it into a CDK overlay. With
 * `multiple`, chosen options show as chips. Put it on an `ng-container`,
 * and bind forms on the {@link NdComboboxInput}.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
 *
 * @example
 * ```html
 * <ng-container ndCombobox [(value)]="framework">
 *   <input ndComboboxInput aria-label="Framework" />
 *   <div ndComboboxContent>
 *     <div ndComboboxList>
 *       <div ndComboboxEmpty>No framework found.</div>
 *       <div ndComboboxItem value="angular">Angular</div>
 *     </div>
 *   </div>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndCombobox]',
  exportAs: 'ndCombobox',
  providers: [{ provide: ND_COMBOBOX, useExisting: NdCombobox }],
})
export class NdCombobox {
  /**
   * The chosen option's value, or `null`, without `multiple`. Two-way
   * bindable with `[(value)]`.
   */
  readonly value = model<string | null>(null);

  /**
   * The chosen options' values, with `multiple`. Two-way bindable with
   * `[(values)]`.
   */
  readonly values = model<readonly string[]>([]);

  /** Lets several options be chosen, shown as chips. */
  readonly multiple = input(false, { transform: booleanAttribute });

  /** The field's text. Two-way bindable with `[(search)]`. */
  readonly search = model('');

  /** Whether the popup is open. Two-way bindable with `[(open)]`. */
  readonly open = model(false);

  /**
   * Tests whether an option matches what was typed; `null` shows every
   * option, for lists filtered elsewhere.
   */
  readonly filter = input<NdFilter | null>(ndContainsFilter);

  /** Highlights the first shown option as the user types. */
  readonly autoHighlight = input(false, { transform: booleanAttribute });

  /** Disables the field. A disabled bound field does too. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Marks the combobox required: `aria-required="true"` on the field. */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * Marks the combobox invalid when no forms library is bound; with one,
   * the field's state decides.
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Whether a forms library disabled it. */
  readonly formDisabled = signal(false);

  /** Whether it's disabled, by its input or by a forms library. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /** Id of the listbox, for the field's `aria-controls`. */
  readonly listId = injectId('nd-combobox-list');

  /** The options and which one is highlighted. */
  readonly list = new NdActiveList<ComboboxOption>();

  /** Where the popup sits, after any flip. */
  readonly placement = signal<NdPlacement>({ side: 'bottom', align: 'start' });

  /** Ids of the field's labels, which name the listbox; set on opening. */
  readonly labelledBy = signal<string | null>(null);

  /** The field's `aria-label`, which names the listbox when it has one. */
  readonly label = signal<string | null>(null);

  /** Whether the user has typed since the field last showed a choice. */
  private readonly typed = signal(false);

  /** What filters the options: the field's text once the user types. */
  readonly query = computed(() => (this.typed() ? this.search().trim() : ''));

  /** How many options are shown. */
  readonly shownCount = computed(
    () => this.list.items().filter((option) => option.item.isShown()).length,
  );

  /** The chosen option without `multiple`, if it's one of the options. */
  readonly selectedItem = computed(() =>
    this.list
      .items()
      .map((option) => option.item)
      .find((item) => item.value() === this.value()),
  );

  /** The field element. */
  input: HTMLInputElement | null = null;

  /** The chips element, which the popup sits below when there is one. */
  chips: HTMLElement | null = null;

  /** The popup element. */
  content: HTMLElement | null = null;

  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly directionality = inject(Directionality);
  private preferred: NdPlacement = { side: 'bottom', align: 'start' };
  private offset = 6;
  private strategy: FlexibleConnectedPositionStrategy | null = null;
  private listening = false;

  private readonly overlay = injectOverlay({
    config: (injector) => {
      const strategy = createFlexibleConnectedPositionStrategy(
        injector,
        this.anchor(),
      )
        .withPositions(this.positions())
        .withFlexibleDimensions(false)
        .withPush(false);
      strategy.positionChanges.subscribe((change) =>
        this.placement.set(placementOf(change.connectionPair)),
      );
      this.strategy = strategy;
      return {
        positionStrategy: strategy,
        scrollStrategy: createRepositionScrollStrategy(injector),
        direction: this.directionality,
      };
    },
  });

  constructor() {
    effect(() => (this.open() ? this.show() : this.hide()));
    // Without `multiple`, the field shows the chosen option's text until
    // the user types.
    effect(() => {
      const label = this.selectedItem()?.text();
      if (!this.multiple() && !untracked(this.typed)) {
        this.search.set(label ?? '');
      }
    });
    // A new query hides options; the highlight never stays on a hidden one.
    effect(() => {
      this.query();
      this.list.items().forEach((option) => option.item.isShown());
      untracked(() => {
        const active = this.list.active();
        if (this.autoHighlight() && this.typed()) {
          this.highlightFirst();
        } else if (active && !active.item.isShown()) {
          this.list.clear();
        }
      });
    });
  }

  /**
   * Sets what to call when the user changes the value, for a forms
   * library.
   *
   * @param fn - The callback.
   */
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  /**
   * Sets what to call when focus leaves the combobox, for a forms library.
   *
   * @param fn - The callback.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Registers the popup, which moves into the overlay while open.
   *
   * @param element - The popup element.
   */
  registerContent(element: HTMLElement): void {
    this.content = element;
    this.overlay.setElement(element);
  }

  /**
   * Whether an option's value is chosen.
   *
   * @param value - The option's value.
   * @returns `true` when it is.
   */
  isChosen(value: string): boolean {
    return this.multiple()
      ? this.values().includes(value)
      : this.value() === value;
  }

  /**
   * Tests an option's text against the query.
   *
   * @param text - The option's text.
   * @returns Whether it's shown.
   */
  matches(text: string): boolean {
    const query = this.query();
    const filter = this.filter();
    return !filter || !query || filter(text, query);
  }

  /**
   * Updates the field's text as the user types, opening the popup.
   *
   * @param text - The field's new text.
   */
  type(text: string): void {
    this.search.set(text);
    this.typed.set(true);
    if (!this.isDisabled()) {
      this.open.set(true);
    }
  }

  /**
   * Opens the popup, optionally highlighting an option.
   *
   * @param highlight - `first` highlights the chosen option or the first,
   *   `last` the last, `none` nothing.
   */
  openWith(highlight: 'first' | 'last' | 'none'): void {
    if (this.isDisabled()) {
      return;
    }
    this.open.set(true);
    if (highlight === 'last') {
      this.list.last();
    } else if (highlight === 'first') {
      const chosen = this.list
        .selectable()
        .find((option) => this.isChosen(option.item.value()));
      if (chosen) {
        this.list.set(chosen);
      } else {
        this.highlightFirst();
      }
    }
  }

  /** Opens the popup if closed, or closes it, keeping focus in the field. */
  toggle(): void {
    if (this.open()) {
      this.open.set(false);
    } else {
      this.openWith('none');
    }
    this.input?.focus();
  }

  /**
   * Chooses an option. Without `multiple`, the field shows its text and the
   * popup closes; with it, the option toggles and the field empties.
   *
   * @param item - The option.
   */
  choose(item: NdComboboxItem): void {
    if (item.disabled()) {
      return;
    }
    const value = item.value();
    if (this.multiple()) {
      const values = this.values();
      const next = values.includes(value)
        ? values.filter((other) => other !== value)
        : [...values, value];
      this.values.set(next);
      this.onChange(next);
      this.typed.set(false);
      this.search.set('');
      return;
    }
    if (this.value() !== value) {
      this.value.set(value);
      this.onChange(value);
    }
    this.typed.set(false);
    this.search.set(item.text());
    this.open.set(false);
  }

  /**
   * Removes a chosen value, with `multiple`.
   *
   * @param value - The value.
   */
  remove(value: string): void {
    const next = this.values().filter((other) => other !== value);
    this.values.set(next);
    this.onChange(next);
    this.input?.focus();
  }

  /** Empties the field and the value, keeping focus in the field. */
  clear(): void {
    this.typed.set(false);
    this.search.set('');
    if (this.multiple()) {
      if (this.values().length > 0) {
        this.values.set([]);
        this.onChange([]);
      }
    } else if (this.value() !== null) {
      this.value.set(null);
      this.onChange(null);
    }
    this.input?.focus();
  }

  /**
   * When focus leaves the combobox: closes the popup, settles the field's
   * text and marks a bound field touched.
   *
   * @param event - The focusout event.
   */
  leave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.contains(next)) {
      return;
    }
    this.open.set(false);
    if (!this.multiple() && this.typed()) {
      if (this.search().trim() === '') {
        this.clear();
      } else {
        this.typed.set(false);
        this.search.set(this.selectedItem()?.text() ?? '');
      }
    } else if (this.multiple()) {
      this.typed.set(false);
      this.search.set('');
    }
    this.onTouched();
  }

  /**
   * Sets the preferred side, alignment and offset, from the popup's inputs.
   *
   * @param placement - Preferred side and alignment.
   * @param offset - Gap from the field, in pixels.
   */
  setPositioning(placement: NdPlacement, offset: number): void {
    this.preferred = placement;
    this.offset = offset;
    this.placement.set(placement);
    this.strategy?.withPositions(this.positions());
  }

  /**
   * Whether a node is part of the combobox: its field, chips or popup.
   *
   * @param node - The node.
   * @returns `true` when it is.
   */
  contains(node: Node): boolean {
    return [this.input, this.chips, this.content].some((element) =>
      element?.contains(node),
    );
  }

  /** Highlights the first shown, enabled option, if any. */
  private highlightFirst(): void {
    if (this.list.selectable().length > 0) {
      this.list.first();
    } else {
      this.list.clear();
    }
  }

  /**
   * What the popup sits below: the chips, or else the field.
   *
   * @returns The anchor element.
   */
  private anchor(): HTMLElement {
    return this.chips ?? this.input ?? this.document.body;
  }

  /**
   * CDK positions for the preferred placement.
   *
   * @returns Preferred position, then its fallback.
   */
  private positions() {
    return connectedPositions(
      this.preferred,
      this.offset,
      this.directionality.value === 'rtl',
    );
  }

  /** Moves the popup into the overlay below the anchor. */
  private show(): void {
    untracked(() => this.nameList());
    const ref = this.overlay.attach();
    if (!ref) {
      return;
    }
    this.listen(ref);
    afterNextRender(
      () => {
        if (untracked(this.open) && this.content) {
          // The overlay pane is a flex container, so the popup itself
          // carries the width; the styled layer reads the variable.
          const width = `${this.anchor().getBoundingClientRect().width}px`;
          this.content.style.setProperty('--nd-combobox-anchor-width', width);
          this.content.style.minWidth = width;
          ref.updatePosition();
        }
      },
      { injector: this.injector },
    );
  }

  /** Puts the popup back and leaves no option highlighted. */
  private hide(): void {
    this.overlay.detach();
    untracked(() => this.list.clear());
  }

  /** Names the listbox after the field's labels, or its `aria-label`. */
  private nameList(): void {
    const field = this.input;
    const own = field?.getAttribute('aria-labelledby');
    const labels = Array.from(field?.labels ?? []);
    labels.forEach((label, index) => {
      label.id ||= `${this.listId}-label-${index}`;
    });
    this.labelledBy.set(
      own || labels.map((label) => label.id).join(' ') || null,
    );
    this.label.set(field?.getAttribute('aria-label') ?? null);
  }

  /**
   * Closes on presses outside the combobox.
   *
   * @param ref - The overlay, subscribed once.
   */
  private listen(ref: OverlayRef): void {
    if (this.listening) {
      return;
    }
    this.listening = true;
    ref.outsidePointerEvents().subscribe((event) => {
      const target = event.target as Node | null;
      if (!target || !this.contains(target)) {
        this.open.set(false);
      }
    });
  }
}

/**
 * The text field (`role="combobox"`), on a native `input`. Typing filters
 * the popup's options; the arrow keys, `Enter` and `Escape` work from here
 * while focus stays in it. The combobox owns its value, so this is a
 * `ControlValueAccessor`: bind Signal Forms (`[formField]`), reactive or
 * template-driven forms here (ADR-0004, amendments 1 and 4).
 *
 * @example
 * ```html
 * <input ndComboboxInput id="framework" placeholder="Select a framework" />
 * ```
 */
@Directive({
  selector: 'input[ndComboboxInput]',
  exportAs: 'ndComboboxInput',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdComboboxInput),
      multi: true,
    },
  ],
  host: {
    type: 'text',
    role: 'combobox',
    autocomplete: 'off',
    'aria-autocomplete': 'list',
    '[attr.aria-expanded]': 'combobox.open()',
    '[attr.aria-controls]': 'combobox.listId',
    '[attr.aria-activedescendant]': 'combobox.list.active()?.item?.id ?? null',
    '[attr.aria-required]': 'combobox.required() || null',
    '[attr.aria-invalid]': 'showInvalid() || null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-state]': 'combobox.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'combobox.isDisabled() ? "" : null',
    '[attr.data-invalid]': 'showInvalid() ? "" : null',
    '[disabled]': 'combobox.isDisabled()',
    '[value]': 'combobox.search()',
    '(input)': 'combobox.type($any($event.target).value)',
    '(keydown)': 'keydown($event)',
    '(focusout)': 'combobox.leave($event)',
  },
})
export class NdComboboxInput implements ControlValueAccessor, AfterContentInit {
  protected readonly combobox = inject(ND_COMBOBOX);
  private readonly form = injectFormState();

  /**
   * Whether it presents as invalid: the bound field is invalid and
   * touched, or, without a forms library, the combobox's `invalid` input.
   */
  readonly showInvalid = computed(() =>
    this.form.bound() ? this.form.invalid() : this.combobox.invalid(),
  );

  protected readonly describedBy = injectFieldDescribedBy({
    invalid: this.showInvalid,
    disabled: this.combobox.isDisabled,
  });

  constructor() {
    this.combobox.input =
      inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  }

  ngAfterContentInit(): void {
    this.form.connect();
  }

  /**
   * Sets the value from a forms library.
   *
   * @param value - A string without `multiple`, a list of strings with it.
   */
  writeValue(value: unknown): void {
    if (this.combobox.multiple()) {
      this.combobox.values.set(
        Array.isArray(value)
          ? value.filter((entry) => typeof entry === 'string')
          : [],
      );
    } else {
      this.combobox.value.set(typeof value === 'string' ? value : null);
    }
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new value on user changes.
   */
  registerOnChange(fn: (value: unknown) => void): void {
    this.combobox.registerOnChange(fn);
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the combobox.
   */
  registerOnTouched(fn: () => void): void {
    this.combobox.registerOnTouched(fn);
  }

  /**
   * Disables or enables the combobox from a forms library.
   *
   * @param disabled - Whether the field is disabled.
   */
  setDisabledState(disabled: boolean): void {
    this.combobox.formDisabled.set(disabled);
  }

  /**
   * Handles the combobox keys; see the keyboard map in `spec.md`.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    const combobox = this.combobox;
    const open = combobox.open();
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        if (!open) {
          event.preventDefault();
          combobox.openWith(
            event.altKey ? 'none' : event.key === 'ArrowUp' ? 'last' : 'first',
          );
          return;
        }
        combobox.list.keydown(event, false);
        return;
      case 'Enter': {
        const active = combobox.list.active();
        if (open && active && !event.isComposing) {
          event.preventDefault();
          combobox.choose(active.item);
        }
        return;
      }
      case 'Escape':
        // Inside a dialog, Escape closes the popup, not the dialog.
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          combobox.open.set(false);
        } else if (combobox.search() || combobox.value() !== null) {
          event.preventDefault();
          event.stopPropagation();
          combobox.clear();
        }
        return;
      case 'Backspace': {
        const last = combobox.values().at(-1);
        if (combobox.multiple() && combobox.search() === '' && last) {
          combobox.remove(last);
        }
        return;
      }
    }
  }
}

/**
 * A button that opens and closes the popup with the pointer, keeping focus
 * in the field. It's out of the tab order and hidden from assistive
 * technology, which use `Alt+ArrowDown` from the field.
 *
 * @example
 * ```html
 * <button ndComboboxTrigger><svg ndIcon="chevron-down"></svg></button>
 * ```
 */
@Directive({
  selector: 'button[ndComboboxTrigger]',
  host: {
    type: 'button',
    tabindex: '-1',
    'aria-hidden': 'true',
    '[attr.data-state]': 'combobox.open() ? "open" : "closed"',
    '[disabled]': 'combobox.isDisabled()',
    '(pointerdown)': '$event.preventDefault()',
    '(click)': 'combobox.toggle()',
  },
})
export class NdComboboxTrigger {
  protected readonly combobox = inject(ND_COMBOBOX);
}

/**
 * A button that empties the field and the value with the pointer, keeping
 * focus in the field, as `Escape` does from it. It's out of the tab order,
 * hidden from assistive technology, and has the `hidden` attribute while
 * there is nothing to clear.
 *
 * @example
 * ```html
 * <button ndComboboxClear><svg ndIcon="x"></svg></button>
 * ```
 */
@Directive({
  selector: 'button[ndComboboxClear]',
  host: {
    type: 'button',
    tabindex: '-1',
    'aria-hidden': 'true',
    '[attr.hidden]': 'empty() ? "" : null',
    '[disabled]': 'combobox.isDisabled()',
    '(pointerdown)': '$event.preventDefault()',
    '(click)': 'combobox.clear()',
  },
})
export class NdComboboxClear {
  protected readonly combobox = inject(ND_COMBOBOX);

  protected readonly empty = computed(
    () =>
      this.combobox.search() === '' &&
      this.combobox.value() === null &&
      this.combobox.values().length === 0,
  );
}

/**
 * The popup. Write it after the field: it has the `hidden` attribute while
 * closed, and opening moves it into an overlay below the chips, or else
 * the field. `data-empty` marks it while no option is shown.
 *
 * @example
 * ```html
 * <div ndComboboxContent><div ndComboboxList>…</div></div>
 * ```
 */
@Directive({
  selector: '[ndComboboxContent]',
  host: {
    '[attr.hidden]': 'combobox.open() ? null : ""',
    '[attr.data-state]': 'combobox.open() ? "open" : "closed"',
    '[attr.data-side]': 'combobox.placement().side',
    '[attr.data-align]': 'combobox.placement().align',
    '[attr.data-empty]': 'combobox.shownCount() === 0 ? "" : null',
    // Pressing anywhere in the popup keeps focus in the field.
    '(pointerdown)': '$event.preventDefault()',
  },
})
export class NdComboboxContent implements OnInit {
  /** Side of the anchor it opens on, before flipping. */
  readonly side = input<NdSide>('bottom');

  /** Alignment along that side. */
  readonly align = input<NdAlign>('start');

  /** Gap between the anchor and the popup, in pixels. */
  readonly sideOffset = input(6, { transform: numberAttribute });

  protected readonly combobox = inject(ND_COMBOBOX);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() =>
      this.combobox.setPositioning(
        { side: this.side(), align: this.align() },
        this.sideOffset(),
      ),
    );
  }

  ngOnInit(): void {
    this.combobox.registerContent(this.element);
  }
}

/**
 * The listbox of options (`role="listbox"`), named after the field's
 * labels unless it has its own `aria-label`.
 *
 * @example
 * ```html
 * <div ndComboboxList>…</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxList]',
  host: {
    role: 'listbox',
    '[id]': 'combobox.listId',
    '[attr.aria-labelledby]': 'ownLabel ? null : combobox.labelledBy()',
    '[attr.aria-label]':
      'ownLabel ?? (combobox.labelledBy() ? null : combobox.label())',
    '[attr.aria-multiselectable]': 'combobox.multiple() || null',
    '[attr.data-empty]': 'combobox.shownCount() === 0 ? "" : null',
  },
})
export class NdComboboxList {
  protected readonly combobox = inject(ND_COMBOBOX);
  protected readonly ownLabel = inject(new HostAttributeToken('aria-label'), {
    optional: true,
  });
}

/**
 * Groups options (`role="group"`), named by its {@link NdComboboxLabel}.
 * It's hidden while none of its options is shown.
 *
 * @example
 * ```html
 * <div ndComboboxGroup>
 *   <div ndComboboxLabel>Frontend</div>
 *   …
 * </div>
 * ```
 */
@Directive({
  selector: '[ndComboboxGroup]',
  providers: [{ provide: ND_COMBOBOX_GROUP, useExisting: NdComboboxGroup }],
  host: {
    role: 'group',
    '[attr.aria-labelledby]': 'labelId()',
    '[attr.hidden]': 'isShown() ? null : ""',
  },
})
export class NdComboboxGroup {
  /** Id of its label, once it has one. */
  readonly labelId = signal<string | null>(null);

  private readonly items = signal<readonly NdComboboxItem[]>([]);

  /** Whether any of its options is shown. */
  readonly isShown = computed(() =>
    this.items().some((item) => item.isShown()),
  );

  /**
   * Adds an option.
   *
   * @param item - The option.
   * @returns A function that removes it.
   */
  register(item: NdComboboxItem): () => void {
    this.items.update((items) => [...items, item]);
    return () =>
      this.items.update((items) => items.filter((other) => other !== item));
  }
}

/**
 * The heading of a {@link NdComboboxGroup}, which names the group.
 *
 * @example
 * ```html
 * <div ndComboboxLabel>Frontend</div>
 * ```
 */
@Directive({ selector: '[ndComboboxLabel]', host: { '[id]': 'id' } })
export class NdComboboxLabel {
  /** Its element id. */
  readonly id = injectId('nd-combobox-label');

  constructor() {
    inject(ND_COMBOBOX_GROUP, { optional: true })?.labelId.set(this.id);
  }
}

/**
 * One option (`role="option"`). Clicking it, or `Enter` while it's
 * highlighted, chooses it. It's hidden while the field's text doesn't
 * match it.
 *
 * @example
 * ```html
 * <div ndComboboxItem value="angular">Angular</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxItem]',
  exportAs: 'ndComboboxItem',
  providers: [{ provide: ND_COMBOBOX_ITEM, useExisting: NdComboboxItem }],
  host: {
    role: 'option',
    '[id]': 'id',
    '[attr.aria-selected]': 'combobox.multiple() ? isChosen() : isActive()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-highlighted]': 'isActive() ? "" : null',
    '[attr.data-selected]': 'isChosen() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.hidden]': 'isShown() ? null : ""',
    '(click)': 'choose()',
    '(pointermove)': 'highlight()',
  },
})
export class NdComboboxItem implements OnInit, AfterContentInit {
  /** The value choosing it gives the combobox. */
  readonly value = input.required<string>();

  /** Makes it unchoosable; the arrow keys skip it. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Its text, when it differs from what it renders. */
  readonly label = input<string | null>(null);

  /** Its element id, for `aria-activedescendant`. */
  readonly id = injectId('nd-combobox-item');

  protected readonly combobox = inject(ND_COMBOBOX);
  private readonly group = inject(ND_COMBOBOX_GROUP, { optional: true });
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly rendered = signal('');
  private readonly destroyRef = inject(DestroyRef);

  /** Its text: `label`, or what it renders. */
  readonly text = computed(() => this.label() ?? this.rendered());

  /** Whether the field's text matches it. */
  readonly isShown = computed(() => this.combobox.matches(this.text()));

  /** Whether it's chosen. */
  readonly isChosen = computed(() => this.combobox.isChosen(this.value()));

  protected readonly option: ComboboxOption = (() => {
    const disabled = this.disabled;
    const shown = this.isShown;
    return {
      item: this,
      element: this.element,
      get disabled() {
        return disabled();
      },
      get visible() {
        return shown();
      },
      setActiveStyles: () => undefined,
      setInactiveStyles: () => undefined,
      getLabel: () => this.text(),
    };
  })();

  /** Whether it's highlighted. */
  readonly isActive = computed(
    () => this.combobox.list.active() === this.option,
  );

  constructor() {
    afterRenderEffect(() => {
      if (this.isActive()) {
        // jsdom has no scrollIntoView.
        this.element.scrollIntoView?.({ block: 'nearest' });
      }
    });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(this.combobox.list.register(this.option));
    if (this.group) {
      this.destroyRef.onDestroy(this.group.register(this));
    }
  }

  ngAfterContentInit(): void {
    // Read after its content's bindings have rendered, so interpolated
    // text is there; the field updates from the signal.
    this.rendered.set(readableText(this.element, '[ndComboboxItemIndicator]'));
  }

  /** Chooses it, unless it's disabled. */
  protected choose(): void {
    this.combobox.choose(this);
  }

  /** Highlights it, as the pointer moves over it. */
  protected highlight(): void {
    if (!this.disabled() && !this.isActive()) {
      this.combobox.list.set(this.option);
    }
  }
}

/**
 * The check of an option. It has the `hidden` attribute unless its option
 * is chosen.
 *
 * @example
 * ```html
 * <span ndComboboxItemIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndComboboxItemIndicator]',
  host: { '[attr.hidden]': 'item.isChosen() ? null : ""' },
})
export class NdComboboxItemIndicator {
  protected readonly item = inject(ND_COMBOBOX_ITEM);
}

/**
 * What shows while no option matches the field's text. It has the
 * `hidden` attribute otherwise.
 *
 * @example
 * ```html
 * <div ndComboboxEmpty>No framework found.</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxEmpty]',
  host: { '[attr.hidden]': 'combobox.shownCount() === 0 ? null : ""' },
})
export class NdComboboxEmpty {
  protected readonly combobox = inject(ND_COMBOBOX);
}

/**
 * A decorative line between groups of options.
 *
 * @example
 * ```html
 * <div ndComboboxSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndComboboxSeparator]',
  host: { 'aria-hidden': 'true' },
})
export class NdComboboxSeparator {}

/**
 * Holds the chips and the field of a combobox with `multiple`; the popup
 * sits below it. Clicking its empty space focuses the field.
 *
 * @example
 * ```html
 * <div ndComboboxChips>…<input ndComboboxInput /></div>
 * ```
 */
@Directive({
  selector: '[ndComboboxChips]',
  host: { '(pointerdown)': 'focusField($event)' },
})
export class NdComboboxChips {
  private readonly combobox = inject(ND_COMBOBOX);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    this.combobox.chips = this.element;
    inject(DestroyRef).onDestroy(() => (this.combobox.chips = null));
  }

  /**
   * Focuses the field when the press lands on the container itself.
   *
   * @param event - The pointerdown event.
   */
  protected focusField(event: PointerEvent): void {
    if (event.target === this.element) {
      event.preventDefault();
      this.combobox.input?.focus();
    }
  }
}

/**
 * One chosen value, shown as a chip.
 *
 * @example
 * ```html
 * <span ndComboboxChip [value]="value">{{ value }}</span>
 * ```
 */
@Directive({
  selector: '[ndComboboxChip]',
  providers: [{ provide: ND_COMBOBOX_CHIP, useExisting: NdComboboxChip }],
  host: { '[attr.data-disabled]': 'combobox.isDisabled() ? "" : null' },
})
export class NdComboboxChip {
  /** The chosen value it shows. */
  readonly value = input.required<string>();

  protected readonly combobox = inject(ND_COMBOBOX);
}

/**
 * A button that removes its chip's value with the pointer, keeping focus in
 * the field, as `Backspace` does from it. It's out of the tab order and
 * hidden from assistive technology.
 *
 * @example
 * ```html
 * <button ndComboboxChipRemove><svg ndIcon="x"></svg></button>
 * ```
 */
@Directive({
  selector: 'button[ndComboboxChipRemove]',
  host: {
    type: 'button',
    tabindex: '-1',
    'aria-hidden': 'true',
    '[disabled]': 'combobox.isDisabled()',
    '(pointerdown)': '$event.preventDefault()',
    '(click)': 'combobox.remove(chip.value())',
  },
})
export class NdComboboxChipRemove {
  protected readonly combobox = inject(ND_COMBOBOX);
  protected readonly chip = inject(ND_COMBOBOX_CHIP);
}
