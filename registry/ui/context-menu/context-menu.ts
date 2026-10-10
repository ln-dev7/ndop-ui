import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { NdContextMenuTrigger } from '@ndop/primitives/context-menu';
import {
  NdMenuContent,
  NdMenuGroup,
  NdMenuItem,
  NdMenuItemCheckbox,
  NdMenuItemIndicator,
  NdMenuItemRadio,
  NdMenuLabel,
  NdMenuRadioGroup,
  NdMenuSeparator,
  NdMenuSubTrigger,
} from '@ndop/primitives/menu';
import { cn } from '@/lib/utils';

/**
 * An area with a context menu (`@ndop/primitives/context-menu`): its value
 * is the menu's `ng-template`, opened at the pointer on a right click or
 * long press, or at its corner on Shift + F10. Make it focusable and named.
 *
 * @example
 * ```html
 * <div [ndContextMenuTrigger]="menu" tabindex="0" aria-label="Canvas">…</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuTrigger]',
  hostDirectives: [
    {
      directive: NdContextMenuTrigger,
      inputs: ['ndContextMenuTrigger', 'disabled'],
    },
  ],
  host: { 'data-slot': 'context-menu-trigger' },
})
export class ContextMenuTrigger {}

/**
 * A context menu's list (`@ndop/primitives/menu`), in the `ng-template` a
 * `[ndContextMenuTrigger]` area opens at the pointer on a right click or
 * long press, or at its corner on Shift + F10.
 *
 * @example
 * ```html
 * <div ndContextMenuContent><div ndContextMenuItem>Back</div></div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuContent]',
  hostDirectives: [{ directive: NdMenuContent, outputs: ['closed'] }],
  host: { 'data-slot': 'context-menu-content', '[class]': 'classes()' },
})
export class ContextMenuContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'z-50 max-h-[80vh] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
      this.class(),
    ),
  );
}

/**
 * A submenu, opened beside its sub-trigger: at the end side, so on the left
 * in right-to-left layouts.
 *
 * @example
 * ```html
 * <div ndContextMenuSubContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuSubContent]',
  hostDirectives: [{ directive: NdMenuContent, outputs: ['closed'] }],
  host: { 'data-slot': 'context-menu-sub-content', '[class]': 'classes()' },
})
export class ContextMenuSubContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
      this.class(),
    ),
  );
}

/**
 * Groups related items (`role="group"`). Name it with `aria-labelledby`
 * pointing at a label.
 *
 * @example
 * ```html
 * <div ndContextMenuGroup aria-labelledby="account">…</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuGroup]',
  hostDirectives: [NdMenuGroup],
  host: { 'data-slot': 'context-menu-group' },
})
export class ContextMenuGroup {}

/**
 * One action (`role="menuitem"`): activating it emits `triggered` and
 * closes the menu. Disabled items stay focusable and do nothing. Use a
 * `div`: on a `button`, Space would close the menu.
 *
 * @example
 * ```html
 * <div ndContextMenuItem (triggered)="edit()">Edit</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuItem]',
  hostDirectives: [
    { directive: NdMenuItem, inputs: ['disabled'], outputs: ['triggered'] },
  ],
  host: {
    'data-slot': 'context-menu-item',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[attr.data-variant]': 'variant()',
    '[class]': 'classes()',
  },
})
export class ContextMenuItem {
  /** Indents it to line up with items that have an indicator. */
  readonly inset = input(false, { transform: booleanAttribute });

  /** `destructive` colors a dangerous action, such as Delete. */
  readonly variant = input<'default' | 'destructive'>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!",
      this.class(),
    ),
  );
}

/**
 * An item that is on or off (`role="menuitemcheckbox"`), bound with
 * `[(checked)]`. Put an indicator with a check icon in it.
 *
 * @example
 * ```html
 * <div ndContextMenuCheckboxItem [(checked)]="statusBar">…</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuCheckboxItem]',
  hostDirectives: [
    {
      directive: NdMenuItemCheckbox,
      inputs: ['checked', 'disabled'],
      outputs: ['checkedChange', 'triggered'],
    },
  ],
  host: { 'data-slot': 'context-menu-checkbox-item', '[class]': 'classes()' },
})
export class ContextMenuCheckboxItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pe-2 ps-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      this.class(),
    ),
  );
}

/**
 * Groups radio items (`role="group"`) and holds the checked value, bound
 * with `[(value)]`.
 *
 * @example
 * ```html
 * <div ndContextMenuRadioGroup aria-label="Panel position" [(value)]="position">…</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuRadioGroup]',
  hostDirectives: [
    {
      directive: NdMenuRadioGroup,
      inputs: ['value'],
      outputs: ['valueChange'],
    },
  ],
  host: { 'data-slot': 'context-menu-radio-group' },
})
export class ContextMenuRadioGroup {}

/**
 * One choice of a radio group (`role="menuitemradio"`). Put an indicator
 * with a small filled circle in it.
 *
 * @example
 * ```html
 * <div ndContextMenuRadioItem value="top">Top</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuRadioItem]',
  hostDirectives: [
    {
      directive: NdMenuItemRadio,
      inputs: ['value', 'disabled'],
      outputs: ['triggered'],
    },
  ],
  host: { 'data-slot': 'context-menu-radio-item', '[class]': 'classes()' },
})
export class ContextMenuRadioItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pe-2 ps-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      this.class(),
    ),
  );
}

/**
 * The check or dot at the start of a checkbox or radio item, shown while it
 * is checked.
 *
 * @example
 * ```html
 * <span ndContextMenuItemIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndContextMenuItemIndicator]',
  hostDirectives: [NdMenuItemIndicator],
  host: { 'data-slot': 'context-menu-item-indicator', '[class]': 'classes()' },
})
export class ContextMenuItemIndicator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'pointer-events-none absolute start-2 flex size-3.5 items-center justify-center',
      this.class(),
    ),
  );
}

/**
 * A heading for a group of items; point the group's `aria-labelledby` at
 * it.
 *
 * @example
 * ```html
 * <div ndContextMenuLabel id="account">My account</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuLabel]',
  hostDirectives: [NdMenuLabel],
  host: {
    'data-slot': 'context-menu-label',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[class]': 'classes()',
  },
})
export class ContextMenuLabel {
  /** Indents it to line up with items that have an indicator. */
  readonly inset = input(false, { transform: booleanAttribute });

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'px-2 py-1.5 text-sm font-medium text-foreground data-[inset]:ps-8',
      this.class(),
    ),
  );
}

/**
 * A line between groups of items (`role="separator"`).
 *
 * @example
 * ```html
 * <div ndContextMenuSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuSeparator]',
  hostDirectives: [NdMenuSeparator],
  host: { 'data-slot': 'context-menu-separator', '[class]': 'classes()' },
})
export class ContextMenuSeparator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('-mx-1 my-1 h-px bg-border', this.class()),
  );
}

/**
 * The keyboard shortcut of an item, at its end, as a reminder; the menu
 * doesn't handle it.
 *
 * @example
 * ```html
 * <span ndContextMenuShortcut>⌘S</span>
 * ```
 */
@Directive({
  selector: '[ndContextMenuShortcut]',
  host: { 'data-slot': 'context-menu-shortcut', '[class]': 'classes()' },
})
export class ContextMenuShortcut {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('ms-auto text-xs tracking-widest text-muted-foreground', this.class()),
  );
}

/**
 * An item that opens the submenu in its template. Put a chevron icon at its
 * end with `ms-auto`, turned around in right-to-left layouts.
 *
 * @example
 * ```html
 * <div [ndContextMenuSubTrigger]="more">More tools</div>
 * ```
 */
@Directive({
  selector: '[ndContextMenuSubTrigger]',
  hostDirectives: [
    {
      directive: NdMenuSubTrigger,
      inputs: ['ndMenuSubTrigger: ndContextMenuSubTrigger', 'disabled'],
    },
  ],
  host: {
    'data-slot': 'context-menu-sub-trigger',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[class]': 'classes()',
  },
})
export class ContextMenuSubTrigger {
  /** Indents it to line up with items that have an indicator. */
  readonly inset = input(false, { transform: booleanAttribute });

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:ps-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
      this.class(),
    ),
  );
}
