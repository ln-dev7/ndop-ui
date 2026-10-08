import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { cn, variants, type VariantOf } from '@ndop/core';

const buttonVariants = variants({
  base: 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      outline: 'border border-input bg-background hover:bg-accent',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      xs: 'h-7 px-2 text-xs',
      sm: 'h-8 px-3',
      md: 'h-9 px-4',
      lg: 'h-10 px-6',
      icon: 'size-9',
    },
  },
  defaults: { variant: 'default', size: 'md' },
});

/**
 * Styled button. Apply to a native `button` or `a`.
 *
 * @example
 * ```html
 * <button ndButton variant="outline">Cancel</button>
 * ```
 */
@Directive({
  selector: 'button[ndButton], a[ndButton]',
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.data-loading]': 'loading() ? "" : null',
  },
})
export class Button {
  /** Visual style. */
  readonly variant =
    input<VariantOf<typeof buttonVariants, 'variant'>>('default');
  /** Height and padding. */
  readonly size = input<VariantOf<typeof buttonVariants, 'size'>>('md');
  /** Extra classes, merged last so they win. */
  readonly class = input('');
  /** Shows a busy state and sets `aria-busy` while an action runs. */
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: this.variant(), size: this.size() }),
      this.class(),
    ),
  );
}
