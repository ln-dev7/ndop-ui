import { Component } from '@angular/core';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/ui/alert-dialog/alert-dialog';
import { Button } from '@/ui/button/button';
import {
  NdAlertDialog as AlertDialog,
  NdAlertDialogTrigger as AlertDialogTrigger,
} from '@ndop/primitives/alert-dialog';

/** A confirmation before signing out, with Cancel focused first. */
@Component({
  selector: 'example-alert-dialog-demo',
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
      <button ndButton variant="outline" ndAlertDialogTrigger>Sign out</button>

      <dialog ndAlertDialogContent>
        <div ndAlertDialogHeader>
          <h2 ndAlertDialogTitle>Sign out of every device?</h2>
          <p ndAlertDialogDescription>
            You'll need to sign in again on your phone and other computers.
          </p>
        </div>
        <div ndAlertDialogFooter>
          <button ndAlertDialogCancel>Cancel</button>
          <button ndAlertDialogAction>Sign out</button>
        </div>
      </dialog>
    </ng-container>
  `,
})
export class AlertDialogDemoExample {}
