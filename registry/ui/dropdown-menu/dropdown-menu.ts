import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { NdDropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';
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
 * The button that opens a dropdown menu (`@ndop/primitives/dropdown-menu`):
 * its value is the menu's `ng-template`. Enter, Space and the arrow keys
 * open it on an item; closing returns focus here.
 *
 * @example
 * ```html
 * <button ndButton [ndDropdownMenuTrigger]="menu">Open</button>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuTrigger]',
  hostDirectives: [
    {
      directive: NdDropdownMenuTrigger,
      inputs: [
        'ndDropdownMenuTrigger',
        'open',
        'defaultOpen',
        'side',
        'align',
        'sideOffset',
      ],
      outputs: ['openChange'],
    },
  ],
  host: { 'data-slot': 'dropdown-menu-trigger' },
})
export class DropdownMenuTrigger {}

/**
 * A dropdown menu's list (`@ndop/primitives/menu`), in the `ng-template` a
 * `[ndDropdownMenuTrigger]` button opens. Arrow keys, Home, End and typing
 * move between items; Escape closes it and returns focus to the button.
 *
 * @example
 * ```html
 * <div ndDropdownMenuContent><div ndDropdownMenuItem>Profile</div></div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuContent]',
  hostDirectives: [{ directive: NdMenuContent, outputs: ['closed'] }],
  host: { 'data-slot': 'dropdown-menu-content', '[class]': 'classes()' },
})
export class DropdownMenuContent {
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
 * <div ndDropdownMenuSubContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuSubContent]',
  hostDirectives: [{ directive: NdMenuContent, outputs: ['closed'] }],
  host: { 'data-slot': 'dropdown-menu-sub-content', '[class]': 'classes()' },
})
export class DropdownMenuSubContent {
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
 * <div ndDropdownMenuGroup aria-labelledby="account">…</div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuGroup]',
  hostDirectives: [NdMenuGroup],
  host: { 'data-slot': 'dropdown-menu-group' },
})
export class DropdownMenuGroup {}

/**
 * One action (`role="menuitem"`): activating it emits `triggered` and
 * closes the menu. Disabled items stay focusable and do nothing. Use a
 * `div`: on a `button`, Space would close the menu.
 *
 * @example
 * ```html
 * <div ndDropdownMenuItem (triggered)="edit()">Edit</div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuItem]',
  hostDirectives: [
    { directive: NdMenuItem, inputs: ['disabled'], outputs: ['triggered'] },
  ],
  host: {
    'data-slot': 'dropdown-menu-item',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[attr.data-variant]': 'variant()',
    '[class]': 'classes()',
  },
})
export class DropdownMenuItem {
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
 * <div ndDropdownMenuCheckboxItem [(checked)]="statusBar">…</div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuCheckboxItem]',
  hostDirectives: [
    {
      directive: NdMenuItemCheckbox,
      inputs: ['checked', 'disabled'],
      outputs: ['checkedChange', 'triggered'],
    },
  ],
  host: { 'data-slot': 'dropdown-menu-checkbox-item', '[class]': 'classes()' },
})
export class DropdownMenuCheckboxItem {
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
 * <div ndDropdownMenuRadioGroup aria-label="Panel position" [(value)]="position">…</div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuRadioGroup]',
  hostDirectives: [
    {
      directive: NdMenuRadioGroup,
      inputs: ['value'],
      outputs: ['valueChange'],
    },
  ],
  host: { 'data-slot': 'dropdown-menu-radio-group' },
})
export class DropdownMenuRadioGroup {}

/**
 * One choice of a radio group (`role="menuitemradio"`). Put an indicator
 * with a small filled circle in it.
 *
 * @example
 * ```html
 * <div ndDropdownMenuRadioItem value="top">Top</div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuRadioItem]',
  hostDirectives: [
    {
      directive: NdMenuItemRadio,
      inputs: ['value', 'disabled'],
      outputs: ['triggered'],
    },
  ],
  host: { 'data-slot': 'dropdown-menu-radio-item', '[class]': 'classes()' },
})
export class DropdownMenuRadioItem {
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
 * <span ndDropdownMenuItemIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuItemIndicator]',
  hostDirectives: [NdMenuItemIndicator],
  host: { 'data-slot': 'dropdown-menu-item-indicator', '[class]': 'classes()' },
})
export class DropdownMenuItemIndicator {
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
 * <div ndDropdownMenuLabel id="account">My account</div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuLabel]',
  hostDirectives: [NdMenuLabel],
  host: {
    'data-slot': 'dropdown-menu-label',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[class]': 'classes()',
  },
})
export class DropdownMenuLabel {
  /** Indents it to line up with items that have an indicator. */
  readonly inset = input(false, { transform: booleanAttribute });

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('px-2 py-1.5 text-sm font-medium data-[inset]:ps-8', this.class()),
  );
}

/**
 * A line between groups of items (`role="separator"`).
 *
 * @example
 * ```html
 * <div ndDropdownMenuSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuSeparator]',
  hostDirectives: [NdMenuSeparator],
  host: { 'data-slot': 'dropdown-menu-separator', '[class]': 'classes()' },
})
export class DropdownMenuSeparator {
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
 * <span ndDropdownMenuShortcut>⌘S</span>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuShortcut]',
  host: { 'data-slot': 'dropdown-menu-shortcut', '[class]': 'classes()' },
})
export class DropdownMenuShortcut {
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
 * <div [ndDropdownMenuSubTrigger]="more">More tools</div>
 * ```
 */
@Directive({
  selector: '[ndDropdownMenuSubTrigger]',
  hostDirectives: [
    {
      directive: NdMenuSubTrigger,
      inputs: ['ndMenuSubTrigger: ndDropdownMenuSubTrigger', 'disabled'],
    },
  ],
  host: {
    'data-slot': 'dropdown-menu-sub-trigger',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[class]': 'classes()',
  },
})
export class DropdownMenuSubTrigger {
  /** Indents it to line up with items that have an indicator. */
  readonly inset = input(false, { transform: booleanAttribute });

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:ps-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
      this.class(),
    ),
  );
}
