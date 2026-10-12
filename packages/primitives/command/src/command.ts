import {
  afterRenderEffect,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  HostAttributeToken,
  inject,
  InjectionToken,
  input,
  model,
  output,
  signal,
  untracked,
  type AfterContentInit,
  type OnInit,
} from '@angular/core';
import {
  injectId,
  NdActiveList,
  ndContainsFilter,
  readableText,
  type NdActiveOption,
  type NdFilter,
} from '@ndop/primitives/internal';

export { ndContainsFilter, type NdFilter } from '@ndop/primitives/internal';

/** The enclosing {@link NdCommand}, injected by its parts. */
export const ND_COMMAND = new InjectionToken<NdCommand>('ND_COMMAND');

/** The enclosing {@link NdCommandGroup}, injected by its items. */
export const ND_COMMAND_GROUP = new InjectionToken<NdCommandGroup>(
  'ND_COMMAND_GROUP',
);

/** A command item as the list's key manager sees it. */
interface CommandOption extends NdActiveOption {
  readonly item: NdCommandItem;
}

/**
 * A command menu: a search field over a list of commands that it filters
 * as the user types, such as a ⌘K palette (WAI-ARIA combobox pattern with
 * an always-visible listbox). Focus stays in the field and
 * `aria-activedescendant` points at the highlighted command, on the CDK's
 * `ActiveDescendantKeyManager`. Put it in a Dialog for a palette.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 *
 * @example
 * ```html
 * <div ndCommand label="Commands">
 *   <input ndCommandInput placeholder="Type a command…" />
 *   <div ndCommandList>
 *     <div ndCommandEmpty>No results.</div>
 *     <div ndCommandItem (triggered)="openCalendar()">Calendar</div>
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndCommand]',
  exportAs: 'ndCommand',
  providers: [{ provide: ND_COMMAND, useExisting: NdCommand }],
})
export class NdCommand {
  /** Names the field and the list for assistive technology. */
  readonly label = input<string | null>(null);

  /** The field's text. Two-way bindable with `[(search)]`. */
  readonly search = model('');

  /** Tests whether an item matches what was typed. */
  readonly filter = input<NdFilter>(ndContainsFilter);

  /** Hides the items that don't match; `false` for lists filtered elsewhere. */
  readonly shouldFilter = input(true, { transform: booleanAttribute });

  /** Makes the arrow keys wrap at the ends. */
  readonly loop = input(false, { transform: booleanAttribute });

  /** Id of the list, for the field's `aria-controls`. */
  readonly listId = injectId('nd-command-list');

  /** The items and which one is highlighted. */
  readonly list = new NdActiveList<CommandOption>();

  /** How many items are shown. */
  readonly shownCount = computed(
    () => this.list.items().filter((option) => option.item.isShown()).length,
  );

  constructor() {
    effect(() => this.list.wrap(this.loop()));
    // A new search, or new items, highlight the first shown item.
    effect(() => {
      this.search();
      this.list.items().forEach((option) => option.item.isShown());
      untracked(() =>
        this.list.selectable().length > 0
          ? this.list.first()
          : this.list.clear(),
      );
    });
  }

  /**
   * Tests an item's text against the search.
   *
   * @param text - The item's text and keywords.
   * @returns Whether it's shown.
   */
  matches(text: string): boolean {
    const search = this.search().trim();
    return !this.shouldFilter() || !search || this.filter()(text, search);
  }
}

/**
 * The search field (`role="combobox"`), on a native `input`. Typing filters
 * the list; `ArrowDown` and `ArrowUp` move the highlight and `Enter` runs
 * the highlighted command, while focus stays here.
 *
 * @example
 * ```html
 * <input ndCommandInput placeholder="Type a command…" />
 * ```
 */
@Directive({
  selector: 'input[ndCommandInput]',
  host: {
    type: 'text',
    role: 'combobox',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-autocomplete': 'list',
    'aria-expanded': 'true',
    '[attr.aria-controls]': 'command.listId',
    '[attr.aria-activedescendant]': 'command.list.active()?.item?.id ?? null',
    '[attr.aria-label]': 'ownLabel ?? command.label()',
    '[value]': 'command.search()',
    '(input)': 'command.search.set($any($event.target).value)',
    '(keydown)': 'keydown($event)',
  },
})
export class NdCommandInput {
  protected readonly command = inject(ND_COMMAND);
  protected readonly ownLabel = inject(new HostAttributeToken('aria-label'), {
    optional: true,
  });

  /**
   * Moves the highlight with the arrow keys and runs it with `Enter`.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (this.command.list.keydown(event, false)) {
      return;
    }
    if (event.key === 'Enter' && !event.isComposing) {
      const active = this.command.list.active();
      if (active) {
        event.preventDefault();
        active.item.run();
      }
    }
  }
}

/**
 * The list of commands (`role="listbox"`), named by the command menu's
 * `label`.
 *
 * @example
 * ```html
 * <div ndCommandList>…</div>
 * ```
 */
@Directive({
  selector: '[ndCommandList]',
  host: {
    role: 'listbox',
    '[id]': 'command.listId',
    '[attr.aria-label]': 'ownLabel ?? command.label()',
  },
})
export class NdCommandList {
  protected readonly command = inject(ND_COMMAND);
  protected readonly ownLabel = inject(new HostAttributeToken('aria-label'), {
    optional: true,
  });
}

/**
 * Groups commands (`role="group"`), named by its
 * {@link NdCommandGroupHeading}. It's hidden while none of its commands is
 * shown.
 *
 * @example
 * ```html
 * <div ndCommandGroup>
 *   <div ndCommandGroupHeading>Suggestions</div>
 *   …
 * </div>
 * ```
 */
@Directive({
  selector: '[ndCommandGroup]',
  providers: [{ provide: ND_COMMAND_GROUP, useExisting: NdCommandGroup }],
  host: {
    role: 'group',
    '[attr.aria-labelledby]': 'headingId()',
    '[attr.hidden]': 'isShown() ? null : ""',
  },
})
export class NdCommandGroup {
  /** Id of its heading, once it has one. */
  readonly headingId = signal<string | null>(null);

  private readonly items = signal<readonly NdCommandItem[]>([]);

  /** Whether any of its commands is shown. */
  readonly isShown = computed(() =>
    this.items().some((item) => item.isShown()),
  );

  /**
   * Adds a command.
   *
   * @param item - The command.
   * @returns A function that removes it.
   */
  register(item: NdCommandItem): () => void {
    this.items.update((items) => [...items, item]);
    return () =>
      this.items.update((items) => items.filter((other) => other !== item));
  }
}

/**
 * The heading of a {@link NdCommandGroup}, which names the group. It's
 * hidden from assistive technology itself, which reads it as the group's
 * name.
 *
 * @example
 * ```html
 * <div ndCommandGroupHeading>Suggestions</div>
 * ```
 */
@Directive({
  selector: '[ndCommandGroupHeading]',
  host: { '[id]': 'id', 'aria-hidden': 'true' },
})
export class NdCommandGroupHeading {
  /** Its element id. */
  readonly id = injectId('nd-command-group-heading');

  constructor() {
    inject(ND_COMMAND_GROUP).headingId.set(this.id);
  }
}

/**
 * One command (`role="option"`). Clicking it, or `Enter` while it's
 * highlighted, emits `triggered`. It's hidden while the search doesn't
 * match its text or `keywords`.
 *
 * @example
 * ```html
 * <div ndCommandItem keywords="emoji" (triggered)="openEmoji()">Search emoji</div>
 * ```
 */
@Directive({
  selector: '[ndCommandItem]',
  exportAs: 'ndCommandItem',
  host: {
    role: 'option',
    '[id]': 'id',
    '[attr.aria-selected]': 'isActive()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-selected]': 'isActive()',
    '[attr.data-disabled]': 'disabled()',
    '[attr.data-value]': 'resolvedValue()',
    '[attr.hidden]': 'isShown() ? null : ""',
    '(click)': 'run()',
    '(pointermove)': 'highlight()',
  },
})
export class NdCommandItem implements OnInit, AfterContentInit {
  /** Identifies it; defaults to its text. */
  readonly value = input<string | null>(null);

  /** Other words the search matches it by, separated by spaces. */
  readonly keywords = input('');

  /** Makes it inert; the arrow keys skip it. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Emits when it's run. */
  readonly triggered = output<void>();

  /** Its element id, for `aria-activedescendant`. */
  readonly id = injectId('nd-command-item');

  private readonly command = inject(ND_COMMAND);
  private readonly group = inject(ND_COMMAND_GROUP, { optional: true });
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly text = signal('');
  private readonly destroyRef = inject(DestroyRef);

  /** Its value: `value`, or its text. */
  readonly resolvedValue = computed(() => this.value() ?? this.text());

  /** Whether the search matches it. */
  readonly isShown = computed(() =>
    this.command.matches(
      `${this.text()} ${this.value() ?? ''} ${this.keywords()}`,
    ),
  );

  protected readonly option: CommandOption = (() => {
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
    () => this.command.list.active() === this.option,
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
    this.destroyRef.onDestroy(this.command.list.register(this.option));
    if (this.group) {
      this.destroyRef.onDestroy(this.group.register(this));
    }
  }

  ngAfterContentInit(): void {
    // Read after its content's bindings have rendered, so interpolated
    // text is there.
    this.text.set(readableText(this.element));
  }

  /** Emits `triggered`, unless it's disabled. */
  run(): void {
    if (!this.disabled()) {
      this.triggered.emit();
    }
  }

  /** Highlights it, as the pointer moves over it. */
  protected highlight(): void {
    if (!this.disabled() && !this.isActive()) {
      this.command.list.set(this.option);
    }
  }
}

/**
 * What shows while no command matches the search. It has the `hidden`
 * attribute otherwise.
 *
 * @example
 * ```html
 * <div ndCommandEmpty>No results.</div>
 * ```
 */
@Directive({
  selector: '[ndCommandEmpty]',
  host: { '[attr.hidden]': 'command.shownCount() === 0 ? null : ""' },
})
export class NdCommandEmpty {
  protected readonly command = inject(ND_COMMAND);
}

/**
 * A decorative line between groups, hidden while searching.
 *
 * @example
 * ```html
 * <div ndCommandSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndCommandSeparator]',
  host: {
    'aria-hidden': 'true',
    '[attr.hidden]': 'command.search().trim() ? "" : null',
  },
})
export class NdCommandSeparator {
  protected readonly command = inject(ND_COMMAND);
}
