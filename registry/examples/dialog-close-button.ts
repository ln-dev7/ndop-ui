import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  Dialog,
  DialogClose,
  DialogPortal,
  DialogTrigger,
} from '@/ui/dialog/dialog';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';

/** A share dialog with a read-only link and a footer close button. */
@Component({
  selector: 'example-dialog-close-button',
  imports: [
    Dialog,
    DialogTrigger,
    DialogPortal,
    DialogClose,
    DialogOverlay,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogCloseButton,
    NdIcon,
    Button,
    Input,
    Label,
  ],
  template: `
    <ng-container ndDialog>
      <button ndButton ndDialogTrigger variant="outline">Share</button>
      <ng-template ndDialogPortal>
        <div ndDialogOverlay></div>
        <div ndDialogContent class="sm:max-w-md">
          <div ndDialogHeader>
            <h2 ndDialogTitle>Share link</h2>
            <p ndDialogDescription>
              Anyone who has this link will be able to view this.
            </p>
          </div>
          <div class="grid gap-2">
            <label ndLabel for="dialog-close-button-link" class="sr-only">
              Link
            </label>
            <input
              ndInput
              id="dialog-close-button-link"
              value="https://ndop.dev/docs/installation"
              readonly
            />
          </div>
          <div ndDialogFooter class="sm:justify-start">
            <button ndButton ndDialogClose variant="secondary">Close</button>
          </div>
          <button ndDialogCloseButton>
            <svg ndIcon="x"></svg>
            <span class="sr-only">Close</span>
          </button>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class DialogCloseButtonExample {}
