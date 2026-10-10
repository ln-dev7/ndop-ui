import { Component, inject } from '@angular/core';
import { Button } from '@/ui/button/button';
import { Toaster } from '@/ui/toast/toast';

/**
 * A toast with a description and an Undo action. Toasts show in the
 * toast region your app's shell renders once (see the Toast page).
 */
@Component({
  selector: 'example-toast-demo',
  imports: [Button],
  template: `
    <button ndButton variant="outline" (click)="schedule()">
      Add to calendar
    </button>
  `,
})
export class ToastDemoExample {
  private readonly toaster = inject(Toaster);

  /** Shows the confirmation, with an Undo that says so. */
  protected schedule(): void {
    this.toaster.show({
      title: 'Event has been created',
      description: 'Sunday, December 3 at 9:00 AM',
      action: {
        label: 'Undo',
        onClick: () => this.toaster.show({ title: 'Event removed' }),
      },
    });
  }
}
