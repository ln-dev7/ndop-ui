import { computed, Directive, input } from '@angular/core';
import { cn, variants, type VariantOf } from '@/lib/utils';

/**
 * An empty state: shown where content would be, when there's none yet,
 * with what to do about it.
 *
 * @example
 * ```html
 * <div ndEmpty>
 *   <div ndEmptyHeader>
 *     <div ndEmptyMedia variant="icon"><svg ndIcon="inbox"></svg></div>
 *     <h3 ndEmptyTitle>No messages</h3>
 *     <p ndEmptyDescription>New messages show up here.</p>
 *   </div>
 *   <div ndEmptyContent><button ndButton>Compose</button></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndEmpty]',
  host: { 'data-slot': 'empty', '[class]': 'classes()' },
})
export class Empty {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12',
      this.class(),
    ),
  );
}

/**
 * An empty state's header: its media, title and description.
 *
 * @example
 * ```html
 * <div ndEmptyHeader>…</div>
 * ```
 */
@Directive({
  selector: '[ndEmptyHeader]',
  host: { 'data-slot': 'empty-header', '[class]': 'classes()' },
})
export class EmptyHeader {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex max-w-sm flex-col items-center gap-2 text-center', this.class()),
  );
}

/**
 * Class table for {@link EmptyMedia}.
 */
export const emptyMediaVariants = variants({
  base: 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  variants: {
    variant: {
      default: 'bg-transparent',
      icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
    },
  },
  defaults: { variant: 'default' },
});

/** Visual style of an {@link EmptyMedia}. */
export type EmptyMediaVariant = VariantOf<typeof emptyMediaVariants, 'variant'>;

/**
 * An image or icon above an empty state's title; `variant="icon"` puts an
 * icon on a muted tile.
 *
 * @example
 * ```html
 * <div ndEmptyMedia variant="icon"><svg ndIcon="inbox"></svg></div>
 * ```
 */
@Directive({
  selector: '[ndEmptyMedia]',
  host: {
    'data-slot': 'empty-icon',
    '[attr.data-variant]': 'variant()',
    '[class]': 'classes()',
  },
})
export class EmptyMedia {
  /** Visual style. */
  readonly variant = input<EmptyMediaVariant>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(emptyMediaVariants({ variant: this.variant() }), this.class()),
  );
}

/**
 * An empty state's title. Put it on the heading element that fits the
 * page's outline.
 *
 * @example
 * ```html
 * <h3 ndEmptyTitle>No messages</h3>
 * ```
 */
@Directive({
  selector: '[ndEmptyTitle]',
  host: { 'data-slot': 'empty-title', '[class]': 'classes()' },
})
export class EmptyTitle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('text-lg font-medium tracking-tight', this.class()),
  );
}

/**
 * What an empty state means, and what to do; links in it are underlined.
 *
 * @example
 * ```html
 * <p ndEmptyDescription>New messages show up here.</p>
 * ```
 */
@Directive({
  selector: '[ndEmptyDescription]',
  host: { 'data-slot': 'empty-description', '[class]': 'classes()' },
})
export class EmptyDescription {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
      this.class(),
    ),
  );
}

/**
 * An empty state's actions, under its header.
 *
 * @example
 * ```html
 * <div ndEmptyContent><button ndButton>Compose</button></div>
 * ```
 */
@Directive({
  selector: '[ndEmptyContent]',
  host: { 'data-slot': 'empty-content', '[class]': 'classes()' },
})
export class EmptyContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance',
      this.class(),
    ),
  );
}
