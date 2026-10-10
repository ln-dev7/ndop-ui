import { Component, inject } from '@angular/core';
import { Button } from '@/ui/button/button';
import { Toaster, type ToastType } from '@/ui/toast/toast';

/**
 * Success, info, warning, error and loading toasts. The loading one is
 * replaced, under the same id, when the work finishes.
 */
@Component({
  selector: 'example-toast-types',
  imports: [Button],
  template: `
    <div class="flex flex-wrap gap-2">
      @for (type of types; track type.type) {
        <button
          ndButton
          variant="outline"
          (click)="show(type.type, type.title)"
        >
          {{ type.label }}
        </button>
      }
      <button ndButton variant="outline" (click)="load()">Loading</button>
    </div>
  `,
})
export class ToastTypesExample {
  private readonly toaster = inject(Toaster);

  protected readonly types: readonly {
    type: ToastType;
    label: string;
    title: string;
  }[] = [
    { type: 'success', label: 'Success', title: 'Changes saved' },
    { type: 'info', label: 'Info', title: 'A new version is available' },
    { type: 'warning', label: 'Warning', title: 'Your storage is almost full' },
    { type: 'error', label: 'Error', title: "Couldn't upload the file" },
  ];

  /**
   * Shows a toast of a type.
   *
   * @param type - What it's about.
   * @param title - Its message.
   */
  protected show(type: ToastType, title: string): void {
    this.toaster.show({ type, title });
  }

  /** Shows a loading toast, then replaces it once the upload is done. */
  protected load(): void {
    const id = this.toaster.show({
      type: 'loading',
      title: 'Uploading report.pdf…',
      duration: Infinity,
    });
    setTimeout(
      () =>
        this.toaster.show({ id, type: 'success', title: 'Report uploaded' }),
      2000,
    );
  }
}
