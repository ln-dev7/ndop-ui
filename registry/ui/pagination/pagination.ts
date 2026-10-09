import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonSize } from '@/ui/button/button';

/**
 * Page navigation for a list of results, as a `nav` landmark.
 *
 * @example
 * ```html
 * <nav ndPagination>
 *   <ul ndPaginationContent>
 *     <li ndPaginationItem>
 *       <a ndPaginationPrevious href="?page=1"><svg ndIcon="chevron-left"></svg><span>Previous</span></a>
 *     </li>
 *     <li ndPaginationItem><a ndPaginationLink href="?page=2" active>2</a></li>
 *     <li ndPaginationItem>
 *       <a ndPaginationNext href="?page=3"><span>Next</span><svg ndIcon="chevron-right"></svg></a>
 *     </li>
 *   </ul>
 * </nav>
 * ```
 */
@Directive({
  selector: 'nav[ndPagination]',
  host: {
    'data-slot': 'pagination',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
  },
})
export class Pagination {
  /** Name of the landmark. */
  readonly label = input('Pagination');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('mx-auto flex w-full justify-center', this.class()),
  );
}

/**
 * The list of a pagination's links.
 *
 * @example
 * ```html
 * <ul ndPaginationContent>…</ul>
 * ```
 */
@Directive({
  selector: 'ul[ndPaginationContent]',
  host: { 'data-slot': 'pagination-content', '[class]': 'classes()' },
})
export class PaginationContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex flex-row items-center gap-1', this.class()),
  );
}

/**
 * One entry of a pagination: a link, or an ellipsis.
 *
 * @example
 * ```html
 * <li ndPaginationItem>…</li>
 * ```
 */
@Directive({
  selector: 'li[ndPaginationItem]',
  host: { 'data-slot': 'pagination-item' },
})
export class PaginationItem {}

/**
 * A link to one page, styled as a ghost button, or an outline one for the
 * current page, which it marks `aria-current="page"`. On a `button`, it
 * calls your handler instead of navigating.
 *
 * @example
 * ```html
 * <a ndPaginationLink href="?page=2" active>2</a>
 * ```
 */
@Directive({
  selector: 'a[ndPaginationLink], button[ndPaginationLink]',
  host: {
    'data-slot': 'pagination-link',
    '[attr.aria-current]': 'active() ? "page" : null',
    '[attr.data-active]': 'active()',
    '[class]': 'classes()',
  },
})
export class PaginationLink {
  /** Whether it's the current page. */
  readonly active = input(false, { transform: booleanAttribute });

  /** Button size. */
  readonly size = input<ButtonSize>('icon');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({
        variant: this.active() ? 'outline' : 'ghost',
        size: this.size(),
      }),
      this.class(),
    ),
  );
}

/**
 * The link to the previous page. Put a `chevron-left` icon and the word
 * "Previous" in it; the icon turns around in right-to-left layouts.
 *
 * @example
 * ```html
 * <a ndPaginationPrevious href="?page=1"><svg ndIcon="chevron-left"></svg><span>Previous</span></a>
 * ```
 */
@Directive({
  selector: 'a[ndPaginationPrevious], button[ndPaginationPrevious]',
  host: {
    'data-slot': 'pagination-link',
    'aria-label': 'Go to previous page',
    '[class]': 'classes()',
  },
})
export class PaginationPrevious {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: 'ghost', size: 'default' }),
      'gap-1 px-2.5 sm:ps-2.5',
      'rtl:[&>svg]:rotate-180',
      this.class(),
    ),
  );
}

/**
 * The link to the next page. Put the word "Next" and a `chevron-right`
 * icon in it; the icon turns around in right-to-left layouts.
 *
 * @example
 * ```html
 * <a ndPaginationNext href="?page=3"><span>Next</span><svg ndIcon="chevron-right"></svg></a>
 * ```
 */
@Directive({
  selector: 'a[ndPaginationNext], button[ndPaginationNext]',
  host: {
    'data-slot': 'pagination-link',
    'aria-label': 'Go to next page',
    '[class]': 'classes()',
  },
})
export class PaginationNext {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: 'ghost', size: 'default' }),
      'gap-1 px-2.5 sm:pe-2.5',
      'rtl:[&>svg]:rotate-180',
      this.class(),
    ),
  );
}

/**
 * Stands for pages left out of a long range; hidden from assistive
 * technology. Put an `ellipsis` icon in it.
 *
 * @example
 * ```html
 * <span ndPaginationEllipsis><svg ndIcon="ellipsis"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndPaginationEllipsis]',
  host: {
    'data-slot': 'pagination-ellipsis',
    'aria-hidden': 'true',
    '[class]': 'classes()',
  },
})
export class PaginationEllipsis {
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
