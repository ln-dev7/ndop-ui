import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import {
  Sheet,
  SheetClose,
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from '@/ui/sheet/sheet';

/**
 * A profile form in a sheet from the end side, bound to Signal Forms and
 * saved from its footer, which closes the sheet.
 */
@Component({
  selector: 'example-sheet-demo',
  imports: [
    Button,
    FormField,
    Input,
    Label,
    NdIcon,
    Sheet,
    SheetClose,
    SheetCloseButton,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetOverlay,
    SheetPortal,
    SheetTitle,
    SheetTrigger,
  ],
  template: `
    <ng-container ndSheet [(open)]="open">
      <button ndButton variant="outline" ndSheetTrigger>Edit profile</button>
      <ng-template ndSheetPortal>
        <div ndSheetOverlay></div>
        <div ndSheetContent>
          <div ndSheetHeader>
            <h2 ndSheetTitle>Edit profile</h2>
            <p ndSheetDescription>
              Make changes to your profile here. Save when you're done.
            </p>
          </div>
          <form
            class="grid flex-1 auto-rows-min gap-6 px-4"
            (submit)="save($event)"
            id="sheet-demo-form"
          >
            <div class="grid gap-3">
              <label ndLabel for="sheet-demo-name">Name</label>
              <input ndInput id="sheet-demo-name" [formField]="profile.name" />
            </div>
            <div class="grid gap-3">
              <label ndLabel for="sheet-demo-username">Username</label>
              <input
                ndInput
                id="sheet-demo-username"
                [formField]="profile.username"
              />
            </div>
          </form>
          <div ndSheetFooter>
            <button ndButton type="submit" form="sheet-demo-form">
              Save changes
            </button>
            <button ndButton variant="outline" ndSheetClose>Cancel</button>
          </div>
          <button ndSheetCloseButton>
            <svg ndIcon="x"></svg>
            <span class="sr-only">Close</span>
          </button>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class SheetDemoExample {
  protected readonly open = signal(false);

  protected readonly model = signal({ name: 'Ada Lovelace', username: 'ada' });

  protected readonly profile = form(this.model, (path) => {
    required(path.name);
    required(path.username);
  });

  /**
   * Closes the sheet once the profile is valid, instead of reloading.
   *
   * @param event - The form's submit event.
   */
  protected save(event: Event): void {
    event.preventDefault();
    this.profile().markAsTouched();
    if (this.profile().valid()) {
      this.open.set(false);
    }
  }
}
