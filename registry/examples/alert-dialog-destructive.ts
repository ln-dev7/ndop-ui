import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialog,
  AlertDialogPortal,
  AlertDialogTrigger,
} from '@/ui/alert-dialog/alert-dialog';
import { Button } from '@/ui/button/button';

/**
 * Deleting a project: an icon, a destructive action whose handler runs
 * before the dialog closes, and the result reported on the page.
 */
@Component({
  selector: 'example-alert-dialog-destructive',
  imports: [
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogOverlay,
    AlertDialogTitle,
    Button,
    AlertDialog,
    AlertDialogPortal,
    AlertDialogTrigger,
    NdIcon,
  ],
  template: `
    <div class="flex flex-col items-start gap-3">
      <ng-container ndAlertDialog>
        <button ndButton variant="destructive" ndAlertDialogTrigger>
          Delete project
        </button>
        <ng-template ndAlertDialogPortal>
          <div ndAlertDialogOverlay></div>
          <div ndAlertDialogContent>
            <div ndAlertDialogHeader>
              <div ndAlertDialogMedia><svg ndIcon="circle-alert"></svg></div>
              <h2 ndAlertDialogTitle>Delete "Website redesign"?</h2>
              <p ndAlertDialogDescription>
                Its 24 tasks and their comments are deleted for everyone. This
                can't be undone.
              </p>
            </div>
            <div ndAlertDialogFooter>
              <button ndAlertDialogCancel>Keep project</button>
              <button
                ndAlertDialogAction
                variant="destructive"
                (click)="deleted.set(true)"
              >
                Delete project
              </button>
            </div>
          </div>
        </ng-template>
      </ng-container>
      <p class="text-sm text-muted-foreground" aria-live="polite">
        @if (deleted()) {
          Project deleted.
        }
      </p>
    </div>
  `,
})
export class AlertDialogDestructiveExample {
  protected readonly deleted = signal(false);
}
