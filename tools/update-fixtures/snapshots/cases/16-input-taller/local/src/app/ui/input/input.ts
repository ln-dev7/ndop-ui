/*
 * Styles from shadcn/ui new-york-v4 "input" (MIT License, Copyright (c) 2023
 * shadcn), copied on 2026-10-02 (ADR-0014). No changes.
 */
import { computed, Directive, input } from '@angular/core';
import { NdInput } from '@ndop/primitives/input';
import { cn } from '@/lib/utils';

/**
 * Styled text input. Forms bind the native input directly; the
 * `@ndop/primitives/input` behavior reflects their state as
 * `aria-invalid` once the field is touched.
 *
 * @example
 * ```html
 * <input ndInput id="email" type="email" [formField]="form.email" />
 * ```
 */
@Directive({
  selector: 'input[ndInput]',
  hostDirectives: [{ directive: NdInput, inputs: ['id', 'invalid'] }],
  host: { 'data-slot': 'input', '[class]': 'classes()' },
})
export class Input {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-4 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
      this.class(),
    ),
  );
}
