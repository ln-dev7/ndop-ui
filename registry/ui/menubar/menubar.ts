import { booleanAttribute, computed, Directive, input } from '@angular/core';
import {
  NdMenuContent,
  NdMenuItem,
  NdMenuItemCheckbox,
  NdMenuItemIndicator,
  NdMenuItemRadio,
  NdMenuLabel,
  NdMenuSeparator,
  NdMenuSubTrigger,
} from '@ndop/primitives/menu';
import { NdMenubar, NdMenubarTrigger } from '@ndop/primitives/menubar';
import { cn } from '@/lib/utils';

/**
 * A menubar (`@ndop/primitives/menubar`): a bar of menus, such as a desktop
 * app's File and Edit menus. It's one tab stop; the arrow keys move between
 * its triggers, and between their menus while one is open. Name it with
 * `aria-label`.
 *
 * @example
 * ```html
 * <div ndMenubar aria-label="Editor">
 *   <div [ndMenubarTrigger]="file">File</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndMenubar]',
  hostDirectives: [NdMenubar],
  host: { 'data-slot': 'menubar', '[class]': 'classes()' },
})
export class Menubar {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex h-9 items-center gap-1 rounded-md border bg-background p-1 shadow-xs',
      this.class(),
    ),
  );
}

/**
 * One menu of a menubar: its value is the menu's `ng-template`, which opens
 * below it. Use a `div`.
 *
 * @example
 * ```html
 * <div [ndMenubarTrigger]="file">File</div>
 * ```
 */
@Directive({
  selector: '[ndMenubarTrigger]',
  hostDirectives: [
    {
      directive: NdMenubarTrigger,
      inputs: ['ndMenubarTrigger', 'side', 'align', 'sideOffset'],
    },
  ],
  host: { 'data-slot': 'menubar-trigger', '[class]': 'classes()' },
})
export class MenubarTrigger {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
      this.class(),
    ),
  );
}

/**
 * A menubar menu's list (`@ndop/primitives/menu`), in the `ng-template` a
 * `[ndMenubarTrigger]` button opens. Arrow keys, Home, End and typing
 * move between items; Escape closes it and returns focus to its trigger.
 *
 * @example
 * ```html
 * <div ndMenubarContent><div ndMenubarItem>Profile</div></div>
 * ```
 */
@Directive({
  selector: '[ndMenubarContent]',
  hostDirectives: [{ directive: NdMenuContent, outputs: ['closed'] }],
  host: { 'data-slot': 'menubar-content', '[class]': 'classes()' },
})
export class MenubarContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
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
 * <div ndMenubarSubContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndMenubarSubContent]',
  hostDirectives: [{ directive: NdMenuContent, outputs: ['closed'] }],
  host: { 'data-slot': 'menubar-sub-content', '[class]': 'classes()' },
})
export class MenubarSubContent {
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
 * One action (`role="menuitem"`): activating it emits `triggered` and
 * closes the menu. Disabled items stay focusable and do nothing. Use a
 * `div`: on a `button`, Space would close the menu.
 *
 * @example
 * ```html
 * <div ndMenubarItem (triggered)="edit()">Edit</div>
 * ```
 */
@Directive({
  selector: '[ndMenubarItem]',
  hostDirectives: [
    { directive: NdMenuItem, inputs: ['disabled'], outputs: ['triggered'] },
  ],
  host: {
    'data-slot': 'menubar-item',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[attr.data-variant]': 'variant()',
    '[class]': 'classes()',
  },
})
export class MenubarItem {
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
 * <div ndMenubarCheckboxItem [(checked)]="statusBar">…</div>
 * ```
 */
@Directive({
  selector: '[ndMenubarCheckboxItem]',
  hostDirectives: [
    {
      directive: NdMenuItemCheckbox,
      inputs: ['checked', 'disabled'],
      outputs: ['checkedChange', 'triggered'],
    },
  ],
  host: { 'data-slot': 'menubar-checkbox-item', '[class]': 'classes()' },
})
export class MenubarCheckboxItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pe-2 ps-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      this.class(),
    ),
  );
}

/**
 * One choice of a radio group (`role="menuitemradio"`). Put an indicator
 * with a small filled circle in it.
 *
 * @example
 * ```html
 * <div ndMenubarRadioItem value="top">Top</div>
 * ```
 */
@Directive({
  selector: '[ndMenubarRadioItem]',
  hostDirectives: [
    {
      directive: NdMenuItemRadio,
      inputs: ['value', 'disabled'],
      outputs: ['triggered'],
    },
  ],
  host: { 'data-slot': 'menubar-radio-item', '[class]': 'classes()' },
})
export class MenubarRadioItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pe-2 ps-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
 * <span ndMenubarItemIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndMenubarItemIndicator]',
  hostDirectives: [NdMenuItemIndicator],
  host: { 'data-slot': 'menubar-item-indicator', '[class]': 'classes()' },
})
export class MenubarItemIndicator {
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
 * <div ndMenubarLabel id="account">My account</div>
 * ```
 */
@Directive({
  selector: '[ndMenubarLabel]',
  hostDirectives: [NdMenuLabel],
  host: {
    'data-slot': 'menubar-label',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[class]': 'classes()',
  },
})
export class MenubarLabel {
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
 * <div ndMenubarSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndMenubarSeparator]',
  hostDirectives: [NdMenuSeparator],
  host: { 'data-slot': 'menubar-separator', '[class]': 'classes()' },
})
export class MenubarSeparator {
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
 * <span ndMenubarShortcut>⌘S</span>
 * ```
 */
@Directive({
  selector: '[ndMenubarShortcut]',
  host: { 'data-slot': 'menubar-shortcut', '[class]': 'classes()' },
})
export class MenubarShortcut {
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
 * <div [ndMenubarSubTrigger]="more">More tools</div>
 * ```
 */
@Directive({
  selector: '[ndMenubarSubTrigger]',
  hostDirectives: [
    {
      directive: NdMenuSubTrigger,
      inputs: ['ndMenuSubTrigger: ndMenubarSubTrigger', 'disabled'],
    },
  ],
  host: {
    'data-slot': 'menubar-sub-trigger',
    '[attr.data-inset]': 'inset() ? "" : null',
    '[class]': 'classes()',
  },
})
export class MenubarSubTrigger {
  /** Indents it to line up with items that have an indicator. */
  readonly inset = input(false, { transform: booleanAttribute });

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:ps-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
      this.class(),
    ),
  );
}
