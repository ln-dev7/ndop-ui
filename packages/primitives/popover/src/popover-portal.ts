import {
  Directive,
  inject,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { ND_POPOVER } from './popover';

/**
 * Marks the `ng-template` whose content the {@link NdPopover} renders while
 * open.
 *
 * @example
 * ```html
 * <ng-template ndPopoverPortal>
 *   <div ndPopoverContent aria-label="Filters">…</div>
 * </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[ndPopoverPortal]' })
export class NdPopoverPortal {
  constructor() {
    inject(ND_POPOVER).registerPortal(
      inject(TemplateRef),
      inject(ViewContainerRef),
    );
  }
}
