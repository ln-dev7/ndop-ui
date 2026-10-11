import { CdkAccordion, CdkAccordionItem } from '@angular/cdk/accordion';
import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  input,
  model,
  signal,
  type OnInit,
} from '@angular/core';
import { injectCollapse, injectId } from '@ndop/primitives/internal';

/** The enclosing {@link NdAccordion}, injected by its items. */
export const ND_ACCORDION = new InjectionToken<NdAccordion>('ND_ACCORDION');

/** The enclosing {@link NdAccordionItem}, injected by its parts. */
export const ND_ACCORDION_ITEM = new InjectionToken<NdAccordionItem>(
  'ND_ACCORDION_ITEM',
);

/**
 * Turns `defaultValue` into the list `value` holds.
 *
 * @param value - One value, a list, or nothing.
 * @returns The list of values.
 */
function toList(value: string | readonly string[] | null): readonly string[] {
  if (value === null || value === '') {
    return [];
  }
  return typeof value === 'string' ? [value] : value;
}

/**
 * Root of an accordion: the WAI-ARIA Accordion pattern, a stack of headed
 * sections that each show or hide their content. It composes the CDK's
 * `CdkAccordion` (ADR-0004, amendment 3) and holds the open items' values.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
 *
 * @example
 * ```html
 * <div ndAccordion collapsible defaultValue="shipping">
 *   <div ndAccordionItem value="shipping">
 *     <h3 ndAccordionHeader><button ndAccordionTrigger>Shipping</button></h3>
 *     <div ndAccordionContent>Ships in two days.</div>
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndAccordion]',
  exportAs: 'ndAccordion',
  providers: [{ provide: ND_ACCORDION, useExisting: NdAccordion }],
  hostDirectives: [CdkAccordion],
})
export class NdAccordion implements OnInit {
  /** The open items' values. Two-way bindable with `[(value)]`. */
  readonly value = model<readonly string[]>([]);

  /** Initially open items when `value` isn't bound: one value or a list. */
  readonly defaultValue = input<string | readonly string[] | null>(null);

  /** Lets several items be open at once. */
  readonly multiple = input(false, { transform: booleanAttribute });

  /** Lets the open item close when only one item may be open. */
  readonly collapsible = input(false, { transform: booleanAttribute });

  /** Disables every item. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly cdk = inject(CdkAccordion);
  private readonly triggers = signal<readonly HTMLElement[]>([]);

  constructor() {
    effect(() => (this.cdk.multi = this.multiple()));
  }

  ngOnInit(): void {
    this.cdk.multi = this.multiple();
    // Read once, before the first render, so the server renders the open
    // items.
    const initial = toList(this.defaultValue());
    if (initial.length > 0 && this.value().length === 0) {
      this.value.set(this.multiple() ? initial : initial.slice(0, 1));
    }
  }

  /**
   * Whether an item is open.
   *
   * @param value - The item's value.
   * @returns `true` while it's open.
   */
  isOpen(value: string): boolean {
    return this.value().includes(value);
  }

  /**
   * Whether an open item is kept open: only one item may be open and the
   * accordion isn't collapsible.
   *
   * @param value - The item's value.
   * @returns `true` when its trigger can't close it.
   */
  isLocked(value: string): boolean {
    return !this.multiple() && !this.collapsible() && this.isOpen(value);
  }

  /**
   * Opens a closed item or closes an open one, following `multiple` and
   * `collapsible`.
   *
   * @param value - The item's value.
   */
  toggle(value: string): void {
    if (this.isLocked(value)) {
      return;
    }
    const open = this.isOpen(value);
    if (this.multiple()) {
      this.value.update((values) =>
        open ? values.filter((other) => other !== value) : [...values, value],
      );
    } else {
      this.value.set(open ? [] : [value]);
    }
  }

  /**
   * Adds a trigger to the arrow key order.
   *
   * @param trigger - The trigger element.
   * @returns A function that removes it.
   */
  registerTrigger(trigger: HTMLElement): () => void {
    this.triggers.update((triggers) => [...triggers, trigger]);
    return () =>
      this.triggers.update((triggers) =>
        triggers.filter((other) => other !== trigger),
      );
  }

  /**
   * Moves focus between triggers for `ArrowDown`, `ArrowUp`, `Home` and
   * `End`, skipping disabled ones and wrapping at the ends.
   *
   * @param event - The keydown event.
   * @param from - The trigger it was pressed on.
   */
  moveFocus(event: KeyboardEvent, from: HTMLElement): void {
    // Triggers register in any order, so sort by document position first.
    const enabled = [...this.triggers()]
      .sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      )
      .filter((trigger) => !(trigger as HTMLButtonElement).disabled);
    const index = enabled.indexOf(from);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case 'ArrowDown':
        next = enabled[(index + 1) % enabled.length];
        break;
      case 'ArrowUp':
        next = enabled[(index - 1 + enabled.length) % enabled.length];
        break;
      case 'Home':
        next = enabled[0];
        break;
      case 'End':
        next = enabled.at(-1);
        break;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  }
}

/**
 * One section of an {@link NdAccordion}, composing `CdkAccordionItem`: a
 * heading with its trigger, and the content the trigger shows.
 *
 * @example
 * ```html
 * <div ndAccordionItem value="shipping">…</div>
 * ```
 */
@Directive({
  selector: '[ndAccordionItem]',
  exportAs: 'ndAccordionItem',
  providers: [{ provide: ND_ACCORDION_ITEM, useExisting: NdAccordionItem }],
  hostDirectives: [CdkAccordionItem],
  host: {
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class NdAccordionItem implements OnInit {
  /** The value `value` lists while it's open. */
  readonly value = input.required<string>();

  /** Disables its trigger. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** The accordion it belongs to. */
  readonly accordion = inject(ND_ACCORDION);

  private readonly cdk = inject(CdkAccordionItem);
  private readonly baseId = injectId('nd-accordion');

  /** Id of its trigger. */
  readonly triggerId = `${this.baseId}-trigger`;

  /** Id of its content. */
  readonly contentId = `${this.baseId}-content`;

  /** Whether it's open. */
  readonly isOpen = computed(() => this.accordion.isOpen(this.value()));

  /** Whether it's disabled, by its own input or the accordion's. */
  readonly isDisabled = computed(
    () => this.disabled() || this.accordion.disabled(),
  );

  /** `open` or `closed`, for `data-state`. */
  readonly state = computed(() => (this.isOpen() ? 'open' : 'closed'));

  constructor() {
    effect(() => this.sync());
  }

  ngOnInit(): void {
    this.sync();
  }

  /** Opens or closes it, unless disabled or kept open. */
  toggle(): void {
    if (!this.isDisabled()) {
      this.accordion.toggle(this.value());
    }
  }

  /** Mirrors the open and disabled state on the CDK item. */
  private sync(): void {
    this.cdk.disabled = this.isDisabled();
    this.cdk.expanded = this.isOpen();
  }
}

/**
 * The heading around an item's trigger. Put it on an `h2` to `h6` that
 * fits the page's outline.
 *
 * @example
 * ```html
 * <h3 ndAccordionHeader>…</h3>
 * ```
 */
@Directive({
  selector: '[ndAccordionHeader]',
  host: {
    '[attr.data-state]': 'item.state()',
    '[attr.data-disabled]': 'item.isDisabled() ? "" : null',
  },
})
export class NdAccordionHeader {
  protected readonly item = inject(ND_ACCORDION_ITEM);
}

/**
 * The button that opens and closes its item, on a native `button` inside
 * its {@link NdAccordionHeader}. `ArrowDown`, `ArrowUp`, `Home` and `End`
 * move between the accordion's triggers.
 *
 * @example
 * ```html
 * <button ndAccordionTrigger>Shipping</button>
 * ```
 */
@Directive({
  selector: 'button[ndAccordionTrigger]',
  host: {
    type: 'button',
    '[id]': 'item.triggerId',
    '[attr.aria-expanded]': 'item.isOpen()',
    '[attr.aria-controls]': 'item.contentId',
    '[attr.aria-disabled]': 'locked() || null',
    '[attr.data-state]': 'item.state()',
    '[attr.data-disabled]': 'item.isDisabled() ? "" : null',
    '[disabled]': 'item.isDisabled()',
    '(click)': 'item.toggle()',
    '(keydown)': 'item.accordion.moveFocus($event, element)',
  },
})
export class NdAccordionTrigger implements OnInit {
  protected readonly item = inject(ND_ACCORDION_ITEM);
  protected readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  /** Whether its item is open and can't be closed. */
  protected readonly locked = computed(() =>
    this.item.accordion.isLocked(this.item.value()),
  );

  ngOnInit(): void {
    this.destroyRef.onDestroy(
      this.item.accordion.registerTrigger(this.element),
    );
  }
}

/**
 * The content its item's trigger shows and hides: a region labelled by the
 * trigger. It has the `hidden` attribute while closed. For the styled
 * layer to animate it, it sets `--nd-accordion-content-height` to its
 * height when it opens or closes, stays visible until a closing
 * animation ends, and has `data-animating` while one runs; no animation
 * plays on the first render.
 *
 * @example
 * ```html
 * <div ndAccordionContent>Ships in two days.</div>
 * ```
 */
@Directive({
  selector: '[ndAccordionContent]',
  host: {
    role: 'region',
    '[id]': 'item.contentId',
    '[attr.aria-labelledby]': 'item.triggerId',
    '[attr.hidden]': 'collapse.present() ? null : ""',
    '[attr.data-state]': 'item.state()',
    '[attr.data-disabled]': 'item.isDisabled() ? "" : null',
    '[attr.data-animating]': 'collapse.animating() ? "" : null',
    // The page loads with sections already open or closed; only a toggle
    // animates.
    '[style.animation-name]': 'collapse.toggled() ? null : "none"',
  },
})
export class NdAccordionContent {
  protected readonly item = inject(ND_ACCORDION_ITEM);

  protected readonly collapse = injectCollapse(
    this.item.isOpen,
    '--nd-accordion-content-height',
  );
}
