import { FocusTrapFactory, type FocusTrap } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  createBlockScrollStrategy,
  createGlobalPositionStrategy,
} from '@angular/cdk/overlay';
import { Platform } from '@angular/cdk/platform';
import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  Injector,
  input,
  model,
  signal,
  untracked,
  type OnInit,
} from '@angular/core';
import {
  focusReturnTarget,
  injectId,
  injectOverlay,
  isRtl,
} from '@ndop/primitives/internal';

/** How a sidebar collapses on desktop. */
export type NdSidebarCollapsible = 'offcanvas' | 'icon' | 'none';

/** The side of the page a sidebar sits on, logical. */
export type NdSidebarSide = 'start' | 'end';

/** The enclosing {@link NdSidebarProvider}, injected by its parts. */
export const ND_SIDEBAR_PROVIDER = new InjectionToken<NdSidebarProvider>(
  'ND_SIDEBAR_PROVIDER',
);

/** The enclosing {@link NdSidebar}, injected by its container. */
export const ND_SIDEBAR = new InjectionToken<NdSidebar>('ND_SIDEBAR');

/**
 * Holds a sidebar's state for the page around it: expanded or collapsed on
 * desktop, open or closed on mobile, and which applies, from the CDK's
 * `BreakpointObserver`. `Ctrl+B` (`⌘B` on a Mac) toggles it. The server
 * renders the desktop layout.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <div ndSidebarProvider>
 *   <div ndSidebar>…</div>
 *   <main>…</main>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndSidebarProvider]',
  exportAs: 'ndSidebarProvider',
  providers: [{ provide: ND_SIDEBAR_PROVIDER, useExisting: NdSidebarProvider }],
  host: {
    '[attr.data-state]': 'state()',
    '[attr.data-mobile]': 'isMobile() || null',
    '(document:keydown)': 'shortcutKey($event)',
  },
})
export class NdSidebarProvider implements OnInit {
  /** Whether the desktop sidebar is expanded. Two-way bindable. */
  readonly open = model(true);

  /** Whether the desktop sidebar starts expanded, when `open` isn't bound. */
  readonly defaultOpen = input(true, { transform: booleanAttribute });

  /** Whether the mobile sidebar is open. Two-way bindable. */
  readonly openMobile = model(false);

  /** The CSS media query below which the sidebar is a mobile dialog. */
  readonly mobileQuery = input('(max-width: 767.98px)');

  /** The letter that toggles the sidebar with `Ctrl` or `⌘`, or `null`. */
  readonly shortcut = input<string | null>('b');

  /** Whether the viewport is below the mobile breakpoint. */
  readonly isMobile = signal(false);

  /** `expanded` or `collapsed`, for the desktop sidebar. */
  readonly state = computed(() => (this.open() ? 'expanded' : 'collapsed'));

  /** The trigger, where focus goes when the sidebar hides with it inside. */
  trigger: HTMLElement | null = null;

  /** The container's id, for the trigger's `aria-controls`. */
  readonly containerId = signal<string | null>(null);

  constructor() {
    if (inject(Platform).isBrowser) {
      const breakpoints = inject(BreakpointObserver);
      let subscription: { unsubscribe(): void } | undefined;
      effect((onCleanup) => {
        subscription = breakpoints
          .observe(this.mobileQuery())
          .subscribe((result) => this.isMobile.set(result.matches));
        onCleanup(() => subscription?.unsubscribe());
      });
    }
  }

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // starting state.
    if (!this.defaultOpen()) {
      this.open.set(false);
    }
  }

  /** Toggles the sidebar that applies: the mobile one or the desktop one. */
  toggle(): void {
    if (this.isMobile()) {
      this.openMobile.update((open) => !open);
    } else {
      this.open.update((open) => !open);
    }
  }

  /**
   * Toggles the sidebar for `Ctrl` or `⌘` with the shortcut letter.
   *
   * @param event - A keydown anywhere in the document.
   */
  protected shortcutKey(event: KeyboardEvent): void {
    const key = this.shortcut();
    if (
      key &&
      event.key.toLowerCase() === key.toLowerCase() &&
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.toggle();
    }
  }
}

/**
 * The sidebar: its side and how it collapses, as data attributes for the
 * styled layer. Its {@link NdSidebarContainer} holds the content.
 *
 * @example
 * ```html
 * <div ndSidebar side="start" collapsible="icon">…</div>
 * ```
 */
@Directive({
  selector: '[ndSidebar]',
  exportAs: 'ndSidebar',
  providers: [{ provide: ND_SIDEBAR, useExisting: NdSidebar }],
  host: {
    '[attr.data-state]': 'provider.state()',
    '[attr.data-collapsible]':
      'provider.state() === "collapsed" ? collapsible() : ""',
    '[attr.data-side]': 'side()',
    '[attr.data-mobile]': 'provider.isMobile() || null',
  },
})
export class NdSidebar {
  /** The side it sits on: `start` or `end`. */
  readonly side = input<NdSidebarSide>('start');

  /** How it collapses on desktop. */
  readonly collapsible = input<NdSidebarCollapsible>('offcanvas');

  /** The provider holding its state. */
  readonly provider = inject(ND_SIDEBAR_PROVIDER);
}

/**
 * Keeps the sidebar's room in the page's flow; decorative.
 *
 * @example
 * ```html
 * <div ndSidebarGap></div>
 * ```
 */
@Directive({ selector: '[ndSidebarGap]', host: { 'aria-hidden': 'true' } })
export class NdSidebarGap {}

/**
 * The panel holding the sidebar's content: a named landmark
 * (`role="region"`). Collapsed off-canvas on desktop, it's `inert`. On mobile it's hidden until opened, then moves
 * into an overlay at its side as a modal dialog with a focus trap, closed
 * by `Escape` or a backdrop click. Name it with `aria-label`.
 *
 * @example
 * ```html
 * <div ndSidebarContainer aria-label="Main"><nav>…</nav></div>
 * ```
 */
@Directive({
  selector: '[ndSidebarContainer]',
  host: {
    '[id]': 'id',
    // A named landmark, so its header and footer are in one too, and
    // screen reader users can jump to it.
    '[attr.role]': 'modal() ? "dialog" : "region"',
    '[attr.aria-modal]': 'modal() ? "true" : null',
    '[attr.hidden]': 'provider.isMobile() && !modal() ? "" : null',
    '[attr.inert]': 'offscreen() ? "" : null',
    '[attr.data-state]': 'provider.state()',
    '[attr.data-mobile]': 'provider.isMobile() || null',
  },
})
export class NdSidebarContainer implements OnInit {
  /** Classes of the mobile overlay's backdrop. */
  readonly backdropClass = input<string>('cdk-overlay-dark-backdrop');

  /** Its element id, for the trigger's `aria-controls`. */
  readonly id = injectId('nd-sidebar');

  protected readonly sidebar = inject(ND_SIDEBAR);
  protected readonly provider = this.sidebar.provider;
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private focusTrap: FocusTrap | null = null;
  private restoreFocusTo: HTMLElement | null = null;

  /** Whether it's open as the mobile dialog. */
  protected readonly modal = computed(
    () => this.provider.isMobile() && this.provider.openMobile(),
  );

  /** Whether it's collapsed out of view on desktop. */
  protected readonly offscreen = computed(
    () =>
      !this.provider.isMobile() &&
      this.provider.state() === 'collapsed' &&
      this.sidebar.collapsible() === 'offcanvas',
  );

  private readonly attached = signal(false);

  private readonly overlay = injectOverlay({
    config: (injector) => {
      const rtl = isRtl(this.element);
      const atStart = this.sidebar.side() === 'start';
      const strategy = createGlobalPositionStrategy(injector).top('0');
      // Logical sides: the start sidebar is on the right in RTL.
      if (atStart !== rtl) {
        strategy.left('0');
      } else {
        strategy.right('0');
      }
      return {
        positionStrategy: strategy,
        scrollStrategy: createBlockScrollStrategy(injector),
        hasBackdrop: true,
        backdropClass: this.backdropClass(),
        height: '100%',
      };
    },
    onEscape: (event) => {
      event.preventDefault();
      this.provider.openMobile.set(false);
    },
  });

  constructor() {
    effect(() => {
      const modal = this.modal();
      untracked(() => (modal ? this.show() : this.hide()));
    });
    // Leaving the mobile layout closes the mobile sidebar.
    effect(() => {
      if (!this.provider.isMobile()) {
        untracked(() => this.provider.openMobile.set(false));
      }
    });
    // Collapsing off-canvas makes the panel inert, which would drop focus
    // inside it on the page body.
    effect(() => {
      if (this.offscreen()) {
        untracked(() => {
          if (this.element.contains(this.document.activeElement)) {
            this.provider.trigger?.focus();
          }
        });
      }
    });
    inject(DestroyRef).onDestroy(() => this.focusTrap?.destroy());
  }

  ngOnInit(): void {
    this.provider.containerId.set(this.id);
    this.overlay.setElement(this.element);
  }

  /** Moves the panel into the overlay and traps focus in it. */
  private show(): void {
    this.restoreFocusTo = focusReturnTarget(
      this.document,
      this.provider.trigger,
    );
    const ref = this.overlay.attach();
    if (!ref) {
      return;
    }
    if (!this.attached()) {
      this.attached.set(true);
      ref.backdropClick().subscribe(() => this.provider.openMobile.set(false));
    }
    afterNextRender(
      () => {
        if (!untracked(this.modal)) {
          return;
        }
        this.focusTrap = this.focusTrapFactory.create(this.element);
        if (!this.focusTrap.focusInitialElement()) {
          this.element.focus();
        }
      },
      { injector: this.injector },
    );
  }

  /** Puts the panel back and returns focus. */
  private hide(): void {
    if (!this.focusTrap && !this.restoreFocusTo) {
      this.overlay.detach();
      return;
    }
    this.focusTrap?.destroy();
    this.focusTrap = null;
    this.overlay.detach();
    const target = this.restoreFocusTo;
    this.restoreFocusTo = null;
    afterNextRender(() => target?.focus(), { injector: this.injector });
  }
}

/**
 * The button that toggles the sidebar: the desktop one, or the mobile one
 * on mobile. Name it with text, visible or `sr-only`.
 *
 * @example
 * ```html
 * <button ndSidebarTrigger><span class="sr-only">Toggle sidebar</span></button>
 * ```
 */
@Directive({
  selector: 'button[ndSidebarTrigger]',
  host: {
    type: 'button',
    '[attr.aria-expanded]':
      'provider.isMobile() ? provider.openMobile() : provider.open()',
    '[attr.aria-controls]': 'provider.containerId()',
    '[attr.data-state]': 'provider.state()',
    '(click)': 'provider.toggle()',
  },
})
export class NdSidebarTrigger {
  protected readonly provider = inject(ND_SIDEBAR_PROVIDER);

  constructor() {
    this.provider.trigger =
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  }
}

/**
 * A thin strip along the sidebar's edge that toggles it with the pointer.
 * It repeats the trigger, so it's out of the tab order and hidden from
 * assistive technology.
 *
 * @example
 * ```html
 * <button ndSidebarRail title="Toggle sidebar"></button>
 * ```
 */
@Directive({
  selector: 'button[ndSidebarRail]',
  host: {
    type: 'button',
    tabindex: '-1',
    'aria-hidden': 'true',
    '(click)': 'provider.toggle()',
  },
})
export class NdSidebarRail {
  protected readonly provider = inject(ND_SIDEBAR_PROVIDER);
}

/**
 * A link or button in the sidebar's menu. `active` marks the current page
 * with `aria-current="page"`; on mobile, following it when it's a link
 * closes the sidebar. A button stays put, since it may open a submenu or
 * a menu inside the sidebar.
 *
 * @example
 * ```html
 * <a ndSidebarMenuButton href="/inbox" active>Inbox</a>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuButton]',
  host: {
    '[attr.aria-current]': 'active() ? "page" : null',
    '[attr.data-active]': 'active()',
    '(click)': 'closeMobile()',
  },
})
export class NdSidebarMenuButton {
  /** Marks the link to the current page. */
  readonly active = input(false, { transform: booleanAttribute });

  private readonly provider = inject(ND_SIDEBAR_PROVIDER, { optional: true });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Closes the mobile sidebar, as following a link leaves it. */
  protected closeMobile(): void {
    if (
      this.provider?.isMobile() &&
      this.element.nativeElement.matches('a[href]')
    ) {
      this.provider.openMobile.set(false);
    }
  }
}
