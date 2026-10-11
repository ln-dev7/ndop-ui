import { computed, Directive, input } from '@angular/core';
import {
  NdNavigationMenu,
  NdNavigationMenuContent,
  NdNavigationMenuItem,
  NdNavigationMenuLink,
  NdNavigationMenuList,
  NdNavigationMenuTrigger,
} from '@ndop/primitives/navigation-menu';
import { cn } from '@/lib/utils';

/**
 * Classes of a navigation menu's buttons; give them to a top-level link so
 * it looks like one.
 */
export const navigationMenuTriggerStyle =
  'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent';

/**
 * A site's navigation (`@ndop/primitives/navigation-menu`): links, and
 * buttons that show panels of links below them. Each panel stays after its
 * button in the page, so its links render on the server. Put it on a `nav`
 * named with `aria-label`.
 *
 * @example
 * ```html
 * <nav ndNavigationMenu aria-label="Main">
 *   <ul ndNavigationMenuList>
 *     <li ndNavigationMenuItem>
 *       <button ndNavigationMenuTrigger>
 *         Docs <svg ndIcon="chevron-down"></svg>
 *       </button>
 *       <div ndNavigationMenuContent>
 *         <a ndNavigationMenuLink href="/docs">Introduction</a>
 *       </div>
 *     </li>
 *   </ul>
 * </nav>
 * ```
 */
@Directive({
  selector: '[ndNavigationMenu]',
  hostDirectives: [
    {
      directive: NdNavigationMenu,
      inputs: ['value', 'openDelay', 'closeDelay'],
      outputs: ['valueChange'],
    },
  ],
  host: {
    'data-slot': 'navigation-menu',
    // Panels sit under their own items, as shadcn's `viewport={false}`.
    'data-viewport': 'false',
    '[class]': 'classes()',
  },
})
export class NavigationMenu {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/navigation-menu relative flex max-w-max flex-1 items-center justify-center',
      this.class(),
    ),
  );
}

/**
 * The list of top-level items, on a `ul`.
 *
 * @example
 * ```html
 * <ul ndNavigationMenuList>…</ul>
 * ```
 */
@Directive({
  selector: '[ndNavigationMenuList]',
  hostDirectives: [NdNavigationMenuList],
  host: { 'data-slot': 'navigation-menu-list', '[class]': 'classes()' },
})
export class NavigationMenuList {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group flex flex-1 list-none items-center justify-center gap-1',
      this.class(),
    ),
  );
}

/**
 * One top-level item, on an `li`: a link, or a button with its panel.
 *
 * @example
 * ```html
 * <li ndNavigationMenuItem>…</li>
 * ```
 */
@Directive({
  selector: '[ndNavigationMenuItem]',
  hostDirectives: [{ directive: NdNavigationMenuItem, inputs: ['value'] }],
  host: { 'data-slot': 'navigation-menu-item', '[class]': 'classes()' },
})
export class NavigationMenuItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() => cn('relative', this.class()));
}

/**
 * The button that shows its item's panel. Put the chevron icon in it,
 * last; it turns over while the panel is open.
 *
 * @example
 * ```html
 * <button ndNavigationMenuTrigger>Docs <svg ndIcon="chevron-down"></svg></button>
 * ```
 */
@Directive({
  selector: 'button[ndNavigationMenuTrigger]',
  hostDirectives: [
    { directive: NdNavigationMenuTrigger, inputs: ['disabled'] },
  ],
  host: { 'data-slot': 'navigation-menu-trigger', '[class]': 'classes()' },
})
export class NavigationMenuTrigger {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      navigationMenuTriggerStyle,
      'group',
      '[&>svg]:relative [&>svg]:top-[1px] [&>svg]:ms-1 [&>svg]:size-3 [&>svg]:transition [&>svg]:duration-300 group-data-[state=open]:[&>svg]:rotate-180',
      this.class(),
    ),
  );
}

/**
 * Its item's panel of links, shown below the item from the `md`
 * breakpoint, and in the flow of the page below it.
 *
 * @example
 * ```html
 * <div ndNavigationMenuContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndNavigationMenuContent]',
  hostDirectives: [NdNavigationMenuContent],
  host: { 'data-slot': 'navigation-menu-content', '[class]': 'classes()' },
})
export class NavigationMenuContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'top-0 start-0 w-full p-2 pe-2.5 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out md:absolute md:w-auto',
      'group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95',
      'z-50',
      this.class(),
    ),
  );
}

/**
 * A link, at the top level or in a panel; `active` marks the current page.
 * At the top level, give it {@link navigationMenuTriggerStyle} to match the
 * buttons.
 *
 * @example
 * ```html
 * <a ndNavigationMenuLink href="/docs" active>Docs</a>
 * ```
 */
@Directive({
  selector: 'a[ndNavigationMenuLink]',
  hostDirectives: [{ directive: NdNavigationMenuLink, inputs: ['active'] }],
  host: { 'data-slot': 'navigation-menu-link', '[class]': 'classes()' },
})
export class NavigationMenuLink {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground data-[active=true]:hover:bg-accent data-[active=true]:focus:bg-accent [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
      this.class(),
    ),
  );
}
