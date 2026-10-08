import { computed, Directive, input } from '@angular/core';
import { NdInput } from '@ndop/primitives/input';
import { cn, variants, type VariantOf } from '@/lib/utils';

/** Class table for {@link Input}. */
export const inputVariants = variants({
  base: 'w-full min-w-0 rounded-md border shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
  variants: {
    variant: {
      default: 'border-input bg-transparent dark:bg-input/30',
      filled: 'border-transparent bg-muted',
      ghost: 'border-transparent bg-transparent shadow-none',
    },
    size: {
      sm: 'h-8 px-2.5 text-sm',
      default: 'h-9 px-3 py-1 text-base md:text-sm',
      lg: 'h-10 px-4 text-base',
    },
  },
  defaults: { variant: 'default', size: 'default' },
});

/** Visual style of an {@link Input}. */
export type InputVariant = VariantOf<typeof inputVariants, 'variant'>;

/** Size of an {@link Input}. */
export type InputSize = VariantOf<typeof inputVariants, 'size'>;

/**
 * Styled text input.
 *
 * @example
 * ```html
 * <input ndInput id="email" type="email" />
 * ```
 */
@Directive({
  selector: 'input[ndInput]',
  hostDirectives: [{ directive: NdInput, inputs: ['id', 'invalid'] }],
  host: { 'data-slot': 'input', '[class]': 'classes()' },
})
export class Input {
  /** Visual style. */
  readonly variant = input<InputVariant>('default');

  /** Height, padding and text size. */
  readonly size = input<InputSize>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      inputVariants({ variant: this.variant(), size: this.size() }),
      this.class(),
    ),
  );
}
