import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { Spinner } from '@/ui/spinner/spinner';

/**
 * A button that shows a spinner, and is disabled, while its action runs.
 */
@Component({
  selector: 'example-spinner-button',
  imports: [Button, NdIcon, Spinner],
  template: `
    <button ndButton [disabled]="saving()" (click)="save()">
      @if (saving()) {
        <span ndSpinner label="Saving"><svg ndIcon="loader-circle"></svg></span>
        Saving…
      } @else {
        Save changes
      }
    </button>
  `,
})
export class SpinnerButtonExample {
  protected readonly saving = signal(false);

  /** Pretends to save for two seconds. */
  protected save(): void {
    this.saving.set(true);
    setTimeout(() => this.saving.set(false), 2000);
  }
}
