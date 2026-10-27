import { computed, Directive, input } from '@angular/core';
import {
  NdAlertDialogAction,
  NdAlertDialogCancel,
  NdAlertDialogContent,
  NdAlertDialogDescription,
  NdAlertDialogTitle,
} from '@ndop/primitives/alert-dialog';
import {
  buttonVariants,
  type ButtonSize,
  type ButtonVariant,
} from '@/ui/button/button';
import { cn } from '@/lib/utils';

/**
 * The alert dialog box (`@ndop/primitives/alert-dialog`): an
 * `alertdialog` labelled by its title, with focus starting on Cancel.
 * `size="sm"` is a compact, centered layout with side-by-side buttons.
 *
 * @example
 * ```html
 * <dialog ndAlertDialogContent>
 *   <div ndAlertDialogHeader>
 *     <h2 ndAlertDialogTitle>Delete this project?</h2>
 *     <p ndAlertDialogDescription>This can't be undone.</p>
 *   </div>
 *   <div ndAlertDialogFooter>
 *     <button ndAlertDialogCancel>Cancel</button>
 *     <button ndAlertDialogAction variant="destructive">Delete</button>
 *   </div>
 * </dialog>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogContent]',
  hostDirectives: [NdAlertDialogContent],
  host: {
    'data-slot': 'alert-dialog-content',
    '[attr.data-size]': 'size()',
    '[class]': 'classes()',
  },
})
export class AlertDialogContent {
  /** `default`, or `sm` for a compact, centered dialog. */
  readonly size = input<'default' | 'sm'>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'backdrop:bg-black/50 group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[size=sm]:max-w-xs data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[size=default]:sm:max-w-lg',
      this.class(),
    ),
  );
}

/**
 * Lays out an alert dialog's media, title and description.
 *
 * @example
 * ```html
 * <div ndAlertDialogHeader>…</div>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogHeader]',
  host: { 'data-slot': 'alert-dialog-header', '[class]': 'classes()' },
})
export class AlertDialogHeader {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-start sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]',
      this.class(),
    ),
  );
}

/**
 * Lays out an alert dialog's buttons: stacked on small screens, in a row
 * at the end side otherwise.
 *
 * @example
 * ```html
 * <div ndAlertDialogFooter>…</div>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogFooter]',
  host: { 'data-slot': 'alert-dialog-footer', '[class]': 'classes()' },
})
export class AlertDialogFooter {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end',
      this.class(),
    ),
  );
}

/**
 * The question an alert dialog asks; it labels the dialog.
 *
 * @example
 * ```html
 * <h2 ndAlertDialogTitle>Delete this project?</h2>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogTitle]',
  hostDirectives: [NdAlertDialogTitle],
  host: { 'data-slot': 'alert-dialog-title', '[class]': 'classes()' },
})
export class AlertDialogTitle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'text-lg font-semibold sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2',
      this.class(),
    ),
  );
}

/**
 * What answering means; it describes the dialog.
 *
 * @example
 * ```html
 * <p ndAlertDialogDescription>This can't be undone.</p>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogDescription]',
  hostDirectives: [NdAlertDialogDescription],
  host: { 'data-slot': 'alert-dialog-description', '[class]': 'classes()' },
})
export class AlertDialogDescription {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('text-sm text-muted-foreground', this.class()),
  );
}

/**
 * An icon above or beside the title, hidden from assistive technology.
 *
 * @example
 * ```html
 * <div ndAlertDialogMedia><svg ndIcon="circle-alert"></svg></div>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogMedia]',
  host: {
    'data-slot': 'alert-dialog-media',
    'aria-hidden': 'true',
    '[class]': 'classes()',
  },
})
export class AlertDialogMedia {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      "mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
      this.class(),
    ),
  );
}

/**
 * The button that confirms, styled as a Button: its `(click)` runs, then
 * the dialog closes. Use `variant="destructive"` for destructive actions.
 *
 * @example
 * ```html
 * <button ndAlertDialogAction (click)="delete()">Delete</button>
 * ```
 */
@Directive({
  selector: 'button[ndAlertDialogAction]',
  hostDirectives: [NdAlertDialogAction],
  host: {
    'data-slot': 'alert-dialog-action',
    '[class]': 'classes()',
  },
})
export class AlertDialogAction {
  /** Button style. */
  readonly variant = input<ButtonVariant>('default');

  /** Button size. */
  readonly size = input<ButtonSize>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: this.variant(), size: this.size() }),
      this.class(),
    ),
  );
}

/**
 * The button that cancels and closes, styled as an outline Button; focus
 * starts here.
 *
 * @example
 * ```html
 * <button ndAlertDialogCancel>Cancel</button>
 * ```
 */
@Directive({
  selector: 'button[ndAlertDialogCancel]',
  hostDirectives: [NdAlertDialogCancel],
  host: {
    'data-slot': 'alert-dialog-cancel',
    '[class]': 'classes()',
  },
})
export class AlertDialogCancel {
  /** Button style. */
  readonly variant = input<ButtonVariant>('outline');

  /** Button size. */
  readonly size = input<ButtonSize>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: this.variant(), size: this.size() }),
      this.class(),
    ),
  );
}
