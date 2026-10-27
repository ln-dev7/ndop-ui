import { NdNativeMenuTrigger } from '@ndop/primitives/internal';
import {
  CdkMenu,
  CdkMenuGroup,
  CdkMenuItem,
  CdkMenuItemCheckbox,
  CdkMenuItemRadio,
} from '@angular/cdk/menu';
import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  inject,
  InjectionToken,
  input,
  model,
  output,
  signal,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import type { NdSide } from '@ndop/primitives/internal';

/**
 * What a menu's trigger tells its content: the side it was asked to open
 * on. Dropdown Menu's trigger provides it.
 */
export interface NdMenuPlacement {
  /** Side of the trigger the menu opens on, before any flip. */
  readonly side: () => NdSide;
}

/** The trigger's placement, when it provides one. */
export const ND_MENU_PLACEMENT = new InjectionToken<NdMenuPlacement>(
  'ND_MENU_PLACEMENT',
);

/**
 * Keeps a CDK menu item in step with an Ndop item: its `disabled` input,
 * and its `triggered` events. The CDK's own host bindings read the
 * disabled flag, so the returned function runs from `ngOnInit`, before they
 * first render, and an effect follows later changes. Call it in an
 * injection context.
 *
 * @param item - The CDK item.
 * @param disabled - The Ndop item's `disabled` input.
 * @param triggered - The Ndop item's `triggered` output, if it has one.
 * @returns What to call from `ngOnInit`.
 */
function bindItem(
  item: CdkMenuItem,
  disabled: Signal<boolean>,
  triggered?: OutputEmitterRef<void>,
): () => void {
  effect(() => (item.disabled = disabled()));
  if (triggered) {
    const subscription = item.triggered.subscribe(() => triggered.emit());
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
  return () => (item.disabled = disabled());
}

/**
 * A menu: a list of actions in a `role="menu"` element, composing the CDK's
 * `CdkMenu` (ADR-0004, amendment 3). Put it in an `ng-template` that a
 * Dropdown Menu trigger, a Context Menu trigger or a `ndMenuSubTrigger`
 * renders. Arrow keys, Home, End and typeahead move between items; Escape
 * closes it and returns focus to what opened it.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 *
 * @example
 * ```html
 * <ng-template #actions>
 *   <div ndMenuContent>
 *     <div ndMenuItem (triggered)="edit()">Edit</div>
 *   </div>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[ndMenuContent]',
  exportAs: 'ndMenuContent',
  hostDirectives: [CdkMenu],
  host: {
    'data-state': 'open',
    // Local top-layer views remain in their parent menu's DOM tree.
    // CDK menu keyboard events must be handled by only the innermost menu.
    '(keydown)': '$event.stopPropagation()',
    '[attr.data-side]': 'side()',
  },
})
export class NdMenuContent {
  /** Emits when the menu closes. */
  readonly closed = output<void>();

  private readonly placement = inject(ND_MENU_PLACEMENT, { optional: true });

  /** The side its trigger asked for; submenus open at the end side. */
  protected readonly side = computed(() => this.placement?.side() ?? 'end');

  constructor() {
    const subscription = inject(CdkMenu).closed.subscribe(() =>
      this.closed.emit(),
    );
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}

/**
 * One action in a menu (`role="menuitem"`), composing `CdkMenuItem`.
 * Activating it with a click, Enter or Space emits `triggered` and closes
 * every open menu. `disabled` sets `aria-disabled` only, never the native
 * attribute: disabled items stay focusable and do nothing. Use a `div`, as
 * on a `button` browsers turn Space into a click, which closes the menu.
 *
 * @example
 * ```html
 * <div ndMenuItem (triggered)="edit()">Edit</div>
 * ```
 */
@Directive({
  selector: '[ndMenuItem]',
  exportAs: 'ndMenuItem',
  hostDirectives: [CdkMenuItem],
  host: {
    // aria-disabled only: a native `disabled` would make it unfocusable.
    '[attr.disabled]': 'null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class NdMenuItem implements OnInit {
  /** Makes it inert but focusable, with `aria-disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Emits when it's activated. */
  readonly triggered = output<void>();

  private readonly sync = bindItem(
    inject(CdkMenuItem),
    this.disabled,
    this.triggered,
  );

  ngOnInit(): void {
    this.sync();
  }
}

/**
 * A menu item that opens the submenu in the `ng-template` it's given
 * (`role="menuitem"` with `aria-haspopup="menu"`): with a click, hover,
 * Enter, Space or the arrow key toward the end side.
 *
 * @example
 * ```html
 * <div [ndMenuSubTrigger]="share">Share</div>
 * <ng-template #share><div ndMenuContent>…</div></ng-template>
 * ```
 */
@Directive({
  selector: '[ndMenuSubTrigger]',
  exportAs: 'ndMenuSubTrigger',
  // Its menu opens beside it, not on the side the root menu's trigger
  // asked for.
  providers: [{ provide: ND_MENU_PLACEMENT, useValue: { side: () => 'end' } }],
  hostDirectives: [CdkMenuItem, NdNativeMenuTrigger],
  host: {
    '[attr.disabled]': 'null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class NdMenuSubTrigger implements OnInit {
  /** The `ng-template` of the submenu. */
  readonly ndMenuSubTrigger = input<TemplateRef<unknown> | null>(null);

  /** Makes it inert but focusable, with `aria-disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly trigger = inject(NdNativeMenuTrigger);
  private readonly sync = bindItem(inject(CdkMenuItem), this.disabled);

  /** Whether its submenu is open. */
  protected readonly isOpen = signal(false);

  constructor() {
    effect(() => (this.trigger.menuTemplateRef = this.ndMenuSubTrigger()));
    const subscriptions = [
      this.trigger.opened.subscribe(() => this.isOpen.set(true)),
      this.trigger.closed.subscribe(() => this.isOpen.set(false)),
    ];
    inject(DestroyRef).onDestroy(() =>
      subscriptions.forEach((subscription) => subscription.unsubscribe()),
    );
  }

  ngOnInit(): void {
    this.sync();
    this.trigger.menuTemplateRef = this.ndMenuSubTrigger();
  }
}

/**
 * A menu item that is on or off (`role="menuitemcheckbox"`), composing
 * `CdkMenuItemCheckbox`. Activating it flips `checked`; Space keeps the
 * menu open.
 *
 * @example
 * ```html
 * <div ndMenuItemCheckbox [(checked)]="showStatusBar">Status bar</div>
 * ```
 */
@Directive({
  selector: '[ndMenuItemCheckbox]',
  exportAs: 'ndMenuItemCheckbox',
  hostDirectives: [CdkMenuItemCheckbox],
  host: {
    '[attr.disabled]': 'null',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class NdMenuItemCheckbox implements OnInit {
  /** Whether it's on. Two-way bindable with `[(checked)]`. */
  readonly checked = model(false);

  /** Makes it inert but focusable, with `aria-disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Emits when it's activated. */
  readonly triggered = output<void>();

  private readonly item = inject(CdkMenuItemCheckbox);
  private readonly sync = bindItem(this.item, this.disabled, this.triggered);

  constructor() {
    effect(() => (this.item.checked = this.checked()));
    // The CDK emits before it flips its own state, so the new state is the
    // opposite of the current one.
    const subscription = this.item.triggered.subscribe(() =>
      this.checked.set(!this.item.checked),
    );
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  ngOnInit(): void {
    this.sync();
    this.item.checked = this.checked();
  }
}

/**
 * Groups radio items (`role="group"`) and holds which one is checked.
 * Name it with `aria-labelledby` pointing at a `ndMenuLabel`.
 *
 * @example
 * ```html
 * <div ndMenuRadioGroup [(value)]="sort">…</div>
 * ```
 */
@Directive({
  selector: '[ndMenuRadioGroup]',
  exportAs: 'ndMenuRadioGroup',
  hostDirectives: [CdkMenuGroup],
})
export class NdMenuRadioGroup {
  /**
   * The checked radio item's value, or `null`. Two-way bindable with
   * `[(value)]`.
   */
  readonly value = model<string | null>(null);
}

/**
 * One choice in a {@link NdMenuRadioGroup} (`role="menuitemradio"`),
 * composing `CdkMenuItemRadio`. Activating it makes its `value` the
 * group's; Space keeps the menu open.
 *
 * @example
 * ```html
 * <div ndMenuItemRadio value="name">Name</div>
 * ```
 */
@Directive({
  selector: '[ndMenuItemRadio]',
  exportAs: 'ndMenuItemRadio',
  hostDirectives: [CdkMenuItemRadio],
  host: {
    '[attr.disabled]': 'null',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class NdMenuItemRadio implements OnInit {
  /** The value its group takes when it's checked. */
  readonly value = input.required<string>();

  /** Makes it inert but focusable, with `aria-disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Emits when it's activated. */
  readonly triggered = output<void>();

  private readonly item = inject(CdkMenuItemRadio);
  private readonly group = inject(NdMenuRadioGroup);
  private readonly sync = bindItem(this.item, this.disabled, this.triggered);

  /** Whether it's the group's checked item. */
  readonly checked = computed(() => this.group.value() === this.value());

  constructor() {
    effect(() => (this.item.checked = this.checked()));
    const subscription = this.item.triggered.subscribe(() =>
      this.group.value.set(this.value()),
    );
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  ngOnInit(): void {
    this.sync();
    this.item.checked = this.checked();
  }
}

/**
 * The check or dot of a checkbox or radio item. It has the `hidden`
 * attribute while its item is unchecked.
 *
 * @example
 * ```html
 * <span ndMenuItemIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndMenuItemIndicator]',
  host: {
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.hidden]': 'checked() ? null : ""',
  },
})
export class NdMenuItemIndicator {
  private readonly checkbox = inject(NdMenuItemCheckbox, {
    optional: true,
    host: true,
  });
  private readonly radio = inject(NdMenuItemRadio, {
    optional: true,
    host: true,
  });

  /** Whether its item is checked. */
  protected readonly checked = computed(
    () => this.checkbox?.checked() ?? this.radio?.checked() ?? false,
  );
}

/**
 * Groups related items (`role="group"`). Name it with `aria-labelledby`
 * pointing at a `ndMenuLabel`.
 *
 * @example
 * ```html
 * <div ndMenuGroup aria-labelledby="account-label">…</div>
 * ```
 */
@Directive({
  selector: '[ndMenuGroup]',
  hostDirectives: [CdkMenuGroup],
})
export class NdMenuGroup {}

/**
 * A heading for a group of items, as plain text; point the group's
 * `aria-labelledby` at it.
 *
 * @example
 * ```html
 * <div ndMenuLabel id="account-label">My account</div>
 * ```
 */
@Directive({ selector: '[ndMenuLabel]' })
export class NdMenuLabel {}

/**
 * A line between groups of items (`role="separator"`).
 *
 * @example
 * ```html
 * <div ndMenuSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndMenuSeparator]',
  host: { role: 'separator', 'aria-orientation': 'horizontal' },
})
export class NdMenuSeparator {}
