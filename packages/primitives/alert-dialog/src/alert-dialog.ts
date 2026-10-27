import {
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
} from '@angular/core';
import {
  ND_DIALOG,
  NdDialog,
  NdDialogClose,
  NdDialogDescription,
  NdDialogPortal,
  NdDialogTitle,
  NdDialogTrigger,
} from '@ndop/primitives/dialog';

/**
 * Root of an alert dialog: the WAI-ARIA Alert Dialog pattern, a modal
 * dialog that asks the user to confirm or cancel. It's the Dialog
 * primitive with a different content role and dismissal: clicking outside
 * doesn't close it, Escape cancels it, and focus starts on Cancel. Put it
 * on an `ng-container`.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
 *
 * @example
 * ```html
 * <ng-container ndAlertDialog [(open)]="confirming">
 *   <button ndAlertDialogTrigger>Delete project</button>
 *   <ng-template ndAlertDialogPortal>
 *
 *     <dialog ndAlertDialogContent>
 *       <h2 ndAlertDialogTitle>Delete this project?</h2>
 *       <p ndAlertDialogDescription>This can't be undone.</p>
 *       <button ndAlertDialogCancel>Cancel</button>
 *       <button ndAlertDialogAction (click)="delete()">Delete</button>
 *     </dialog>
 *   </ng-template>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[ndAlertDialog]',
  exportAs: 'ndAlertDialog',
  hostDirectives: [
    {
      directive: NdDialog,
      inputs: ['open', 'defaultOpen'],
      outputs: ['openChange'],
    },
  ],
})
export class NdAlertDialog {}

/**
 * The button that opens an {@link NdAlertDialog}, with
 * `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.
 *
 * @example
 * ```html
 * <button ndAlertDialogTrigger>Delete project</button>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogTrigger]',
  hostDirectives: [NdDialogTrigger],
})
export class NdAlertDialogTrigger {}

/**
 * Marks the `ng-template` an {@link NdAlertDialog} renders while open.
 *
 * @example
 * ```html
 * <ng-template ndAlertDialogPortal>…</ng-template>
 * ```
 */
@Directive({
  selector: 'ng-template[ndAlertDialogPortal]',
  hostDirectives: [NdDialogPortal],
})
export class NdAlertDialogPortal {}

/**
 * Legacy separate backdrop marker, retained for migration compatibility.
 * Native modal rendering uses the content element's `::backdrop` instead.
 *
 * @deprecated Style the native dialog's `::backdrop`; no overlay node is needed.
 *
 * @example
 * ```html
 * <dialog ndAlertDialogContent aria-label="Details" class="backdrop:bg-black/50">…</dialog>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogOverlay]',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'dialog.open() ? "open" : "closed"',
  },
})
export class NdAlertDialogOverlay {
  protected readonly dialog = inject(ND_DIALOG);
}

/**
 * The alert dialog box: `role="alertdialog"`, `aria-modal="true"`,
 * labelled by its title and described by its description. Focus is
 * managed by native modality while the background page is inert.
 *
 * @example
 * ```html
 * <dialog ndAlertDialogContent>…</dialog>
 * ```
 */
@Directive({
  selector: 'dialog[ndAlertDialogContent]',
  host: {
    role: 'alertdialog',
    '(cancel)': 'dialog.cancel($event)',
    '(close)': 'dialog.closed()',
    'aria-modal': 'true',
    tabindex: '-1',
    '[attr.id]': 'dialog.contentId()',
    '[attr.aria-labelledby]': 'dialog.titleId()',
    '[attr.aria-describedby]': 'dialog.descriptionId()',
    '[attr.data-state]': 'dialog.open() ? "open" : "closed"',
  },
})
export class NdAlertDialogContent {
  protected readonly dialog = inject(ND_DIALOG);

  constructor() {
    const ownId = inject(new HostAttributeToken('id'), { optional: true });
    if (ownId) {
      this.dialog.contentId.set(ownId);
    }
    this.dialog.registerContent(inject(ElementRef).nativeElement);
    inject(DestroyRef).onDestroy(() => this.dialog.registerContent(null));
  }
}

/**
 * The title of an {@link NdAlertDialog}, which labels it.
 *
 * @example
 * ```html
 * <h2 ndAlertDialogTitle>Delete this project?</h2>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogTitle]',
  hostDirectives: [NdDialogTitle],
})
export class NdAlertDialogTitle {}

/**
 * The message of an {@link NdAlertDialog}, which describes it.
 *
 * @example
 * ```html
 * <p ndAlertDialogDescription>This can't be undone.</p>
 * ```
 */
@Directive({
  selector: '[ndAlertDialogDescription]',
  hostDirectives: [NdDialogDescription],
})
export class NdAlertDialogDescription {}

/**
 * The button that cancels an {@link NdAlertDialog} and closes it. Focus
 * starts here when the dialog opens, since cancelling is the safe choice.
 *
 * @example
 * ```html
 * <button ndAlertDialogCancel>Cancel</button>
 * ```
 */
@Directive({
  selector: 'button[ndAlertDialogCancel]',
  hostDirectives: [NdDialogClose],
  host: { type: 'button', autofocus: '' },
})
export class NdAlertDialogCancel {}

/**
 * The button that confirms an {@link NdAlertDialog}: its own `(click)`
 * handler runs, then the dialog closes.
 *
 * @example
 * ```html
 * <button ndAlertDialogAction (click)="delete()">Delete</button>
 * ```
 */
@Directive({
  selector: 'button[ndAlertDialogAction]',
  hostDirectives: [NdDialogClose],
  host: { type: 'button' },
})
export class NdAlertDialogAction {}
