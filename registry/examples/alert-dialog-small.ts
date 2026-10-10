import { Component } from '@angular/core';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialog,
  AlertDialogPortal,
  AlertDialogTrigger,
} from '@/ui/alert-dialog/alert-dialog';
import { Button } from '@/ui/button/button';

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
    AlertDialogOverlay,
    AlertDialogTitle,
    Button,
    AlertDialog,
    AlertDialogPortal,
    AlertDialogTrigger,
  ],
  template: `
    <ng-container ndAlertDialog>
      <button ndButton variant="outline" ndAlertDialogTrigger>
        Discard draft
      </button>
      <ng-template ndAlertDialogPortal>
        <div ndAlertDialogOverlay></div>
        <div ndAlertDialogContent size="sm">
          <div ndAlertDialogHeader>
            <h2 ndAlertDialogTitle>Discard draft?</h2>
            <p ndAlertDialogDescription>Your changes will be lost.</p>
          </div>
          <div ndAlertDialogFooter>
            <button ndAlertDialogCancel>Cancel</button>
            <button ndAlertDialogAction>Discard</button>
          </div>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class AlertDialogSmallExample {}
