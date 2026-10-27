import { Directionality } from '@angular/cdk/bidi';
import {
  CDK_MENU,
  CdkMenuTrigger,
  CdkMenuTriggerBase,
  MENU_TRIGGER,
  MenuTracker,
  PARENT_OR_NEW_MENU_STACK_PROVIDER,
} from '@angular/cdk/menu';
import {
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  type OnInit,
} from '@angular/core';
import { connectedPositions } from './position';
import { injectNativePopover } from './native-popover';

/**
 * Internal native-popover adapter for CDK menu keyboard and selection behavior.
 * Uses the public custom-trigger base and menu-stack contracts; never creates
 * a CDK overlay. Dropdown, context and submenu parts compose this directive.
 */
@Directive({
  selector: '[ndNativeMenuTrigger]',
  providers: [
    { provide: MENU_TRIGGER, useExisting: NdNativeMenuTrigger },
    { provide: CdkMenuTrigger, useExisting: NdNativeMenuTrigger },
    PARENT_OR_NEW_MENU_STACK_PROVIDER,
  ],
  host: {
    '[attr.aria-haspopup]': 'menuTemplateRef ? "menu" : null',
    '[attr.aria-expanded]': '!contextMode && menuTemplateRef ? isOpen() : null',
    '(click)': 'click($event)',
    '(keydown)': 'keydown($event)',
    '(mouseenter)': 'hover()',
    '(focusin)': 'setFocus(true)',
    '(focusout)': 'setFocus(false)',
  },
})
export class NdNativeMenuTrigger extends CdkMenuTriggerBase implements OnInit {
  /** Whether right click/long press, rather than primary click, opens this menu. */
  contextMode = false;
  /** Whether the context-menu trigger is disabled. */
  disabled = false;

  protected readonly parentMenu = inject(CDK_MENU, { optional: true });
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly directionality = inject(Directionality, { optional: true });
  private readonly tracker = inject(MenuTracker);
  private shown = false;
  private pointer: { x: number; y: number } | undefined;
  private readonly overlay = injectNativePopover({
    anchor: () => this.pointer ?? this.element,
    source: () => this.element,
    rtl: () => this.directionality?.value === 'rtl',
    positions: () =>
      this.menuPosition ??
      (this.contextMode
        ? connectedPositions(
            { side: 'bottom', align: 'start' },
            2,
            this.directionality?.value === 'rtl',
          ).map((position) => ({
            ...position,
            offsetX: position.overlayX === 'start' ? 2 : -2,
            offsetY: position.overlayY === 'top' ? 2 : -2,
          }))
        : connectedPositions(
            {
              side:
                this.parentMenu?.orientation === 'vertical' ? 'end' : 'bottom',
              align: 'start',
            },
            4,
            this.directionality?.value === 'rtl',
          )),
    onDismiss: () => {
      const active = this.document.activeElement;
      const restore =
        active === this.document.body ||
        !!this.overlay.element()?.contains(active);
      this.close();
      if (restore) this.element.focus();
    },
  });

  constructor() {
    super();
    if (this.element.tagName === 'BUTTON' && !this.element.hasAttribute('type'))
      this.element.setAttribute('type', 'button');
    // Parent CDK menus close their own active trigger before restoring its
    // key-manager position; closing it first would discard that active item.
    const closed = this.menuStack.closed.subscribe(
      ({ item, focusParentTrigger }) => {
        if (!this.parentMenu && item === this.childMenu) {
          this.close();
          if (focusParentTrigger) this.element.focus();
        }
      },
    );
    const focus = this.menuStack.hasFocus.subscribe((hasFocus) => {
      if (!this.parentMenu && !hasFocus) this.menuStack.closeAll();
    });
    inject(DestroyRef).onDestroy(() => {
      closed.unsubscribe();
      focus.unsubscribe();
    });
  }

  /** Gives a standalone primary trigger button semantics without overriding menu items. */
  ngOnInit(): void {
    if (
      !this.parentMenu &&
      !this.contextMode &&
      !this.element.hasAttribute('role')
    )
      this.element.setAttribute('role', 'button');
  }

  /**
   * Whether this trigger's native popover is open.
   *
   * @returns Whether the native menu is showing.
   */
  override isOpen(): boolean {
    return this.shown;
  }

  /**
   * Returns the active child menu for CDK menu-item keyboard navigation.
   *
   * @returns The child menu, or undefined before its first render.
   */
  getMenu(): ReturnType<CdkMenuTrigger['getMenu']> {
    return this.childMenu;
  }

  /** Opens a local menu view in the native top layer and joins its menu stack. */
  open(): void {
    if (
      this.shown ||
      this.disabled ||
      this.element.getAttribute('aria-disabled') === 'true'
    )
      return;
    const portal = this.getMenuContentPortal();
    if (!portal) return;
    if (!this.parentMenu) this.tracker.update(this);
    else if (
      !this.menuStack.closeSubMenuOf(this.parentMenu) &&
      this.menuStack.peek() !== this.parentMenu
    )
      this.menuStack.closeAll();
    this.overlay.setTemplate(
      portal.templateRef,
      portal.viewContainerRef,
      portal.context,
      portal.injector,
    );
    this.shown = true;
    this.opened.emit();
    if (!this.overlay.attach()) {
      this.shown = false;
      this.closed.emit();
      return;
    }
    if (this.childMenu && this.menuStack.peek() !== this.childMenu)
      this.menuStack.push(this.childMenu);
  }

  /**
   * Opens a context menu at viewport coordinates, including native reopen races.
   *
   * @param point - Pointer location in viewport CSS pixels.
   * @param origin - Keyboard or pointer focus origin.
   */
  openAt(
    point: Pick<MouseEvent, 'x' | 'y'>,
    origin: 'keyboard' | 'mouse',
  ): void {
    if (this.shown && !this.overlay.element()?.matches(':popover-open'))
      this.close();
    this.pointer = point;
    this.open();
    if (!this.shown) return;
    this.updatePosition();
    this.childMenu?.focusFirstItem(origin);
  }

  /** Closes this menu and any descendants without closing its parent menu. */
  override close(): void {
    if (!this.shown) return;
    this.shown = false;
    this.closed.emit();
    this.overlay.detach();
    if (this.childMenu) this.menuStack.close(this.childMenu);
  }

  /** Toggles the native menu from a primary trigger. */
  toggle(): void {
    if (this.shown) this.close();
    else this.open();
  }

  /** Updates a visible menu after placement inputs change. */
  updatePosition(): void {
    this.overlay.updatePosition();
  }

  /**
   * Opens from primary click and moves focus into the menu.
   *
   * @param event - The trigger click.
   */
  protected click(event: MouseEvent): void {
    if (
      this.contextMode ||
      this.disabled ||
      this.element.getAttribute('aria-disabled') === 'true' ||
      event.defaultPrevented
    )
      return;
    this.toggle();
    this.childMenu?.focusFirstItem('mouse');
  }

  /**
   * Preserves native button activation and CDK-style keyboard menu opening.
   *
   * @param event - The trigger keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (
      this.contextMode ||
      this.disabled ||
      this.element.getAttribute('aria-disabled') === 'true' ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const vertical = this.parentMenu?.orientation === 'vertical';
    const end =
      this.directionality?.value === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    if (event.key === 'Enter' || event.key === ' ') {
      const nativeClick =
        event.isTrusted &&
        (this.element.tagName === 'BUTTON' ||
          (this.element.tagName === 'A' && event.key === 'Enter'));
      if (!nativeClick) {
        event.preventDefault();
        this.toggle();
        this.childMenu?.focusFirstItem('keyboard');
      }
    } else if (
      (!vertical && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) ||
      (vertical && event.key === end)
    ) {
      event.preventDefault();
      this.open();
      if (event.key === 'ArrowUp') this.childMenu?.focusLastItem('keyboard');
      else this.childMenu?.focusFirstItem('keyboard');
    }
  }

  /** Opens sibling/submenus on hover while their menu stack is active. */
  protected hover(): void {
    if (!this.contextMode && !this.menuStack.isEmpty() && !this.shown)
      this.open();
  }

  /**
   * Keeps the CDK menu stack informed of trigger focus.
   *
   * @param focused - Whether focus is in the trigger.
   */
  protected setFocus(focused: boolean): void {
    if (!this.parentMenu) this.menuStack.setHasFocus(focused);
  }
}
