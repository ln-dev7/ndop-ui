import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItemIndicator,
} from '@/ui/context-menu/context-menu';
import { NdContextMenuTrigger as ContextMenuTrigger } from '@ndop/primitives/context-menu';

/**
 * Checkbox items on a right click, for showing and hiding a map's
 * layers, which the area reflects.
 */
@Component({
  selector: 'example-context-menu-checkboxes',
  imports: [
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItemIndicator,
    ContextMenuTrigger,
    NdIcon,
  ],
  template: `
    <div
      [ndContextMenuTrigger]="layers"
      tabindex="0"
      aria-label="Map"
      class="grid h-[150px] w-[300px] place-content-center gap-1 rounded-md border text-center text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span>Map</span>
      <span class="text-muted-foreground">
        {{ traffic() ? 'Traffic' : '' }} {{ transit() ? 'Transit' : '' }}
      </span>
    </div>
    <ng-template #layers>
      <div ndContextMenuContent class="w-44">
        <div ndContextMenuCheckboxItem [(checked)]="traffic">
          <span ndContextMenuItemIndicator><svg ndIcon="check"></svg></span>
          Traffic
        </div>
        <div ndContextMenuCheckboxItem [(checked)]="transit">
          <span ndContextMenuItemIndicator><svg ndIcon="check"></svg></span>
          Transit
        </div>
      </div>
    </ng-template>
  `,
})
export class ContextMenuCheckboxesExample {
  protected readonly traffic = signal(true);
  protected readonly transit = signal(false);
}
