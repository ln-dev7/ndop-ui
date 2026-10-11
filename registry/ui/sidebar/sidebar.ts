import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
} from '@angular/core';
import { NdInput } from '@ndop/primitives/input';
import { NdSeparator } from '@ndop/primitives/separator';
import {
  NdSidebar,
  NdSidebarContainer,
  NdSidebarGap,
  NdSidebarMenuButton,
  NdSidebarProvider,
  NdSidebarRail,
  NdSidebarTrigger,
} from '@ndop/primitives/sidebar';
import { buttonVariants } from '@/ui/button/button';
import { cn, variants, type VariantOf } from '@/lib/utils';

/** How a {@link Sidebar} looks: flush with the page, floating or inset. */
export type SidebarVariant = 'sidebar' | 'floating' | 'inset';

/**
 * The page around a sidebar (`@ndop/primitives/sidebar`): it holds the
 * sidebar's state, sets its widths, and lays the sidebar beside the
 * page's main content. `Ctrl+B` (`⌘B` on a Mac) toggles the sidebar.
 *
 * @example
 * ```html
 * <div ndSidebarProvider>
 *   <div ndSidebar>…</div>
 *   <main ndSidebarInset>…</main>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndSidebarProvider]',
  exportAs: 'ndSidebarProvider',
  hostDirectives: [
    {
      directive: NdSidebarProvider,
      inputs: ['open', 'defaultOpen', 'openMobile', 'mobileQuery', 'shortcut'],
      outputs: ['openChange', 'openMobileChange'],
    },
  ],
  host: {
    'data-slot': 'sidebar-wrapper',
    '[style.--sidebar-width]': '"16rem"',
    '[style.--sidebar-width-icon]': '"3rem"',
    '[style.--sidebar-width-mobile]': '"18rem"',
    '[class]': 'classes()',
  },
})
export class SidebarProvider {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
      this.class(),
    ),
  );
}

/**
 * The sidebar: on desktop, it collapses off-canvas, to its icons, or not
 * at all; below the `md` breakpoint, it opens as a dialog. Put a
 * {@link SidebarGap} and a {@link SidebarContainer} in it, unless
 * `collapsible` is `none`: then put the content in it directly.
 *
 * @example
 * ```html
 * <div ndSidebar collapsible="icon" variant="floating">
 *   <div ndSidebarGap></div>
 *   <div ndSidebarContainer aria-label="Main">
 *     <div ndSidebarInner>…</div>
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndSidebar]',
  hostDirectives: [{ directive: NdSidebar, inputs: ['side', 'collapsible'] }],
  host: {
    'data-slot': 'sidebar',
    '[attr.data-variant]': 'variant()',
    '[class]': 'classes()',
  },
})
export class Sidebar {
  /** How it looks: flush with the page, floating or inset. */
  readonly variant = input<SidebarVariant>('sidebar');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  /** The primitive, whose side and collapsing the parts read. */
  readonly sidebar = inject(NdSidebar);

  protected readonly classes = computed(() =>
    cn(
      this.sidebar.collapsible() === 'none'
        ? 'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground'
        : 'group peer hidden text-sidebar-foreground md:block',
      this.class(),
    ),
  );
}

/**
 * Keeps the sidebar's room in the page beside it, widening and narrowing
 * as the sidebar does.
 *
 * @example
 * ```html
 * <div ndSidebarGap></div>
 * ```
 */
@Directive({
  selector: '[ndSidebarGap]',
  hostDirectives: [NdSidebarGap],
  host: { 'data-slot': 'sidebar-gap', '[class]': 'classes()' },
})
export class SidebarGap {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  private readonly sidebar = inject(Sidebar);

  protected readonly classes = computed(() => {
    const variant = this.sidebar.variant();
    return cn(
      'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
      'group-data-[collapsible=offcanvas]:w-0',
      'group-data-[side=end]:rotate-180',
      variant === 'floating' || variant === 'inset'
        ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
        : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
      this.class(),
    );
  });
}

/**
 * The fixed panel holding the sidebar's content: off-canvas or narrowed
 * while collapsed, and the dialog panel on mobile. Name it with
 * `aria-label`.
 *
 * @example
 * ```html
 * <div ndSidebarContainer aria-label="Main">…</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarContainer]',
  hostDirectives: [
    { directive: NdSidebarContainer, inputs: ['backdropClass'] },
  ],
  host: { 'data-slot': 'sidebar-container', '[class]': 'classes()' },
})
export class SidebarContainer {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  private readonly sidebar = inject(Sidebar);

  protected readonly classes = computed(() => {
    const variant = this.sidebar.variant();
    return cn(
      'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
      this.sidebar.sidebar.side() === 'start'
        ? 'start-0 group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]'
        : 'end-0 group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]',
      variant === 'floating' || variant === 'inset'
        ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
        : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=start]:border-e group-data-[side=end]:border-s',
      // On mobile it's the dialog's panel, outside the sidebar's group.
      'data-mobile:relative data-mobile:flex data-mobile:h-full data-mobile:w-(--sidebar-width-mobile) data-mobile:border-0 data-mobile:bg-sidebar data-mobile:p-0 data-mobile:text-sidebar-foreground',
      this.class(),
    );
  });
}

/**
 * The sidebar's surface, inside its container: a column for its header,
 * content and footer.
 *
 * @example
 * ```html
 * <div ndSidebarInner>…</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarInner]',
  host: {
    'data-slot': 'sidebar-inner',
    'data-sidebar': 'sidebar',
    '[class]': 'classes()',
  },
})
export class SidebarInner {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm',
      this.class(),
    ),
  );
}

/**
 * The button that opens and closes the sidebar. Name it with `sr-only`
 * text, and put the panel icon in it.
 *
 * @example
 * ```html
 * <button ndSidebarTrigger>
 *   <svg ndIcon="panel-left"></svg><span class="sr-only">Toggle sidebar</span>
 * </button>
 * ```
 */
@Directive({
  selector: 'button[ndSidebarTrigger]',
  hostDirectives: [NdSidebarTrigger],
  host: {
    'data-slot': 'sidebar-trigger',
    'data-sidebar': 'trigger',
    '[class]': 'classes()',
  },
})
export class SidebarTrigger {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: 'ghost', size: 'icon' }),
      'size-7',
      this.class(),
    ),
  );
}

/**
 * A thin strip along the sidebar's inner edge that toggles it with the
 * pointer, showing a line on hover.
 *
 * @example
 * ```html
 * <button ndSidebarRail title="Toggle sidebar"></button>
 * ```
 */
@Directive({
  selector: 'button[ndSidebarRail]',
  hostDirectives: [NdSidebarRail],
  host: {
    'data-slot': 'sidebar-rail',
    'data-sidebar': 'rail',
    '[class]': 'classes()',
  },
})
export class SidebarRail {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=start]:-end-4 group-data-[side=end]:start-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex',
      'in-data-[side=start]:cursor-w-resize in-data-[side=end]:cursor-e-resize',
      '[[data-side=start][data-state=collapsed]_&]:cursor-e-resize [[data-side=end][data-state=collapsed]_&]:cursor-w-resize',
      'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:start-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
      '[[data-side=start][data-collapsible=offcanvas]_&]:-end-2',
      '[[data-side=end][data-collapsible=offcanvas]_&]:-start-2',
      'data-mobile:hidden',
      this.class(),
    ),
  );
}

/**
 * The page's main content beside the sidebar; with the `inset` variant,
 * it's a rounded card.
 *
 * @example
 * ```html
 * <main ndSidebarInset>…</main>
 * ```
 */
@Directive({
  selector: '[ndSidebarInset]',
  host: { 'data-slot': 'sidebar-inset', '[class]': 'classes()' },
})
export class SidebarInset {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative flex w-full flex-1 flex-col bg-background',
      'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2',
      this.class(),
    ),
  );
}

/**
 * A search field in the sidebar, styled like an Input.
 *
 * @example
 * ```html
 * <input ndSidebarInput aria-label="Search" />
 * ```
 */
@Directive({
  selector: 'input[ndSidebarInput]',
  hostDirectives: [{ directive: NdInput, inputs: ['id', 'invalid'] }],
  host: {
    'data-slot': 'sidebar-input',
    'data-sidebar': 'input',
    '[class]': 'classes()',
  },
})
export class SidebarInput {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30',
      'h-8 w-full bg-background shadow-none',
      this.class(),
    ),
  );
}

/**
 * The top of the sidebar, such as a team switcher.
 *
 * @example
 * ```html
 * <div ndSidebarHeader>…</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarHeader]',
  host: {
    'data-slot': 'sidebar-header',
    'data-sidebar': 'header',
    '[class]': 'classes()',
  },
})
export class SidebarHeader {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex flex-col gap-2 p-2', this.class()),
  );
}

/**
 * The bottom of the sidebar, such as the user's account.
 *
 * @example
 * ```html
 * <div ndSidebarFooter>…</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarFooter]',
  host: {
    'data-slot': 'sidebar-footer',
    'data-sidebar': 'footer',
    '[class]': 'classes()',
  },
})
export class SidebarFooter {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex flex-col gap-2 p-2', this.class()),
  );
}

/**
 * A line between parts of the sidebar.
 *
 * @example
 * ```html
 * <div ndSidebarSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndSidebarSeparator]',
  hostDirectives: [
    { directive: NdSeparator, inputs: ['orientation', 'decorative'] },
  ],
  host: {
    'data-slot': 'sidebar-separator',
    'data-sidebar': 'separator',
    '[class]': 'classes()',
  },
})
export class SidebarSeparator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full',
      'mx-2 w-auto bg-sidebar-border',
      this.class(),
    ),
  );
}

/**
 * The scrolling middle of the sidebar, holding its groups.
 *
 * @example
 * ```html
 * <div ndSidebarContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarContent]',
  host: {
    'data-slot': 'sidebar-content',
    'data-sidebar': 'content',
    '[class]': 'classes()',
  },
})
export class SidebarContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
      this.class(),
    ),
  );
}

/**
 * A group of the sidebar's menu, with a label.
 *
 * @example
 * ```html
 * <div ndSidebarGroup>…</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarGroup]',
  host: {
    'data-slot': 'sidebar-group',
    'data-sidebar': 'group',
    '[class]': 'classes()',
  },
})
export class SidebarGroup {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('relative flex w-full min-w-0 flex-col p-2', this.class()),
  );
}

/**
 * A group's label, which fades out while the sidebar shows only icons.
 *
 * @example
 * ```html
 * <div ndSidebarGroupLabel>Platform</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarGroupLabel]',
  host: {
    'data-slot': 'sidebar-group-label',
    'data-sidebar': 'group-label',
    '[class]': 'classes()',
  },
})
export class SidebarGroupLabel {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
      'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
      this.class(),
    ),
  );
}

/**
 * A button at the end of a group's label, such as "Add project". Name it
 * with `sr-only` text.
 *
 * @example
 * ```html
 * <button ndSidebarGroupAction><svg ndIcon="plus"></svg><span class="sr-only">Add project</span></button>
 * ```
 */
@Directive({
  selector: '[ndSidebarGroupAction]',
  host: {
    'data-slot': 'sidebar-group-action',
    'data-sidebar': 'group-action',
    '[class]': 'classes()',
  },
})
export class SidebarGroupAction {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'absolute top-3.5 end-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
      'after:absolute after:-inset-2 md:after:hidden',
      'group-data-[collapsible=icon]:hidden',
      this.class(),
    ),
  );
}

/**
 * The content of a group, usually a {@link SidebarMenu}.
 *
 * @example
 * ```html
 * <div ndSidebarGroupContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarGroupContent]',
  host: {
    'data-slot': 'sidebar-group-content',
    'data-sidebar': 'group-content',
    '[class]': 'classes()',
  },
})
export class SidebarGroupContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('w-full text-sm', this.class()),
  );
}

/**
 * A list of menu items, on a `ul`.
 *
 * @example
 * ```html
 * <ul ndSidebarMenu>…</ul>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenu]',
  host: {
    'data-slot': 'sidebar-menu',
    'data-sidebar': 'menu',
    '[class]': 'classes()',
  },
})
export class SidebarMenu {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex w-full min-w-0 flex-col gap-1', this.class()),
  );
}

/**
 * One menu item, on an `li`.
 *
 * @example
 * ```html
 * <li ndSidebarMenuItem>…</li>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuItem]',
  host: {
    'data-slot': 'sidebar-menu-item',
    'data-sidebar': 'menu-item',
    '[class]': 'classes()',
  },
})
export class SidebarMenuItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('group/menu-item relative', this.class()),
  );
}

/** Class table for {@link SidebarMenuButton}. */
export const sidebarMenuButtonVariants = variants({
  base: 'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-start text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pe-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  variants: {
    variant: {
      default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      outline:
        'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
    },
    size: {
      default: 'h-8 text-sm',
      sm: 'h-7 text-xs',
      lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
    },
  },
  defaults: { variant: 'default', size: 'default' },
});

/** Visual style of a {@link SidebarMenuButton}. */
export type SidebarMenuButtonVariant = VariantOf<
  typeof sidebarMenuButtonVariants,
  'variant'
>;

/** Size of a {@link SidebarMenuButton}. */
export type SidebarMenuButtonSize = VariantOf<
  typeof sidebarMenuButtonVariants,
  'size'
>;

/**
 * A menu item's link or button: put an icon first and the label after;
 * while the sidebar shows only icons, the label is clipped but still
 * names it. `active` marks the current page.
 *
 * @example
 * ```html
 * <a ndSidebarMenuButton href="/inbox" active>
 *   <svg ndIcon="inbox"></svg><span>Inbox</span>
 * </a>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuButton]',
  hostDirectives: [{ directive: NdSidebarMenuButton, inputs: ['active'] }],
  host: {
    'data-slot': 'sidebar-menu-button',
    'data-sidebar': 'menu-button',
    '[attr.data-size]': 'size()',
    '[class]': 'classes()',
  },
})
export class SidebarMenuButton {
  /** Visual style. */
  readonly variant = input<SidebarMenuButtonVariant>('default');

  /** Height. */
  readonly size = input<SidebarMenuButtonSize>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      sidebarMenuButtonVariants({ variant: this.variant(), size: this.size() }),
      this.class(),
    ),
  );
}

/**
 * A button at the end of a menu item, such as its own menu. Name it with
 * `sr-only` text; `showOnHover` shows it only while the item is hovered or
 * focused, on wide screens.
 *
 * @example
 * ```html
 * <button ndSidebarMenuAction showOnHover>…</button>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuAction]',
  host: {
    'data-slot': 'sidebar-menu-action',
    'data-sidebar': 'menu-action',
    '[class]': 'classes()',
  },
})
export class SidebarMenuAction {
  /** Shows it only while its item is hovered or focused, on wide screens. */
  readonly showOnHover = input(false, { transform: booleanAttribute });

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'absolute top-1.5 end-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
      'after:absolute after:-inset-2 md:after:hidden',
      'peer-data-[size=sm]/menu-button:top-1',
      'peer-data-[size=default]/menu-button:top-1.5',
      'peer-data-[size=lg]/menu-button:top-2.5',
      'group-data-[collapsible=icon]:hidden',
      this.showOnHover() &&
        'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground data-[state=open]:opacity-100 md:opacity-0',
      this.class(),
    ),
  );
}

/**
 * A count at the end of a menu item, such as unread messages.
 *
 * @example
 * ```html
 * <div ndSidebarMenuBadge>24</div>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuBadge]',
  host: {
    'data-slot': 'sidebar-menu-badge',
    'data-sidebar': 'menu-badge',
    '[class]': 'classes()',
  },
})
export class SidebarMenuBadge {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'pointer-events-none absolute end-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none',
      'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
      'peer-data-[size=sm]/menu-button:top-1',
      'peer-data-[size=default]/menu-button:top-1.5',
      'peer-data-[size=lg]/menu-button:top-2.5',
      'group-data-[collapsible=icon]:hidden',
      this.class(),
    ),
  );
}

/**
 * A placeholder menu item while the menu loads, with a text bar of a
 * random width. Put Skeletons in it.
 *
 * @example
 * ```html
 * <div ndSidebarMenuSkeleton>
 *   <div ndSkeleton class="h-4 max-w-(--skeleton-width) flex-1"></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuSkeleton]',
  host: {
    'data-slot': 'sidebar-menu-skeleton',
    'data-sidebar': 'menu-skeleton',
    'aria-hidden': 'true',
    '[style.--skeleton-width]': 'width',
    '[class]': 'classes()',
  },
})
export class SidebarMenuSkeleton {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  /** A width between 50% and 90%, so placeholders don't line up. */
  protected readonly width = `${Math.floor(Math.random() * 40) + 50}%`;

  protected readonly classes = computed(() =>
    cn('flex h-8 items-center gap-2 rounded-md px-2', this.class()),
  );
}

/**
 * A nested list of a menu item, hidden while the sidebar shows only
 * icons.
 *
 * @example
 * ```html
 * <ul ndSidebarMenuSub>…</ul>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuSub]',
  host: {
    'data-slot': 'sidebar-menu-sub',
    'data-sidebar': 'menu-sub',
    '[class]': 'classes()',
  },
})
export class SidebarMenuSub {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-s border-sidebar-border px-2.5 py-0.5',
      'group-data-[collapsible=icon]:hidden',
      this.class(),
    ),
  );
}

/**
 * One item of a nested list, on an `li`.
 *
 * @example
 * ```html
 * <li ndSidebarMenuSubItem>…</li>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuSubItem]',
  host: {
    'data-slot': 'sidebar-menu-sub-item',
    'data-sidebar': 'menu-sub-item',
    '[class]': 'classes()',
  },
})
export class SidebarMenuSubItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('group/menu-sub-item relative', this.class()),
  );
}

/**
 * A nested item's link: `size` is `sm` or `md`; `active` marks the
 * current page.
 *
 * @example
 * ```html
 * <a ndSidebarMenuSubButton href="/settings/team">Team</a>
 * ```
 */
@Directive({
  selector: '[ndSidebarMenuSubButton]',
  hostDirectives: [{ directive: NdSidebarMenuButton, inputs: ['active'] }],
  host: {
    'data-slot': 'sidebar-menu-sub-button',
    'data-sidebar': 'menu-sub-button',
    '[attr.data-size]': 'size()',
    '[class]': 'classes()',
  },
})
export class SidebarMenuSubButton {
  /** Text size: `sm` or `md`. */
  readonly size = input<'sm' | 'md'>('md');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
      'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
      this.size() === 'sm' && 'text-xs',
      this.size() === 'md' && 'text-sm',
      'group-data-[collapsible=icon]:hidden',
      this.class(),
    ),
  );
}
