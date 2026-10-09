import { FocusKeyManager, type FocusableOption } from '@angular/cdk/a11y';
import { isRtl } from './direction';
import {
  computed,
  DestroyRef,
  inject,
  signal,
  type Signal,
} from '@angular/core';

/**
 * One item of a {@link NdRovingFocus} group, as the CDK key manager sees
 * it. Items create one of these rather than implementing it, since their
 * `disabled` is an input signal, not the boolean the key manager reads.
 */
export interface NdRovingItem extends FocusableOption {
  /** The item's element. */
  readonly element: HTMLElement;
  /** Whether arrow keys skip the item. */
  readonly disabled: boolean;
}

/** Which arrow keys move focus in a {@link NdRovingFocus} group. */
export type NdRovingOrientation = 'horizontal' | 'vertical' | 'both';

/**
 * A roving tabindex: only one item of a group is in the tab order, and
 * arrow keys move focus between items, wrapping at the ends, on the CDK's
 * `FocusKeyManager` (ADR-0004, amendment 3). Create it in an injection
 * context; items register themselves.
 *
 * @example
 * ```ts
 * readonly roving = new NdRovingFocus<RadioRovingItem>(() =>
 *   this.roving.items().find((entry) => entry.item.isChecked()),
 * );
 * ```
 */
export class NdRovingFocus<T extends NdRovingItem> {
  // The key manager keeps a reference to this array, so it's sorted in
  // place rather than replaced.
  private readonly list: T[] = [];
  private readonly manager = new FocusKeyManager<T>(this.list).withWrap();
  private readonly registered = signal<readonly T[]>([]);
  private readonly lastFocused = signal<T | null>(null);

  /** The registered items, in the order they registered. */
  readonly items: Signal<readonly T[]> = this.registered.asReadonly();

  /**
   * The item in the tab order: the last focused item, or the preferred
   * one, or else the first enabled item.
   */
  readonly tabStop = computed<T | undefined>(() => {
    const enabled = this.registered().filter((item) => !item.disabled);
    const last = this.lastFocused();
    if (last && enabled.includes(last)) {
      return last;
    }
    const preferred = this.preferred();
    return preferred && enabled.includes(preferred) ? preferred : enabled[0];
  });

  /**
   * Creates the group, destroyed with the injection context.
   *
   * @param preferred - Reads the item to put in the tab order before any
   *   item has had focus, such as the checked radio.
   */
  constructor(
    private readonly preferred: () => T | undefined = () => undefined,
  ) {
    inject(DestroyRef).onDestroy(() => this.manager.destroy());
  }

  /**
   * Adds an item to the group.
   *
   * @param item - The item.
   * @returns A function that removes it.
   */
  register(item: T): () => void {
    this.list.push(item);
    this.registered.update((items) => [...items, item]);
    return () => {
      const index = this.list.indexOf(item);
      if (index >= 0) {
        this.list.splice(index, 1);
      }
      this.registered.update((items) =>
        items.filter((other) => other !== item),
      );
      if (this.lastFocused() === item) {
        this.lastFocused.set(null);
      }
    };
  }

  /**
   * Records that an item received focus, so it stays the tab stop.
   *
   * @param item - The focused item.
   */
  focused(item: T): void {
    this.lastFocused.set(item);
  }

  /**
   * Moves focus for an arrow key, Home or End pressed on an item.
   *
   * @param event - The keydown event.
   * @param item - The item it was pressed on.
   * @param orientation - Which arrow keys move focus.
   * @param homeAndEnd - Whether Home and End move to the first and last
   *   items.
   * @returns The newly focused item, or `undefined` when the key didn't
   *   move focus.
   */
  keydown(
    event: KeyboardEvent,
    item: T,
    orientation: NdRovingOrientation,
    homeAndEnd = false,
  ): T | undefined {
    // Items can be added in any order, so sort by document position before
    // moving.
    this.list.sort((a, b) =>
      a.element.compareDocumentPosition(b.element) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    );
    const rtl = isRtl(item.element);
    this.manager
      .withVerticalOrientation(orientation !== 'horizontal')
      .withHorizontalOrientation(
        orientation === 'vertical' ? null : rtl ? 'rtl' : 'ltr',
      )
      .withHomeAndEnd(homeAndEnd)
      .updateActiveItem(item);
    this.manager.onKeydown(event);
    const active = this.manager.activeItem;
    if (!active || active === item) {
      return undefined;
    }
    // The next key can come before the next render, so the tab stop moves
    // now; the tabindex bindings settle on the same values (ADR-0004,
    // amendment 3).
    item.element.tabIndex = -1;
    active.element.tabIndex = 0;
    this.lastFocused.set(active);
    return active;
  }
}
