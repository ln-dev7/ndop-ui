import { computed, Directive, input } from '@angular/core';
import { cn, variants, type VariantOf } from '@/lib/utils';

/**
 * Class table for {@link Alert}.
 */
export const alertVariants = variants({
  base: 'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      // The description is full destructive: shadcn's 90% is 4.49:1 on
      // the card, under WCAG's 4.5:1.
      destructive:
        'bg-card text-destructive *:data-[slot=alert-description]:text-destructive [&>svg]:text-current',
    },
  },
  defaults: { variant: 'default' },
});

/** Visual style of an {@link Alert}. */
export type AlertVariant = VariantOf<typeof alertVariants, 'variant'>;

/**
 * A callout: a message that draws attention, with an optional icon,
 * title and description. It's announced as an `alert` by default; use
 * `role="status"` for messages that can wait, or `role="none"` for ones
 * that are part of the page from the start.
 *
 * @example
 * ```html
 * <div ndAlert variant="destructive">
 *   <svg ndIcon="circle-alert"></svg>
 *   <div ndAlertTitle>Payment failed</div>
 *   <div ndAlertDescription>Check your card details and try again.</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndAlert]',
  host: {
    'data-slot': 'alert',
    '[attr.role]': 'role()',
    '[attr.data-variant]': 'variant()',
    '[class]': 'classes()',
  },
})
export class Alert {
  /** Visual style. */
  readonly variant = input<AlertVariant>('default');

  /**
   * How assistive technology treats it: `alert` interrupts, `status`
   * waits for a pause, `none` is read with the page.
   */
  readonly role = input<'alert' | 'status' | 'none'>('alert');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(alertVariants({ variant: this.variant() }), this.class()),
  );
}

/**
 * An alert's title.
 *
 * @example
 * ```html
 * <div ndAlertTitle>Payment failed</div>
 * ```
 */
@Directive({
  selector: '[ndAlertTitle]',
  host: { 'data-slot': 'alert-title', '[class]': 'classes()' },
})
export class AlertTitle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight',
      this.class(),
    ),
  );
}

/**
 * An alert's description, under its title.
 *
 * @example
 * ```html
 * <div ndAlertDescription>Check your card details and try again.</div>
 * ```
 */
@Directive({
  selector: '[ndAlertDescription]',
  host: { 'data-slot': 'alert-description', '[class]': 'classes()' },
})
export class AlertDescription {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
      this.class(),
    ),
  );
}
