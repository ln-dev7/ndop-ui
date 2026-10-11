import { Directionality } from '@angular/cdk/bidi';
import { CdkListbox, CdkOption } from '@angular/cdk/listbox';
import {
  createFlexibleConnectedPositionStrategy,
  createRepositionScrollStrategy,
  type FlexibleConnectedPositionStrategy,
  type OverlayRef,
} from '@angular/cdk/overlay';
import {
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
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
  bindOpenState,
  connectedPositions,
  injectFieldDescribedBy,
  injectFormState,
  injectId,
  injectOverlay,
  placementOf,
  readableText,
  type NdAlign,
  type NdPlacement,
  type NdSide,
} from '@ndop/primitives/internal';

export type { NdAlign, NdSide } from '@ndop/primitives/internal';

/** The enclosing {@link NdSelect}, injected by its parts. */
export const ND_SELECT = new InjectionToken<NdSelect>('ND_SELECT');

/** The enclosing {@link NdSelectItem}, injected by its indicator. */
export const ND_SELECT_ITEM = new InjectionToken<NdSelectItem>(
  'ND_SELECT_ITEM',
);

/** How long typeahead keeps the letters typed so far, in milliseconds. */
const TYPEAHEAD_RESET = 500;

/**
 * Sorts elements' owners by their elements' document order.
 *
 * @param items - Things with an `element`.
 * @returns A sorted copy.
 */
function inDocumentOrder<T extends { readonly element: HTMLElement }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) =>
    a.element.compareDocumentPosition(b.element) &
    Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1,
  );
}

/**
 * Root of a select: the WAI-ARIA select-only combobox pattern, a button
 * that shows its value and opens a listbox of options. The listbox composes
 * the CDK's `CdkListbox` and is written in place; opening moves it into a
 * CDK overlay below the trigger. Put it on an `ng-container`, and bind
 * forms on the {@link NdSelectTrigger}.
 *
 * The listbox is never shown on the server; an initial open state takes
 * effect after hydration.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
 *
 * @example
 * ```html
 * <ng-container ndSelect [(value)]="fruit">
 *   <button ndSelectTrigger aria-label="Fruit">
 *     <span ndSelectValue placeholder="Pick a fruit"></span>
 *   </button>
 *   <div ndSelectContent>
 *     <div ndSelectItem value="apple">Apple</div>
 *     <div ndSelectItem value="pear">Pear</div>
 *   </div>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndSelect]',
  exportAs: 'ndSelect',
  providers: [{ provide: ND_SELECT, useExisting: NdSelect }],
})
export class NdSelect implements OnInit {
  /**
   * The selected option's value, or `null` when none is. Two-way bindable
   * with `[(value)]`.
   */
  readonly value = model<string | null>(null);

  /** Initial `value` when it isn't bound. */
  readonly defaultValue = input<string | null>(null);

  /** Whether the listbox is open. Two-way bindable with `[(open)]`. */
  readonly open = model(false);

  /** Initial open state when `open` isn't bound, applied after hydration. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });

  /** Disables the trigger. A disabled bound field does too. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Marks the select required: `aria-required="true"` on the trigger. */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * Marks the select invalid when no forms library is bound; with one, the
   * field's state decides.
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Whether a forms library disabled it. */
  readonly formDisabled = signal(false);

  /** Whether it's disabled, by its input or by a forms library. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /** Id of the listbox, for the trigger's `aria-controls`. */
  readonly contentId = injectId('nd-select-content');

  /** Where the listbox sits, after any flip. */
  readonly placement = signal<NdPlacement>({ side: 'bottom', align: 'start' });

  /** The options, in the order they were added. */
  readonly items = signal<readonly NdSelectItem[]>([]);

  /**
   * Ids of the trigger's labels, which name the listbox too; set when it
   * opens.
   */
  readonly labelledBy = signal<string | null>(null);

  /** The selected option, if it's one of the options. */
  readonly selectedItem = computed(() =>
    this.items().find((item) => item.value() === this.value()),
  );

  /** The trigger element. */
  trigger: HTMLElement | null = null;

  /** The listbox element. */
  content: HTMLElement | null = null;

  /** The listbox. */
  listbox: CdkListbox<string> | null = null;

  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly directionality = inject(Directionality);
  private preferred: NdPlacement = { side: 'bottom', align: 'start' };
  private offset = 4;
  private strategy: FlexibleConnectedPositionStrategy | null = null;
  private ref: OverlayRef | null = null;
  private listening = false;
  private returnFocusOnClose = true;
  private typed = '';
  private typedTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly overlay = injectOverlay({
    config: (injector) => {
      const strategy = createFlexibleConnectedPositionStrategy(
        injector,
        this.trigger ?? this.document.body,
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
    onEscape: (event) => {
      event.preventDefault();
      this.close(true);
    },
  });

  private readonly hydrated = bindOpenState(this.open, this.defaultOpen, {
    show: () => this.show(),
    hide: () => this.hide(),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.typedTimer));
  }

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // selected option's text.
    const initial = this.defaultValue();
    if (initial !== null && this.value() === null) {
      this.value.set(initial);
    }
  }

  /**
   * Sets what to call when the user changes the value, for a forms
   * library.
   *
   * @param fn - The callback.
   */
  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  /**
   * Sets what to call when focus leaves the select, for a forms library.
   *
   * @param fn - The callback.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Adds an option.
   *
   * @param item - The option.
   * @returns A function that removes it.
   */
  registerItem(item: NdSelectItem): () => void {
    this.items.update((items) => [...items, item]);
    return () =>
      this.items.update((items) => items.filter((other) => other !== item));
  }

  /**
   * Registers the listbox, which moves into the overlay while open.
   *
   * @param element - The listbox element.
   * @param listbox - The CDK listbox on it.
   */
  registerContent(element: HTMLElement, listbox: CdkListbox<string>): void {
    this.content = element;
    this.listbox = listbox;
    this.overlay.setElement(element);
    if (untracked(this.open) && untracked(this.hydrated)) {
      this.show();
    }
  }

  /** Opens the listbox if closed, or closes it, unless disabled. */
  toggle(): void {
    if (this.open()) {
      this.close(true);
    } else if (!this.isDisabled()) {
      this.open.set(true);
    }
  }

  /**
   * Closes the listbox.
   *
   * @param returnFocus - Whether focus goes back to the trigger.
   */
  close(returnFocus: boolean): void {
    this.returnFocusOnClose = returnFocus;
    this.open.set(false);
  }

  /**
   * Selects an option for the user and closes the listbox.
   *
   * @param value - The option's value.
   */
  choose(value: string): void {
    this.setValue(value);
    this.close(true);
  }

  /**
   * Selects the next option whose text starts with the letters typed so
   * far, as on a closed native `select`. Typing one letter again moves to
   * the next option starting with it.
   *
   * @param key - The printable key typed.
   */
  typeahead(key: string): void {
    clearTimeout(this.typedTimer);
    this.typed += key.toLowerCase();
    this.typedTimer = setTimeout(() => (this.typed = ''), TYPEAHEAD_RESET);
    const options = inDocumentOrder(this.items()).filter(
      (item) => !item.disabled(),
    );
    const repeated = [...this.typed].every((char) => char === this.typed[0]);
    const search = repeated ? (this.typed[0] ?? '') : this.typed;
    const current = options.findIndex((item) => item.value() === this.value());
    // A repeated letter cycles from the current option; a word starts there.
    const start = repeated ? current + 1 : Math.max(current, 0);
    const ordered = [...options.slice(start), ...options.slice(0, start)];
    const match = ordered.find((item) =>
      item.text().toLowerCase().startsWith(search),
    );
    if (match) {
      this.setValue(match.value());
    }
  }

  /**
   * Sets the preferred side, alignment and offset, from the listbox's
   * inputs.
   *
   * @param placement - Preferred side and alignment.
   * @param offset - Gap from the trigger, in pixels.
   */
  setPositioning(placement: NdPlacement, offset: number): void {
    this.preferred = placement;
    this.offset = offset;
    this.placement.set(placement);
    this.strategy?.withPositions(this.positions());
  }

  /**
   * Marks a bound field touched when focus leaves both the trigger and the
   * listbox.
   *
   * @param event - The focusout event.
   */
  leave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (
      !(next instanceof Node) ||
      !(this.trigger?.contains(next) || this.content?.contains(next))
    ) {
      this.onTouched();
    }
  }

  /**
   * Sets the value for the user, telling a bound forms library.
   *
   * @param value - The option's value.
   */
  private setValue(value: string): void {
    if (this.value() !== value) {
      this.value.set(value);
      this.onChange(value);
    }
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

  /** Moves the listbox into the overlay and focuses the selected option. */
  private show(): void {
    this.returnFocusOnClose = true;
    this.labelledBy.set(this.labelIds());
    const ref = this.overlay.attach();
    if (!ref) {
      return;
    }
    this.ref = ref;
    this.listen(ref);
    afterNextRender(
      () => {
        if (!untracked(this.open)) {
          return;
        }
        if (this.content) {
          // The overlay pane is a flex container, so the listbox itself
          // carries the width; the styled layer reads the variable.
          const width = `${this.trigger?.getBoundingClientRect().width ?? 0}px`;
          this.content.style.setProperty('--nd-select-trigger-width', width);
          this.content.style.minWidth = width;
        }
        ref.updatePosition();
        this.listbox?.focus();
      },
      { injector: this.injector },
    );
  }

  /**
   * The ids of the trigger's `aria-labelledby`, or of its `label`
   * elements, which get an id if they have none.
   *
   * @returns Space-separated ids, or `null`.
   */
  private labelIds(): string | null {
    const trigger = this.trigger as HTMLButtonElement | null;
    const own = trigger?.getAttribute('aria-labelledby');
    if (own) {
      return own;
    }
    const labels = Array.from(trigger?.labels ?? []);
    labels.forEach((label, index) => {
      label.id ||= `${this.contentId}-label-${index}`;
    });
    return labels.map((label) => label.id).join(' ') || null;
  }

  /** Puts the listbox back and, unless dismissed elsewhere, refocuses. */
  private hide(): void {
    this.overlay.detach();
    const target = this.returnFocusOnClose ? this.trigger : null;
    this.returnFocusOnClose = true;
    afterNextRender(() => target?.focus(), { injector: this.injector });
  }

  /**
   * Closes on presses outside the listbox and trigger. The trigger is
   * excluded because its own click toggles the listbox.
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
      if (!target || !this.trigger?.contains(target)) {
        this.close(false);
      }
    });
  }
}

/**
 * The button that shows the select's value and opens its listbox
 * (`role="combobox"`), on a native `button`. Name it with a
 * `label[ndLabel]` whose `for` is its `id`, or with `aria-label`. The
 * select owns its value, so this is a `ControlValueAccessor`: bind Signal
 * Forms (`[formField]`), reactive or template-driven forms here (ADR-0004,
 * amendments 1 and 4).
 *
 * @example
 * ```html
 * <button ndSelectTrigger id="fruit" [formField]="form.fruit">
 *   <span ndSelectValue placeholder="Pick a fruit"></span>
 * </button>
 * ```
 */
@Directive({
  selector: 'button[ndSelectTrigger]',
  exportAs: 'ndSelectTrigger',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdSelectTrigger),
      multi: true,
    },
  ],
  host: {
    type: 'button',
    role: 'combobox',
    'aria-haspopup': 'listbox',
    '[attr.aria-expanded]': 'select.open()',
    '[attr.aria-controls]': 'select.contentId',
    '[attr.aria-required]': 'select.required() || null',
    '[attr.aria-invalid]': 'showInvalid() || null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-state]': 'select.open() ? "open" : "closed"',
    '[attr.data-placeholder]': 'select.value() === null ? "" : null',
    '[attr.data-disabled]': 'select.isDisabled() ? "" : null',
    '[attr.data-invalid]': 'showInvalid() ? "" : null',
    '[disabled]': 'select.isDisabled()',
    '(click)': 'select.toggle()',
    '(keydown)': 'keydown($event)',
    '(focusout)': 'select.leave($event)',
  },
})
export class NdSelectTrigger implements ControlValueAccessor, AfterContentInit {
  protected readonly select = inject(ND_SELECT);
  private readonly form = injectFormState();

  /**
   * Whether it presents as invalid: the bound field is invalid and
   * touched, or, without a forms library, the select's `invalid` input.
   */
  readonly showInvalid = computed(() =>
    this.form.bound() ? this.form.invalid() : this.select.invalid(),
  );

  protected readonly describedBy = injectFieldDescribedBy({
    invalid: this.showInvalid,
    disabled: this.select.isDisabled,
  });

  constructor() {
    this.select.trigger =
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  }

  ngAfterContentInit(): void {
    this.form.connect();
  }

  /**
   * Sets the value from a forms library.
   *
   * @param value - The field's value; anything but a string selects none.
   */
  writeValue(value: unknown): void {
    this.select.value.set(typeof value === 'string' ? value : null);
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new value on user changes.
   */
  registerOnChange(fn: (value: string | null) => void): void {
    this.select.registerOnChange(fn);
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the select.
   */
  registerOnTouched(fn: () => void): void {
    this.select.registerOnTouched(fn);
  }

  /**
   * Disables or enables the select from a forms library.
   *
   * @param disabled - Whether the field is disabled.
   */
  setDisabledState(disabled: boolean): void {
    this.select.formDisabled.set(disabled);
  }

  /**
   * Opens the listbox for the arrow keys, and runs typeahead for printable
   * keys while it's closed.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (this.select.isDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.select.open()) {
        this.select.toggle();
      }
      return;
    }
    const printable =
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey;
    if (printable && !this.select.open()) {
      event.preventDefault();
      this.select.typeahead(event.key);
    }
  }
}

/**
 * The selected option's text, or `placeholder` while none is selected. Put
 * it inside the trigger.
 *
 * @example
 * ```html
 * <span ndSelectValue placeholder="Pick a fruit"></span>
 * ```
 */
@Directive({
  selector: '[ndSelectValue]',
  host: {
    '[textContent]': 'text()',
    '[attr.data-placeholder]': 'select.selectedItem() ? null : ""',
  },
})
export class NdSelectValue {
  /** What it shows while no option is selected. */
  readonly placeholder = input('');

  protected readonly select = inject(ND_SELECT);

  protected readonly text = computed(
    () => this.select.selectedItem()?.text() ?? this.placeholder(),
  );
}

/**
 * The listbox of options (`role="listbox"`), composing `CdkListbox`. Write
 * it after the trigger: it has the `hidden` attribute while closed, and
 * opening moves it into an overlay below the trigger. It takes its name
 * from the trigger's labels, or its own `aria-label`.
 *
 * @example
 * ```html
 * <div ndSelectContent side="bottom" align="start">…</div>
 * ```
 */
@Directive({
  selector: '[ndSelectContent]',
  hostDirectives: [CdkListbox],
  host: {
    '[id]': 'select.contentId',
    '[attr.hidden]': 'select.open() ? null : ""',
    '[attr.aria-labelledby]': 'ownLabel ? null : select.labelledBy()',
    '[attr.data-state]': 'select.open() ? "open" : "closed"',
    '[attr.data-side]': 'select.placement().side',
    '[attr.data-align]': 'select.placement().align',
    '(keydown)': 'keydown($event)',
    '(focusout)': 'select.leave($event)',
  },
})
export class NdSelectContent implements OnInit {
  /** Side of the trigger it opens on, before flipping. */
  readonly side = input<NdSide>('bottom');

  /** Alignment along that side. */
  readonly align = input<NdAlign>('start');

  /** Gap between the trigger and the listbox, in pixels. */
  readonly sideOffset = input(4, { transform: numberAttribute });

  protected readonly select = inject(ND_SELECT);
  private readonly listbox = inject<CdkListbox<string>>(CdkListbox);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly ownLabel =
    inject(new HostAttributeToken('aria-label'), { optional: true }) !== null;

  constructor() {
    this.listbox.navigationWrapDisabled = true;
    effect(() => {
      const value = this.select.value();
      this.listbox.value = value === null ? [] : [value];
    });
    effect(() =>
      this.select.setPositioning(
        { side: this.side(), align: this.align() },
        this.sideOffset(),
      ),
    );
  }

  ngOnInit(): void {
    this.select.registerContent(this.element, this.listbox);
  }

  /**
   * Selects the focused option for `Enter` and `Space`, even when it's
   * already selected, and closes on `Tab`, letting focus move on from the
   * trigger.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.select.close(false);
      this.select.trigger?.focus();
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const option = (event.target as Element | null)?.closest('[role=option]');
    const item = option
      ? this.select.items().find((other) => other.element === option)
      : undefined;
    if (item && !item.disabled()) {
      this.select.choose(item.value());
    }
  }
}

/**
 * The text of an option, which the trigger shows while it's selected and
 * typeahead matches. Without one, the option's own text is used.
 *
 * @example
 * ```html
 * <span ndSelectItemText>Apple</span>
 * ```
 */
@Directive({ selector: '[ndSelectItemText]' })
export class NdSelectItemText {
  /** Its element, read for its text. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
}

/**
 * One option (`role="option"`), composing `CdkOption`. Clicking it, or
 * `Enter` or `Space` on it, selects it and closes the listbox.
 *
 * @example
 * ```html
 * <div ndSelectItem value="apple"><span ndSelectItemText>Apple</span></div>
 * ```
 */
@Directive({
  selector: '[ndSelectItem]',
  exportAs: 'ndSelectItem',
  providers: [{ provide: ND_SELECT_ITEM, useExisting: NdSelectItem }],
  hostDirectives: [CdkOption],
  host: {
    '[attr.data-state]': 'isSelected() ? "checked" : "unchecked"',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(click)': 'click()',
    '(focus)': 'highlighted.set(true)',
    '(blur)': 'highlighted.set(false)',
  },
})
export class NdSelectItem implements OnInit, AfterContentInit {
  /** The value the select takes when it's chosen. */
  readonly value = input.required<string>();

  /** Makes it unselectable; arrow keys skip it. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Its text, when it differs from what it renders. */
  readonly label = input<string | null>(null);

  /** Its element. */
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Whether it has focus. */
  readonly highlighted = signal(false);

  private readonly select = inject(ND_SELECT);
  private readonly option = inject<CdkOption<string>>(CdkOption);
  private readonly itemText = contentChild(NdSelectItemText);
  private readonly rendered = signal('');
  private readonly destroyRef = inject(DestroyRef);

  /** Its text: `label`, or what it renders. */
  readonly text = computed(() => this.label() ?? this.rendered());

  /** Whether it's the selected option. */
  readonly isSelected = computed(() => this.select.value() === this.value());

  constructor() {
    effect(() => this.sync());
  }

  ngOnInit(): void {
    this.sync();
    this.destroyRef.onDestroy(this.select.registerItem(this));
  }

  ngAfterContentInit(): void {
    // Read after its content's bindings have rendered, so interpolated
    // text is there; the trigger, rendered earlier, updates from the
    // signal.
    const source = this.itemText()?.element ?? this.element;
    this.rendered.set(readableText(source, '[ndSelectItemIndicator]'));
  }

  /** Selects it and closes the listbox, unless it's disabled. */
  protected click(): void {
    if (!this.disabled()) {
      this.select.choose(this.value());
    }
  }

  /** Mirrors its inputs on the CDK option. */
  private sync(): void {
    this.option.value = this.value();
    this.option.disabled = this.disabled();
    this.option.typeaheadLabel = this.label() ?? null;
  }
}

/**
 * The check of an option. It has the `hidden` attribute unless its option
 * is selected.
 *
 * @example
 * ```html
 * <span ndSelectItemIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndSelectItemIndicator]',
  host: {
    '[attr.data-state]': 'item.isSelected() ? "checked" : "unchecked"',
    '[attr.hidden]': 'item.isSelected() ? null : ""',
  },
})
export class NdSelectItemIndicator {
  protected readonly item = inject(ND_SELECT_ITEM);
}

/**
 * Groups options (`role="group"`). Name it with `aria-labelledby` pointing
 * at a {@link NdSelectLabel}.
 *
 * @example
 * ```html
 * <div ndSelectGroup aria-labelledby="fruits">…</div>
 * ```
 */
@Directive({ selector: '[ndSelectGroup]', host: { role: 'group' } })
export class NdSelectGroup {}

/**
 * A heading for a group of options, as plain text; point the group's
 * `aria-labelledby` at it.
 *
 * @example
 * ```html
 * <div ndSelectLabel id="fruits">Fruits</div>
 * ```
 */
@Directive({ selector: '[ndSelectLabel]' })
export class NdSelectLabel {}

/**
 * A decorative line between groups of options, hidden from assistive
 * technology: a listbox may contain only options and groups.
 *
 * @example
 * ```html
 * <div ndSelectSeparator></div>
 * ```
 */
@Directive({ selector: '[ndSelectSeparator]', host: { 'aria-hidden': 'true' } })
export class NdSelectSeparator {}
