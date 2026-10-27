import { computed, Directive, input } from '@angular/core';
import {
  NdComboboxChip,
  NdComboboxChipRemove,
  NdComboboxChips,
  NdComboboxClear,
  NdComboboxContent,
  NdComboboxEmpty,
  NdComboboxInput,
  NdComboboxItem,
  NdComboboxItemIndicator,
  NdComboboxLabel,
  NdComboboxList,
  NdComboboxSeparator,
  NdComboboxTrigger,
} from '@ndop/primitives/combobox';
import { buttonVariants } from '@/ui/button/button';
import { cn } from '@/lib/utils';

/** Classes of the small icon buttons beside the field and in chips. */
const iconButton = buttonVariants({ variant: 'ghost', size: 'icon-xs' });

/**
 * The bordered row around a single-value combobox's field and its buttons.
 * The trigger hides while the clear button shows.
 *
 * @example
 * ```html
 * <div ndComboboxControl>…</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxControl]',
  host: { 'data-slot': 'combobox-control', '[class]': 'classes()' },
})
export class ComboboxControl {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/combobox-control relative flex h-9 w-auto min-w-0 items-center gap-1 rounded-md border border-input bg-transparent pe-1 shadow-xs transition-[color,box-shadow] has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-destructive/20 dark:bg-input/30 dark:has-aria-invalid:ring-destructive/40',
      this.class(),
    ),
  );
}

/**
 * The text field of a single-value combobox, inside its
 * {@link ComboboxControl}.
 *
 * @example
 * ```html
 * <input ndComboboxInput aria-label="Framework" />
 * ```
 */
@Directive({
  selector: 'input[ndComboboxInput]',
  hostDirectives: [NdComboboxInput],
  host: { 'data-slot': 'combobox-input', '[class]': 'classes()' },
})
export class ComboboxInput {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'h-full w-full min-w-0 flex-1 bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
      this.class(),
    ),
  );
}

/**
 * The button that opens and closes the list with the pointer. Put the
 * chevron icon in it.
 *
 * @example
 * ```html
 * <button ndComboboxTrigger><svg ndIcon="chevron-down"></svg></button>
 * ```
 */
@Directive({
  selector: 'button[ndComboboxTrigger]',
  hostDirectives: [NdComboboxTrigger],
  host: { 'data-slot': 'combobox-trigger', '[class]': 'classes()' },
})
export class ComboboxTrigger {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      iconButton,
      "[&_svg:not([class*='size-'])]:size-4",
      '[&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:text-muted-foreground',
      'group-has-[[data-slot=combobox-clear]:not([hidden])]/combobox-control:hidden',
      this.class(),
    ),
  );
}

/**
 * The button that empties the field and the value with the pointer. Put
 * the x icon in it.
 *
 * @example
 * ```html
 * <button ndComboboxClear><svg ndIcon="x"></svg></button>
 * ```
 */
@Directive({
  selector: 'button[ndComboboxClear]',
  hostDirectives: [NdComboboxClear],
  host: { 'data-slot': 'combobox-clear', '[class]': 'classes()' },
})
export class ComboboxClear {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(iconButton, '[&>svg]:pointer-events-none', this.class()),
  );
}

/**
 * The popup, written after the field; it opens below the field or the
 * chips, as wide as them.
 *
 * @example
 * ```html
 * <div ndComboboxContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxContent]',
  hostDirectives: [
    { directive: NdComboboxContent, inputs: ['side', 'align', 'sideOffset'] },
  ],
  host: { 'data-slot': 'combobox-content', '[class]': 'classes()' },
})
export class ComboboxContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/combobox-content relative max-h-96 w-(--nd-combobox-anchor-width) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'isolate z-50',
      this.class(),
    ),
  );
}

/**
 * The scrolling list of options.
 *
 * @example
 * ```html
 * <div ndComboboxList>…</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxList]',
  hostDirectives: [NdComboboxList],
  host: { 'data-slot': 'combobox-list', '[class]': 'classes()' },
})
export class ComboboxList {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'max-h-[calc(--spacing(96)---spacing(9))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0',
      this.class(),
    ),
  );
}

/**
 * One option. Put its {@link ComboboxItemIndicator} last.
 *
 * @example
 * ```html
 * <div ndComboboxItem value="angular">Angular</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxItem]',
  hostDirectives: [
    { directive: NdComboboxItem, inputs: ['value', 'disabled', 'label'] },
  ],
  host: { 'data-slot': 'combobox-item', '[class]': 'classes()' },
})
export class ComboboxItem {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pe-8 ps-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      this.class(),
    ),
  );
}

/**
 * The check of a chosen option, at its end.
 *
 * @example
 * ```html
 * <span ndComboboxItemIndicator><svg ndIcon="check"></svg></span>
 * ```
 */
@Directive({
  selector: '[ndComboboxItemIndicator]',
  hostDirectives: [NdComboboxItemIndicator],
  host: { 'data-slot': 'combobox-item-indicator', '[class]': 'classes()' },
})
export class ComboboxItemIndicator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'pointer-events-none absolute end-2 flex size-4 items-center justify-center',
      '[&>svg]:pointer-events-none [&>svg]:size-4 pointer-coarse:[&>svg]:size-5',
      this.class(),
    ),
  );
}

/**
 * The heading of a {@link ComboboxGroup}.
 *
 * @example
 * ```html
 * <div ndComboboxLabel>Frontend</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxLabel]',
  hostDirectives: [NdComboboxLabel],
  host: { 'data-slot': 'combobox-label', '[class]': 'classes()' },
})
export class ComboboxLabel {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'px-2 py-1.5 text-xs text-muted-foreground pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm',
      this.class(),
    ),
  );
}

/**
 * What shows while no option matches the field's text.
 *
 * @example
 * ```html
 * <div ndComboboxEmpty>No framework found.</div>
 * ```
 */
@Directive({
  selector: '[ndComboboxEmpty]',
  hostDirectives: [NdComboboxEmpty],
  host: { 'data-slot': 'combobox-empty', '[class]': 'classes()' },
})
export class ComboboxEmpty {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex',
      this.class(),
    ),
  );
}

/**
 * A line between groups of options.
 *
 * @example
 * ```html
 * <div ndComboboxSeparator></div>
 * ```
 */
@Directive({
  selector: '[ndComboboxSeparator]',
  hostDirectives: [NdComboboxSeparator],
  host: { 'data-slot': 'combobox-separator', '[class]': 'classes()' },
})
export class ComboboxSeparator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('-mx-1 my-1 h-px bg-border', this.class()),
  );
}

/**
 * The bordered box around the chips and the field of a combobox with
 * `multiple`.
 *
 * @example
 * ```html
 * <div ndComboboxChips>…<input ndComboboxChipsInput /></div>
 * ```
 */
@Directive({
  selector: '[ndComboboxChips]',
  hostDirectives: [NdComboboxChips],
  host: { 'data-slot': 'combobox-chips', '[class]': 'classes()' },
})
export class ComboboxChips {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-[3px] has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1.5 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40',
      this.class(),
    ),
  );
}

/**
 * One chosen value, as a chip. Put its {@link ComboboxChipRemove} last.
 *
 * @example
 * ```html
 * <span ndComboboxChip [value]="value">{{ value }}</span>
 * ```
 */
@Directive({
  selector: '[ndComboboxChip]',
  hostDirectives: [{ directive: NdComboboxChip, inputs: ['value'] }],
  host: { 'data-slot': 'combobox-chip', '[class]': 'classes()' },
})
export class ComboboxChip {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pe-0',
      this.class(),
    ),
  );
}

/**
 * The button that removes its chip's value with the pointer. Put the x
 * icon in it.
 *
 * @example
 * ```html
 * <button ndComboboxChipRemove><svg ndIcon="x"></svg></button>
 * ```
 */
@Directive({
  selector: 'button[ndComboboxChipRemove]',
  hostDirectives: [NdComboboxChipRemove],
  host: { 'data-slot': 'combobox-chip-remove', '[class]': 'classes()' },
})
export class ComboboxChipRemove {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      iconButton,
      '-ms-1 opacity-50 hover:opacity-100',
      '[&>svg]:pointer-events-none',
      this.class(),
    ),
  );
}

/**
 * The text field among the chips of a combobox with `multiple`.
 *
 * @example
 * ```html
 * <input ndComboboxChipsInput aria-label="Frameworks" />
 * ```
 */
@Directive({
  selector: 'input[ndComboboxChipsInput]',
  hostDirectives: [NdComboboxInput],
  host: { 'data-slot': 'combobox-chip-input', '[class]': 'classes()' },
})
export class ComboboxChipsInput {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('min-w-16 flex-1 bg-transparent outline-none', this.class()),
  );
}
