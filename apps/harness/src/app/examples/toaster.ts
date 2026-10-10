import { Component, inject } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Toaster,
  ToasterOutlet,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastList,
  ToastRegion,
  ToastTitle,
} from '@/ui/toast/toast';

/**
 * The toast region the example pages show their toasts in:
 * the markup the Toast page tells users to put in their app's shell.
 */
@Component({
  selector: 'harness-toaster',
  imports: [
    NdIcon,
    ToasterOutlet,
    Toast,
    ToastAction,
    ToastClose,
    ToastContent,
    ToastDescription,
    ToastList,
    ToastRegion,
    ToastTitle,
  ],
  template: `
    <ng-template ndToaster>
      <section ndToastRegion>
        <ol ndToastList>
          @for (toast of toaster.toasts(); track toast.id) {
            <li [ndToast]="toast">
              @if (icons[toast.type]; as icon) {
                <svg
                  [ndIcon]="icon"
                  [class.animate-spin]="toast.type === 'loading'"
                ></svg>
              }
              <div ndToastContent>
                <p ndToastTitle>{{ toast.title }}</p>
                @if (toast.description) {
                  <p ndToastDescription>{{ toast.description }}</p>
                }
              </div>
              @if (toast.action; as action) {
                <button ndToastAction>{{ action.label }}</button>
              }
              <button ndToastClose aria-label="Close">
                <svg ndIcon="x"></svg>
              </button>
            </li>
          }
        </ol>
      </section>
    </ng-template>
  `,
})
export class ExampleToaster {
  protected readonly toaster = inject(Toaster);

  protected readonly icons: Record<string, string | undefined> = {
    success: 'circle-check',
    info: 'info',
    warning: 'triangle-alert',
    error: 'octagon-x',
    loading: 'loader-circle',
  };
}
