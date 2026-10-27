import { computed, Directive, input } from '@angular/core';
import {
  NdSelectContent,
  NdSelectItem,
  NdSelectItemIndicator,
  NdSelectLabel,
  NdSelectSeparator,
  NdSelectTrigger,
} from '@ndop/primitives/select';
import { cn } from '@/lib/utils';

/**
 * The button that shows the value and opens the options. `size` is
 * `default` or `sm`. Put the chevron icon in it, last.
 *
 * @example
 * ```html
 * <button ndSelectTrigger id="fruit" size="sm">…</button>
 * ```
 */
@Directive({
  selector: 'button[ndSelectTrigger]',
  hostDirectives: [NdSelectTrigger],
  host: {
    'data-slot': 'select-trigger',
    '[attr.data-size]': 'size()',
    '[class]': 'classes()',
  },
})
export class SelectTrigger {
  /** Height: `default` or `sm`. */
  readonly size = input<'default' | 'sm'>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 [&>[ndSelectValue]]:line-clamp-1 [&>[ndSelectValue]]:flex [&>[ndSelectValue]]:items-center [&>[ndSelectValue]]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
      this.class(),
    ),
  );
}

/**
 * The list of options, written after the trigger; it opens below the
 * trigger, at least as wide.
 *
 * @example
 * ```html
 * <div ndSelectContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndSelectContent]',
  hostDirectives: [
    { directive: NdSelectContent, inputs: ['side', 'align', 'sideOffset'] },
  ],
  host: { 'data-slot': 'select-content', '[class]': 'classes()' },
})
export class SelectContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative z-50 max-h-[min(24rem,80vh)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
      'p-1 scroll-my-1',
      this.class(),
    ),
  );
}

/**
 * A heading for a group of options; point the group's `aria-labelledby`
 * at it.
 *
 * @example
 * ```html
 * <div ndSelectLabel id="fruits">Fruits</div>
 * ```
 */
@Directive({
  selector: '[ndSelectLabel]',
  hostDirectives: [NdSelectLabel],
  host: { 'data-slot': 'select-label', '[class]': 'classes()' },
})
export class SelectLabel {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('px-2 py-1.5 text-xs text-muted-foreground', this.class()),
  );
}

/**
 * One option. Put its {@link SelectItemIndicator} first and its
 * {@link SelectItemText} after.
 *
 * @example
 * ```html
 * <div ndSelectItem value="apple">…</div>
 * ```
 */
@Directive({
  selector: '[ndSelectItem]',
  hostDirectives: [
    { directive: NdSelectItem, inputs: ['value', 'disabled', 'label'] },
  ],
  host: { 'data-slot': 'select-item', '[class]': 'classes()' },
})
export class SelectItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pe-8 ps-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
      this.class(),
    ),
  );
}

/**
 * The check of the selected option, at its end.
 *
 * @example
 * ```html
 * <span ndSelectItemIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndSelectItemIndicator]',
  hostDirectives: [NdSelectItemIndicator],
  host: { 'data-slot': 'select-item-indicator', '[class]': 'classes()' },
})
export class SelectItemIndicator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'absolute end-2 flex size-3.5 items-center justify-center',
      this.class(),
    ),
  );
}

/**
 * A line between groups of options.
 *
 * @example
 * ```html
 * <div ndSelectSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndSelectSeparator]',
  hostDirectives: [NdSelectSeparator],
  host: { 'data-slot': 'select-separator', '[class]': 'classes()' },
})
export class SelectSeparator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('pointer-events-none -mx-1 my-1 h-px bg-border', this.class()),
  );
}
