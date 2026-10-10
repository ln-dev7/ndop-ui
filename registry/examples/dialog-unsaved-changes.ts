import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
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
import { Label } from '@/ui/label/label';
import { Textarea } from '@/ui/textarea/textarea';

/**
 * A dialog that a click outside doesn't close, so the user doesn't lose
 * what they typed by accident. Escape and the buttons still close it.
 */
@Component({
  selector: 'example-dialog-unsaved-changes',
  imports: [
    Button,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogTitle,
    Label,
    Dialog,
    DialogClose,
    DialogPortal,
    DialogTrigger,
    Textarea,
  ],
  template: `
    <ng-container ndDialog [closeOnOverlayClick]="false">
      <button ndButton ndDialogTrigger variant="outline">Write a note</button>
      <ng-template ndDialogPortal>
        <div ndDialogOverlay></div>
        <div ndDialogContent class="sm:max-w-[425px]">
          <div ndDialogHeader>
            <h2 ndDialogTitle>New note</h2>
            <p ndDialogDescription>
              The note is kept until you save or discard it.
            </p>
          </div>
          <div class="grid gap-2">
            <label ndLabel for="dialog-unsaved-changes-note">Note</label>
            <textarea ndTextarea id="dialog-unsaved-changes-note"></textarea>
          </div>
          <div ndDialogFooter>
            <button ndButton ndDialogClose variant="outline">Discard</button>
            <button ndButton ndDialogClose>Save note</button>
          </div>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class DialogUnsavedChangesExample {}
