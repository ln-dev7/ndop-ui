import { Component, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
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
  NdDialog,
  NdDialogClose,
  NdDialogPortal,
  NdDialogTrigger,
} from '@/ui/dialog/dialog';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';

interface Profile {
  name: string;
  username: string;
}

/**
 * An edit-profile dialog with a Signal Forms form. Saving validates the
 * form, closes the dialog when it passes, and keeps it open otherwise.
 */
@Component({
  selector: 'example-dialog-demo',
  imports: [
    NdDialog,
    NdDialogTrigger,
    NdDialogPortal,
    NdDialogClose,
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
    FormField,
  ],
  template: `
    <ng-container ndDialog [(open)]="open">
      <button ndButton ndDialogTrigger variant="outline">Edit profile</button>
      <ng-template ndDialogPortal>
        <div ndDialogOverlay></div>
        <div ndDialogContent class="sm:max-w-[425px]">
          <form class="grid gap-4" (submit)="save($event)">
            <div ndDialogHeader>
              <h2 ndDialogTitle>Edit profile</h2>
              <p ndDialogDescription>
                Make changes to your profile here. Click save when you're done.
              </p>
            </div>
            <div class="grid gap-4">
              <div class="grid gap-3">
                <label ndLabel for="dialog-demo-name">Name</label>
                <input
                  ndInput
                  id="dialog-demo-name"
                  [formField]="profile.name"
                />
              </div>
              <div class="grid gap-3">
                <label ndLabel for="dialog-demo-username">Username</label>
                <input
                  ndInput
                  id="dialog-demo-username"
                  [formField]="profile.username"
                />
              </div>
            </div>
            <div ndDialogFooter>
              <button ndButton ndDialogClose type="button" variant="outline">
                Cancel
              </button>
              <button ndButton type="submit">Save changes</button>
            </div>
          </form>
          <button ndDialogCloseButton>
            <svg ndIcon="x"></svg>
            <span class="sr-only">Close</span>
          </button>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class DialogDemoExample {
  protected readonly open = signal(false);

  private readonly model = signal<Profile>({
    name: 'Ada Lovelace',
    username: '@ada',
  });

  protected readonly profile = form(this.model, (path) => {
    required(path.name);
    required(path.username);
  });

  /**
   * Validates and saves the profile, then closes the dialog.
   *
   * @param event - The form's submit event.
   */
  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.profile, async () => {
      this.open.set(false);
      return undefined;
    });
  }
}
