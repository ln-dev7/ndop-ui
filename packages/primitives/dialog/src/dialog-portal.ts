import {
  Directive,
  inject,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { ND_DIALOG } from './dialog';

/**
 * Marks the `ng-template` whose content the {@link NdDialog} renders while
 * open.
 *
 * @example
 * ```html
 * <ng-template ndDialogPortal>
 *   <div ndDialogContent>…</div>
 * </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[ndDialogPortal]' })
export class NdDialogPortal {
  constructor() {
    inject(ND_DIALOG).registerPortal(
      inject(TemplateRef),
      inject(ViewContainerRef),
    );
  }
}
