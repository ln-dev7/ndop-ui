import { Component, computed, input } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  NdDialog,
  NdDialogPortal,
  NdDialogTrigger,
} from '@/ui/dialog/dialog';
import type { PlaygroundHost, PlaygroundValues } from '../playground';

/** The values the Dialog playground binds. */
interface Values {
  closeOnEscape: boolean;
  closeOnOverlayClick: boolean;
}

/** Renders a Dialog with the playground's values. */
@Component({
  selector: 'docs-dialog-playground',
  imports: [
    Button,
    NdDialog,
    NdDialogTrigger,
    NdDialogPortal,
    DialogOverlay,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
  ],
  template: `
    <ng-container
      ndDialog
      [closeOnEscape]="v().closeOnEscape"
      [closeOnOverlayClick]="v().closeOnOverlayClick"
    >
      <button ndButton ndDialogTrigger variant="outline">Open dialog</button>
      <ng-template ndDialogPortal>
        <div ndDialogOverlay></div>
        <div ndDialogContent>
          <div ndDialogHeader>
            <h2 ndDialogTitle>Playground</h2>
            <p ndDialogDescription>Try Escape and a click outside.</p>
          </div>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class DialogPlayground {
  /** Every control's value. */
  readonly values = input.required<PlaygroundValues>();
  protected readonly v = computed(() => this.values() as unknown as Values);
}

/** Dialog's playground; its open state is the dialog's own. */
export const playground: PlaygroundHost = {
  part: 'NdDialog',
  exclude: ['open', 'defaultOpen'],
  snippet: `<ng-container ndDialog%attrs%>
  <button ndButton ndDialogTrigger variant="outline">Open dialog</button>
  <ng-template ndDialogPortal>
    <div ndDialogOverlay></div>
    <div ndDialogContent>
      <div ndDialogHeader>
        <h2 ndDialogTitle>Playground</h2>
        <p ndDialogDescription>Try Escape and a click outside.</p>
      </div>
    </div>
  </ng-template>
</ng-container>`,
  component: DialogPlayground,
};
