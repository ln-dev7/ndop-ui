import { computed, Directive, input } from '@angular/core';
import {
  NdDialogClose,
  NdDialogContent,
  NdDialogDescription,
  NdDialogTitle,
} from '@ndop/primitives/dialog';
import { cn, variants, type VariantOf } from '@/lib/utils';
/** Class table for {@link SheetContent}. */
export const sheetVariants = variants({
  base: 'backdrop:bg-black/50 fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500',
  variants: {
    side: {
      end: 'inset-y-0 end-0 h-full w-3/4 border-s data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end sm:max-w-sm',
      start:
        'inset-y-0 start-0 h-full w-3/4 border-e data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start sm:max-w-sm',
      top: 'inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
      bottom:
        'inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
    },
  },
  defaults: { side: 'end' },
});

/** The edge a {@link SheetContent} slides in from. */
export type SheetSide = VariantOf<typeof sheetVariants, 'side'>;

/**
 * The sheet panel: a modal dialog labelled by its title, sliding in from
 * its `side`. `start` and `end` are logical, so they swap in
 * right-to-left layouts.
 *
 * @example
 * ```html
 * <dialog ndSheetContent side="end">…</dialog>
 * ```
 */
@Directive({
  selector: '[ndSheetContent]',
  hostDirectives: [NdDialogContent],
  host: {
    'data-slot': 'sheet-content',
    '[attr.data-side]': 'side()',
    '[class]': 'classes()',
  },
})
export class SheetContent {
  /** The edge it slides in from. */
  readonly side = input<SheetSide>('end');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(sheetVariants({ side: this.side() }), this.class()),
  );
}

/**
 * The close button in a sheet's corner; put an icon and a visually hidden
 * name in it.
 *
 * @example
 * ```html
 * <button ndSheetCloseButton>
 *   <svg ndIcon="x"></svg><span class="sr-only">Close</span>
 * </button>
 * ```
 */
@Directive({
  selector: 'button[ndSheetCloseButton]',
  hostDirectives: [NdDialogClose],
  host: {
    type: 'button',
    'data-slot': 'sheet-close',
    '[class]': 'classes()',
  },
})
export class SheetCloseButton {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'absolute top-4 end-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary [&_svg]:size-4',
      this.class(),
    ),
  );
}

/**
 * Lays out a sheet's title and description.
 *
 * @example
 * ```html
 * <div ndSheetHeader>…</div>
 * ```
 */
@Directive({
  selector: '[ndSheetHeader]',
  host: { 'data-slot': 'sheet-header', '[class]': 'classes()' },
})
export class SheetHeader {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('flex flex-col gap-1.5 p-4', this.class()),
  );
}

/**
 * Lays out a sheet's buttons at its bottom.
 *
 * @example
 * ```html
 * <div ndSheetFooter>…</div>
 * ```
 */
@Directive({
  selector: '[ndSheetFooter]',
  host: { 'data-slot': 'sheet-footer', '[class]': 'classes()' },
})
export class SheetFooter {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('mt-auto flex flex-col gap-2 p-4', this.class()),
  );
}

/**
 * A sheet's title, which labels it.
 *
 * @example
 * ```html
 * <h2 ndSheetTitle>Edit profile</h2>
 * ```
 */
@Directive({
  selector: '[ndSheetTitle]',
  hostDirectives: [NdDialogTitle],
  host: { 'data-slot': 'sheet-title', '[class]': 'classes()' },
})
export class SheetTitle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('font-semibold text-foreground', this.class()),
  );
}

/**
 * A sheet's description.
 *
 * @example
 * ```html
 * <p ndSheetDescription>Make changes to your profile here.</p>
 * ```
 */
@Directive({
  selector: '[ndSheetDescription]',
  hostDirectives: [NdDialogDescription],
  host: { 'data-slot': 'sheet-description', '[class]': 'classes()' },
})
export class SheetDescription {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('text-sm text-muted-foreground', this.class()),
  );
}
