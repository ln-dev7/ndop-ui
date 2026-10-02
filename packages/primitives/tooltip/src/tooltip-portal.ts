import {
  Directive,
  inject,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import { ND_TOOLTIP } from './tooltip';

/**
 * Marks the `ng-template` whose content the {@link NdTooltip} renders while
 * open.
 *
 * @example
 * ```html
 * <ng-template ndTooltipPortal>
 *   <div ndTooltipContent>Delete permanently</div>
 * </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[ndTooltipPortal]' })
export class NdTooltipPortal {
  constructor() {
    inject(ND_TOOLTIP).registerPortal(
      inject(TemplateRef),
      inject(ViewContainerRef),
    );
  }
}
