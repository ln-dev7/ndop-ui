import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
  model,
  type OnInit,
} from '@angular/core';
import {
  injectId,
  NdRovingFocus,
  type NdRovingItem,
} from '@ndop/primitives/internal';

/** The layout of a tab list, which picks the arrow keys that move focus. */
export type NdTabsOrientation = 'horizontal' | 'vertical';

/**
 * Whether moving focus to a tab selects it (`automatic`) or only `Enter`
 * and `Space` do (`manual`).
 */
export type NdTabsActivationMode = 'automatic' | 'manual';

/** The enclosing {@link NdTabs}, injected by its parts. */
export const ND_TABS = new InjectionToken<NdTabs>('ND_TABS');

/** A tab as the list's roving focus sees it. */
interface TabRovingItem extends NdRovingItem {
  readonly trigger: NdTabsTrigger;
}

/**
 * Turns a tab's value into a fragment that is safe in an element id.
 *
 * @param value - The tab's value.
 * @returns The value with whitespace replaced.
 */
function idPart(value: string): string {
  return value.trim().replace(/\s+/g, '-');
}

/**
 * Root of a set of tabs: the WAI-ARIA Tabs pattern, layered sections of
 * content shown one at a time. It holds which tab is selected; its
 * {@link NdTabsList} holds the tabs and each {@link NdTabsContent} a panel.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * @example
 * ```html
 * <div ndTabs defaultValue="account">
 *   <div ndTabsList aria-label="Settings">
 *     <button ndTabsTrigger value="account">Account</button>
 *     <button ndTabsTrigger value="password">Password</button>
 *   </div>
 *   <div ndTabsContent value="account">…</div>
 *   <div ndTabsContent value="password">…</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndTabs]',
  exportAs: 'ndTabs',
  providers: [{ provide: ND_TABS, useExisting: NdTabs }],
  host: { '[attr.data-orientation]': 'orientation()' },
})
export class NdTabs implements OnInit {
  /**
   * The selected tab's value, or `null` before one is selected. Two-way
   * bindable with `[(value)]`.
   */
  readonly value = model<string | null>(null);

  /** Initial `value` when it isn't bound. */
  readonly defaultValue = input<string | null>(null);

  /** The tab list's layout: which arrow keys move between tabs. */
  readonly orientation = input<NdTabsOrientation>('horizontal');

  /** Whether moving focus to a tab selects it. */
  readonly activationMode = input<NdTabsActivationMode>('automatic');

  /** The tabs' roving tabindex; the selected tab is the first tab stop. */
  readonly roving: NdRovingFocus<TabRovingItem> = new NdRovingFocus(() =>
    this.roving.items().find((item) => item.trigger.isSelected()),
  );

  private readonly baseId = injectId('nd-tabs');

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // selected panel.
    const initial = this.defaultValue();
    if (initial !== null && this.value() === null) {
      this.value.set(initial);
    }
  }

  /**
   * The id of the tab with a value.
   *
   * @param value - The tab's value.
   * @returns The trigger's id.
   */
  triggerId(value: string): string {
    return `${this.baseId}-trigger-${idPart(value)}`;
  }

  /**
   * The id of the panel with a value.
   *
   * @param value - The panel's value.
   * @returns The panel's id.
   */
  contentId(value: string): string {
    return `${this.baseId}-content-${idPart(value)}`;
  }
}

/**
 * The list of tabs (`role="tablist"`). Name it with `aria-label` or
 * `aria-labelledby`.
 *
 * @example
 * ```html
 * <div ndTabsList aria-label="Settings">…</div>
 * ```
 */
@Directive({
  selector: '[ndTabsList]',
  host: {
    role: 'tablist',
    '[attr.aria-orientation]': 'tabs.orientation()',
    '[attr.data-orientation]': 'tabs.orientation()',
  },
})
export class NdTabsList {
  protected readonly tabs = inject(ND_TABS);
}

/**
 * One tab (`role="tab"`), on a native `button`: it selects the panel with
 * the same `value`. Only the selected tab is in the tab order; arrow keys,
 * `Home` and `End` move between tabs.
 *
 * @example
 * ```html
 * <button ndTabsTrigger value="account">Account</button>
 * ```
 */
@Directive({
  selector: 'button[ndTabsTrigger]',
  exportAs: 'ndTabsTrigger',
  host: {
    type: 'button',
    role: 'tab',
    '[id]': 'tabs.triggerId(value())',
    '[attr.aria-selected]': 'isSelected()',
    '[attr.aria-controls]': 'tabs.contentId(value())',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.data-state]': 'isSelected() ? "active" : "inactive"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-orientation]': 'tabs.orientation()',
    '[disabled]': 'disabled()',
    '(click)': 'select()',
    '(focus)': 'tabs.roving.focused(roving)',
    '(keydown)': 'keydown($event)',
  },
})
export class NdTabsTrigger implements OnInit {
  /** The value of the panel it shows. */
  readonly value = input.required<string>();

  /** Disables it; arrow keys skip it. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly tabs = inject(ND_TABS);

  /** Whether it's the selected tab. */
  readonly isSelected = computed(() => this.tabs.value() === this.value());

  protected readonly roving: TabRovingItem = (() => {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const disabled = this.disabled;
    return {
      trigger: this,
      element,
      focus: () => element.focus(),
      get disabled() {
        return disabled();
      },
    };
  })();

  protected readonly tabIndex = computed(() =>
    this.tabs.roving.tabStop() === this.roving ? 0 : -1,
  );

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Joins the list once its value is set: the tab stop reads it.
    this.destroyRef.onDestroy(this.tabs.roving.register(this.roving));
  }

  /** Selects it, unless it's disabled. */
  select(): void {
    if (!this.disabled()) {
      this.tabs.value.set(this.value());
    }
  }

  /**
   * Moves focus with the arrow keys for the list's orientation, `Home` and
   * `End`, selecting the new tab in automatic mode.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    const next = this.tabs.roving.keydown(
      event,
      this.roving,
      this.tabs.orientation(),
      true,
    );
    if (next && this.tabs.activationMode() === 'automatic') {
      next.trigger.select();
    }
  }
}

/**
 * The panel of the tab with the same `value` (`role="tabpanel"`). It's
 * hidden while its tab isn't selected, and stays in the document.
 *
 * @example
 * ```html
 * <div ndTabsContent value="account">…</div>
 * ```
 */
@Directive({
  selector: '[ndTabsContent]',
  host: {
    role: 'tabpanel',
    tabindex: '0',
    '[id]': 'tabs.contentId(value())',
    '[attr.aria-labelledby]': 'tabs.triggerId(value())',
    '[attr.hidden]': 'isSelected() ? null : ""',
    '[attr.data-state]': 'isSelected() ? "active" : "inactive"',
    '[attr.data-orientation]': 'tabs.orientation()',
  },
})
export class NdTabsContent {
  /** The value of the tab that shows it. */
  readonly value = input.required<string>();

  protected readonly tabs = inject(ND_TABS);

  /** Whether its tab is selected. */
  readonly isSelected = computed(() => this.tabs.value() === this.value());
}
