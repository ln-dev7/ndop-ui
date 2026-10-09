import { computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';

/**
 * A breadcrumb trail: the path from the top of a site to the current page,
 * as a `nav` landmark.
 *
 * @example
 * ```html
 * <nav ndBreadcrumb>
 *   <ol ndBreadcrumbList>
 *     <li ndBreadcrumbItem><a ndBreadcrumbLink href="/">Home</a></li>
 *     <li ndBreadcrumbSeparator><svg ndIcon="chevron-right"></svg></li>
 *     <li ndBreadcrumbItem><span ndBreadcrumbPage>Settings</span></li>
 *   </ol>
 * </nav>
 * ```
 */
@Directive({
  selector: 'nav[ndBreadcrumb]',
  host: { 'data-slot': 'breadcrumb', '[attr.aria-label]': 'label()' },
})
export class Breadcrumb {
  /** Name of the landmark. */
  readonly label = input('Breadcrumb');
}

/**
 * The ordered list of a breadcrumb's items and separators.
 *
 * @example
 * ```html
 * <ol ndBreadcrumbList>…</ol>
 * ```
 */
@Directive({
  selector: 'ol[ndBreadcrumbList]',
  host: { 'data-slot': 'breadcrumb-list', '[class]': 'classes()' },
})
export class BreadcrumbList {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5',
      this.class(),
    ),
  );
}

/**
 * One step of a breadcrumb trail.
 *
 * @example
 * ```html
 * <li ndBreadcrumbItem><a ndBreadcrumbLink href="/docs">Docs</a></li>
 * ```
 */
@Directive({
  selector: 'li[ndBreadcrumbItem]',
  host: { 'data-slot': 'breadcrumb-item', '[class]': 'classes()' },
})
export class BreadcrumbItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('inline-flex items-center gap-1.5', this.class()),
  );
}

/**
 * A link to an ancestor page. With the router, add `routerLink` to the
 * same `a`.
 *
 * @example
 * ```html
 * <a ndBreadcrumbLink routerLink="/docs">Docs</a>
 * ```
 */
@Directive({
  selector: 'a[ndBreadcrumbLink]',
  host: { 'data-slot': 'breadcrumb-link', '[class]': 'classes()' },
})
export class BreadcrumbLink {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('transition-colors hover:text-foreground', this.class()),
  );
}

/**
 * The current page, last in the trail: plain text marked
 * `aria-current="page"`.
 *
 * @example
 * ```html
 * <span ndBreadcrumbPage>Settings</span>
 * ```
 */
@Directive({
  selector: '[ndBreadcrumbPage]',
  host: {
    'data-slot': 'breadcrumb-page',
    'aria-current': 'page',
    '[class]': 'classes()',
  },
})
export class BreadcrumbPage {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('font-normal text-foreground', this.class()),
  );
}

/**
 * The mark between two items, hidden from assistive technology. Put an
 * icon in it, such as `chevron-right`, which turns around in right-to-left
 * layouts.
 *
 * @example
 * ```html
 * <li ndBreadcrumbSeparator><svg ndIcon="chevron-right"></svg></li>
 * ```
 */
@Directive({
  selector: 'li[ndBreadcrumbSeparator]',
  host: {
    'data-slot': 'breadcrumb-separator',
    role: 'presentation',
    'aria-hidden': 'true',
    '[class]': 'classes()',
  },
})
export class BreadcrumbSeparator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('[&>svg]:size-3.5', 'rtl:[&>svg]:rotate-180', this.class()),
  );
}

/**
 * Stands for collapsed items in a long trail. Put an icon in it, such as
 * `ellipsis`; wrap it in a menu trigger to reveal the hidden items.
 *
 * @example
 * ```html
 * <span ndBreadcrumbEllipsis><svg ndIcon="ellipsis"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndBreadcrumbEllipsis]',
  host: {
    'data-slot': 'breadcrumb-ellipsis',
    role: 'presentation',
    'aria-hidden': 'true',
    '[class]': 'classes()',
  },
})
export class BreadcrumbEllipsis {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex size-9 items-center justify-center',
      '[&>svg]:size-4',
      this.class(),
    ),
  );
}
