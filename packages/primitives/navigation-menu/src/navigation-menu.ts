import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  Injector,
  input,
  model,
  numberAttribute,
  signal,
  type OnInit,
} from '@angular/core';
import { injectId, isRtl } from '@ndop/primitives/internal';

/** The enclosing {@link NdNavigationMenu}, injected by its parts. */
export const ND_NAVIGATION_MENU = new InjectionToken<NdNavigationMenu>(
  'ND_NAVIGATION_MENU',
);

/** The enclosing {@link NdNavigationMenuItem}, injected by its parts. */
export const ND_NAVIGATION_MENU_ITEM = new InjectionToken<NdNavigationMenuItem>(
  'ND_NAVIGATION_MENU_ITEM',
);

/** The enclosing {@link NdNavigationMenuContent}, injected by its links. */
export const ND_NAVIGATION_MENU_CONTENT =
  new InjectionToken<NdNavigationMenuContent>('ND_NAVIGATION_MENU_CONTENT');

/**
 * A site's navigation: the WAI-ARIA disclosure navigation pattern, a list
 * of links and buttons that each show a panel of links. It uses no menu
 * roles, and each panel stays after its button in the document (ADR-0004,
 * amendment 5), so Tab flows through it and its links render on the
 * server. Put it on a `nav` named with `aria-label`.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
 *
 * @example
 * ```html
 * <nav ndNavigationMenu aria-label="Main">
 *   <ul ndNavigationMenuList>
 *     <li ndNavigationMenuItem>
 *       <button ndNavigationMenuTrigger>Docs</button>
 *       <div ndNavigationMenuContent>
 *         <a ndNavigationMenuLink href="/docs/install">Installation</a>
 *       </div>
 *     </li>
 *   </ul>
 * </nav>
 * ```
 */
@Directive({
  selector: '[ndNavigationMenu]',
  exportAs: 'ndNavigationMenu',
  providers: [{ provide: ND_NAVIGATION_MENU, useExisting: NdNavigationMenu }],
  host: {
    '[attr.data-state]': 'value() === null ? "closed" : "open"',
    '(keydown.escape)': 'escape()',
    '(focusout)': 'focusOut($event)',
    '(document:pointerdown)': 'outsidePointer($event)',
  },
})
export class NdNavigationMenu {
  /**
   * The open item's value, or `null` when every panel is closed. Two-way
   * bindable with `[(value)]`.
   */
  readonly value = model<string | null>(null);

  /** How long the pointer rests on a button before its panel opens, in ms. */
  readonly openDelay = input(200, { transform: numberAttribute });

  /** How long a panel stays after the pointer leaves its item, in ms. */
  readonly closeDelay = input(300, { transform: numberAttribute });

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly items = new Map<string, NdNavigationMenuItem>();
  private readonly topLevel = signal<readonly HTMLElement[]>([]);
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  /**
   * Adds an item, so Escape can find its button.
   *
   * @param item - The item.
   * @returns A function that removes it.
   */
  registerItem(item: NdNavigationMenuItem): () => void {
    this.items.set(item.value(), item);
    return () => this.items.delete(item.value());
  }

  /**
   * Adds a top-level button or link to the arrow key order.
   *
   * @param element - The button or link.
   * @returns A function that removes it.
   */
  registerTopLevel(element: HTMLElement): () => void {
    this.topLevel.update((elements) => [...elements, element]);
    return () =>
      this.topLevel.update((elements) =>
        elements.filter((other) => other !== element),
      );
  }

  /**
   * Opens an item's panel at once, closing any other.
   *
   * @param value - The item's value.
   */
  open(value: string): void {
    this.clearTimers();
    this.value.set(value);
  }

  /** Closes the open panel at once. */
  close(): void {
    this.clearTimers();
    this.value.set(null);
  }

  /**
   * Opens an item's panel after `openDelay`, or at once when another panel
   * is already open.
   *
   * @param value - The item's value.
   */
  scheduleOpen(value: string): void {
    clearTimeout(this.closeTimer);
    if (this.value() !== null) {
      this.open(value);
      return;
    }
    clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => this.open(value), this.openDelay());
  }

  /** Closes the open panel after `closeDelay`. */
  scheduleClose(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.close(), this.closeDelay());
  }

  /** Keeps the open panel open, as when the pointer comes back to it. */
  cancelClose(): void {
    clearTimeout(this.closeTimer);
  }

  /**
   * Moves focus between top-level buttons and links for the arrow keys,
   * `Home` and `End`, mirrored in right-to-left layouts.
   *
   * @param event - The keydown event.
   * @param from - The element it was pressed on.
   */
  moveFocus(event: KeyboardEvent, from: HTMLElement): void {
    // Elements register in any order, so sort by document position first.
    const elements = [...this.topLevel()]
      .sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      )
      .filter((element) => !(element as HTMLButtonElement).disabled);
    const index = elements.indexOf(from);
    if (index < 0) {
      return;
    }
    const forward = isRtl(from) ? 'ArrowLeft' : 'ArrowRight';
    const back = isRtl(from) ? 'ArrowRight' : 'ArrowLeft';
    let next: HTMLElement | undefined;
    switch (event.key) {
      case forward:
        next = elements[(index + 1) % elements.length];
        break;
      case back:
        next = elements[(index - 1 + elements.length) % elements.length];
        break;
      case 'Home':
        next = elements[0];
        break;
      case 'End':
        next = elements.at(-1);
        break;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  }

  /** Closes the open panel and returns focus to its button. */
  protected escape(): void {
    const value = this.value();
    if (value === null) {
      return;
    }
    const trigger = this.items.get(value)?.trigger;
    this.close();
    trigger?.focus();
  }

  /**
   * Closes the open panel when focus leaves the navigation.
   *
   * @param event - The focusout event.
   */
  protected focusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.element.contains(next)) {
      return;
    }
    if (next !== null) {
      this.close();
    }
  }

  /**
   * Closes the open panel on a press outside the navigation.
   *
   * @param event - The pointerdown event.
   */
  protected outsidePointer(event: PointerEvent): void {
    const target = event.target;
    if (
      this.value() !== null &&
      !(target instanceof Node && this.element.contains(target))
    ) {
      this.close();
    }
  }

  /** Stops any pending open or close. */
  private clearTimers(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
  }
}

/**
 * The list of top-level items. Put it on a `ul`.
 *
 * @example
 * ```html
 * <ul ndNavigationMenuList>…</ul>
 * ```
 */
@Directive({ selector: '[ndNavigationMenuList]' })
export class NdNavigationMenuList {}

/**
 * One top-level item, on an `li`: a link, or a button with its panel. The
 * pointer leaving it closes its panel after the close delay.
 *
 * @example
 * ```html
 * <li ndNavigationMenuItem value="docs">…</li>
 * ```
 */
@Directive({
  selector: '[ndNavigationMenuItem]',
  exportAs: 'ndNavigationMenuItem',
  providers: [
    { provide: ND_NAVIGATION_MENU_ITEM, useExisting: NdNavigationMenuItem },
  ],
  host: {
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '(pointerenter)': 'enter($event)',
    '(pointerleave)': 'leave($event)',
  },
})
export class NdNavigationMenuItem implements OnInit {
  /** Its value, which the root's `value` holds while it's open. */
  readonly value = input<string>(injectId('nd-navigation-menu-item'));

  /** The navigation it belongs to. */
  readonly menu = inject(ND_NAVIGATION_MENU);

  /** Id of its panel. */
  readonly contentId = injectId('nd-navigation-menu-content');

  /** Its button, once one is set. */
  trigger: HTMLElement | null = null;

  /** Its panel, once one is set. */
  content: HTMLElement | null = null;

  /** Whether its panel is open. */
  readonly isOpen = computed(() => this.menu.value() === this.value());

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.destroyRef.onDestroy(this.menu.registerItem(this));
  }

  /**
   * Keeps its open panel open while a mouse is over it.
   *
   * @param event - The pointerenter event.
   */
  protected enter(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && this.isOpen()) {
      this.menu.cancelClose();
    }
  }

  /**
   * Closes its open panel after the delay when a mouse leaves it.
   *
   * @param event - The pointerleave event.
   */
  protected leave(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && this.isOpen()) {
      this.menu.scheduleClose();
    }
  }
}

/**
 * The button that shows and hides its item's panel, on a native `button`.
 * A mouse resting on it opens the panel after the open delay.
 *
 * @example
 * ```html
 * <button ndNavigationMenuTrigger>Docs</button>
 * ```
 */
@Directive({
  selector: 'button[ndNavigationMenuTrigger]',
  host: {
    type: 'button',
    '[attr.aria-expanded]': 'item.isOpen()',
    '[attr.aria-controls]': 'item.contentId',
    '[attr.data-state]': 'item.isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[disabled]': 'disabled()',
    '(click)': 'click()',
    '(pointerenter)': 'hover($event)',
    '(keydown)': 'keydown($event)',
  },
})
export class NdNavigationMenuTrigger implements OnInit {
  /** Disables it. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly item = inject(ND_NAVIGATION_MENU_ITEM);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private openedByHover = false;

  ngOnInit(): void {
    this.item.trigger = this.element;
    this.destroyRef.onDestroy(this.item.menu.registerTopLevel(this.element));
  }

  /**
   * Toggles the panel. A click right after the mouse opened it keeps it
   * open, since the pointer was already on its way to click.
   */
  protected click(): void {
    const menu = this.item.menu;
    if (this.item.isOpen()) {
      if (this.openedByHover) {
        this.openedByHover = false;
        return;
      }
      menu.close();
    } else {
      menu.open(this.item.value());
    }
  }

  /**
   * Opens the panel after the delay when a mouse rests on it.
   *
   * @param event - The pointerenter event.
   */
  protected hover(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || this.disabled()) {
      return;
    }
    if (!this.item.isOpen()) {
      this.openedByHover = true;
      this.item.menu.scheduleOpen(this.item.value());
    }
  }

  /**
   * Opens the panel and focuses its first link for `ArrowDown`; moves
   * between top-level items for the others.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown') {
      this.item.menu.moveFocus(event, this.element);
      return;
    }
    event.preventDefault();
    this.openedByHover = false;
    this.item.menu.open(this.item.value());
    // The panel loses `hidden` on the next render; focus can only move
    // into it then.
    afterNextRender(
      () =>
        this.item.content
          ?.querySelector<HTMLElement>('a[href], button:not([disabled])')
          ?.focus(),
      { injector: this.injector },
    );
  }
}

/**
 * Its item's panel of links. It has the `hidden` attribute while closed and
 * stays after its button in the document.
 *
 * @example
 * ```html
 * <div ndNavigationMenuContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndNavigationMenuContent]',
  providers: [
    {
      provide: ND_NAVIGATION_MENU_CONTENT,
      useExisting: NdNavigationMenuContent,
    },
  ],
  host: {
    '[id]': 'item.contentId',
    '[attr.hidden]': 'item.isOpen() ? null : ""',
    '[attr.data-state]': 'item.isOpen() ? "open" : "closed"',
  },
})
export class NdNavigationMenuContent {
  protected readonly item = inject(ND_NAVIGATION_MENU_ITEM);

  constructor() {
    this.item.content =
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  }
}

/**
 * A link, at the top level or in a panel. `active` marks the current page
 * with `aria-current="page"`. Following it closes the open panel.
 *
 * @example
 * ```html
 * <a ndNavigationMenuLink href="/blog" active>Blog</a>
 * ```
 */
@Directive({
  selector: 'a[ndNavigationMenuLink]',
  host: {
    '[attr.aria-current]': 'active() ? "page" : null',
    '[attr.data-active]': 'active() || null',
    '(click)': 'menu.close()',
    '(keydown)': 'keydown($event)',
  },
})
export class NdNavigationMenuLink implements OnInit {
  /** Marks the link to the current page. */
  readonly active = input(false, { transform: booleanAttribute });

  protected readonly menu = inject(ND_NAVIGATION_MENU);
  private readonly inPanel =
    inject(ND_NAVIGATION_MENU_CONTENT, { optional: true }) !== null;
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (!this.inPanel) {
      this.destroyRef.onDestroy(this.menu.registerTopLevel(this.element));
    }
  }

  /**
   * Moves between top-level items, for a top-level link.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (!this.inPanel) {
      this.menu.moveFocus(event, this.element);
    }
  }
}
