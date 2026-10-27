import { Component } from '@angular/core';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/ui/alert-dialog/alert-dialog';
import { Button } from '@/ui/button/button';
import {
  NdAlertDialog as AlertDialog,
  NdAlertDialogTrigger as AlertDialogTrigger,
} from '@ndop/primitives/alert-dialog';

/** The small size: a short question with side-by-side buttons. */
@Component({
  selector: 'example-alert-dialog-small',
  imports: [
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,

    AlertDialogTitle,
    Button,
    AlertDialog,

    AlertDialogTrigger,
  ],
  template: `
    <ng-container ndAlertDialog>
      <button ndButton variant="outline" ndAlertDialogTrigger>
        Discard draft
      </button>

      <dialog ndAlertDialogContent size="sm">
        <div ndAlertDialogHeader>
          <h2 ndAlertDialogTitle>Discard draft?</h2>
          <p ndAlertDialogDescription>Your changes will be lost.</p>
        </div>
        <div ndAlertDialogFooter>
          <button ndAlertDialogCancel>Cancel</button>
          <button ndAlertDialogAction>Discard</button>
        </div>
      </dialog>
    </ng-container>
  `,
})
export class AlertDialogSmallExample {}
