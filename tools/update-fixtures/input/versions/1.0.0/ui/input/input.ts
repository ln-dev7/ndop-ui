import { computed, Directive, input } from '@angular/core';
import { NdInput } from '@ndop/primitives/input';
import { cn, variants, type VariantOf } from '@/lib/utils';

/** Class table for {@link Input}. */
export const inputVariants = variants({
  base: 'h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  variants: {
    variant: {
      default: 'border-input bg-transparent dark:bg-input/30',
      filled: 'border-transparent bg-muted',
    },
  },
  defaults: { variant: 'default' },
});

/** Visual style of an {@link Input}. */
export type InputVariant = VariantOf<typeof inputVariants, 'variant'>;

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

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(inputVariants({ variant: this.variant() }), this.class()),
  );
}
