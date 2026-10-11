import {
  ActiveDescendantKeyManager,
  type Highlightable,
} from '@angular/cdk/a11y';
import { DestroyRef, inject, signal, type Signal } from '@angular/core';

/**
 * One option of a {@link NdActiveList}, as the CDK key manager sees it.
 * Options create one of these rather than implementing it, since their
 * state is in signals.
 */
export interface NdActiveOption extends Highlightable {
  /** The option's element. */
  readonly element: HTMLElement;
  /** Whether arrow keys skip the option. */
  readonly disabled: boolean;
  /** Whether the option is shown; filtered-out options are skipped. */
  readonly visible: boolean;
}

/**
 * Tests whether an option's text matches what the user typed.
 *
 * @param text - The option's text and any keywords, joined.
 * @param search - What the user typed.
 * @returns `true` to show the option.
 */
export type NdFilter = (text: string, search: string) => boolean;

/**
 * The default {@link NdFilter}: every word typed appears in the text,
 * ignoring case and accents.
 *
 * @param text - The option's text and any keywords, joined.
 * @param search - What the user typed.
 * @returns `true` when every word appears.
 */
export const ndContainsFilter: NdFilter = (text, search) => {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  const haystack = normalize(text);
  return normalize(search)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};

/**
 * The options of a list that keeps focus elsewhere, such as in a text
 * field, and points at its active option with `aria-activedescendant`
 * (WAI-ARIA combobox and listbox patterns), on the CDK's
 * `ActiveDescendantKeyManager`. Disabled and filtered-out options are
 * skipped. Create it in an injection context; options register
 * themselves.
 *
 * @example
 * ```ts
 * readonly list = new NdActiveList<CommandOption>();
 * ```
 */
export class NdActiveList<T extends NdActiveOption> {
  // The key manager keeps a reference to this array, so it's sorted in
  // place rather than replaced.
  private readonly list: T[] = [];
  private readonly manager = new ActiveDescendantKeyManager<T>(this.list)
    .skipPredicate((item) => item.disabled || !item.visible)
    .withHomeAndEnd();
  private readonly registered = signal<readonly T[]>([]);
  private readonly activeItem = signal<T | null>(null);

  /** The registered options, in the order they registered. */
  readonly items: Signal<readonly T[]> = this.registered.asReadonly();

  /** The active option, or `null`. */
  readonly active: Signal<T | null> = this.activeItem.asReadonly();

  /** Creates the list, destroyed with the injection context. */
  constructor() {
    const subscription = this.manager.change.subscribe(() =>
      this.activeItem.set(this.manager.activeItem),
    );
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.manager.destroy();
    });
  }

  /**
   * Sets whether the arrow keys wrap at the ends. They don't by default.
   *
   * @param enabled - Whether they wrap.
   */
  wrap(enabled: boolean): void {
    this.manager.withWrap(enabled);
  }

  /**
   * Adds an option.
   *
   * @param item - The option.
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
      if (this.activeItem() === item) {
        this.clear();
      }
    };
  }

  /**
   * The shown, enabled options in document order.
   *
   * @returns The options.
   */
  selectable(): T[] {
    this.sort();
    return this.list.filter((item) => item.visible && !item.disabled);
  }

  /**
   * Makes an option active.
   *
   * @param item - The option.
   */
  set(item: T): void {
    this.sort();
    this.manager.setActiveItem(item);
  }

  /** Makes the first shown, enabled option active. */
  first(): void {
    this.sort();
    this.manager.setFirstItemActive();
  }

  /** Makes the last shown, enabled option active. */
  last(): void {
    this.sort();
    this.manager.setLastItemActive();
  }

  /** Leaves no option active. */
  clear(): void {
    this.manager.setActiveItem(-1);
    this.activeItem.set(null);
  }

  /**
   * Moves the active option for `ArrowDown`, `ArrowUp`, `Home` and `End`.
   *
   * @param event - The keydown event.
   * @param homeAndEnd - Whether `Home` and `End` move it, rather than the
   *   caret of a text field.
   * @returns Whether the key moved it.
   */
  keydown(event: KeyboardEvent, homeAndEnd: boolean): boolean {
    const keys = ['ArrowDown', 'ArrowUp'];
    if (homeAndEnd) {
      keys.push('Home', 'End');
    }
    if (!keys.includes(event.key)) {
      return false;
    }
    event.preventDefault();
    this.sort();
    switch (event.key) {
      case 'ArrowDown':
        this.manager.setNextItemActive();
        break;
      case 'ArrowUp':
        this.manager.setPreviousItemActive();
        break;
      case 'Home':
        this.manager.setFirstItemActive();
        break;
      case 'End':
        this.manager.setLastItemActive();
        break;
    }
    return true;
  }

  /** Puts the options in document order before moving between them. */
  private sort(): void {
    this.list.sort((a, b) =>
      a.element.compareDocumentPosition(b.element) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    );
  }
}
