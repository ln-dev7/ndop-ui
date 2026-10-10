import { Component } from '@angular/core';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialog,
  AlertDialogPortal,
  AlertDialogTrigger,
} from '@/ui/alert-dialog/alert-dialog';
import { Button } from '@/ui/button/button';

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
    AlertDialogOverlay,
    AlertDialogTitle,
    Button,
    AlertDialog,
    AlertDialogPortal,
    AlertDialogTrigger,
  ],
  template: `
    <ng-container ndAlertDialog>
      <button ndButton variant="outline" ndAlertDialogTrigger>Sign out</button>
      <ng-template ndAlertDialogPortal>
        <div ndAlertDialogOverlay></div>
        <div ndAlertDialogContent>
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
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class AlertDialogDemoExample {}
