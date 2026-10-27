import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
} from '@/ui/dropdown-menu/dropdown-menu';
import { NdMenuGroup as DropdownMenuGroup } from '@ndop/primitives/menu';
import { NdDropdownMenuTrigger as DropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';

/**
 * Checkbox items that show or hide panels. Space toggles one and keeps the
 * menu open; Enter or a click toggles it and closes the menu.
 */
@Component({
  selector: 'example-dropdown-menu-checkboxes',
  imports: [
    Button,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItemIndicator,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    NdIcon,
  ],
  template: `
    <button ndButton variant="outline" [ndDropdownMenuTrigger]="panels">
      Appearance
    </button>
    <ng-template #panels>
      <div ndDropdownMenuContent class="w-56">
        <div ndMenuGroup aria-labelledby="dropdown-menu-checkboxes-label">
          <div ndDropdownMenuLabel id="dropdown-menu-checkboxes-label">
            Panels
          </div>
          <div ndDropdownMenuCheckboxItem [(checked)]="statusBar">
            <span ndDropdownMenuItemIndicator><svg ndIcon="check"></svg></span>
            Status bar
          </div>
          <div ndDropdownMenuCheckboxItem [(checked)]="activityBar" disabled>
            <span ndDropdownMenuItemIndicator><svg ndIcon="check"></svg></span>
            Activity bar
          </div>
          <div ndDropdownMenuCheckboxItem [(checked)]="panel">
            <span ndDropdownMenuItemIndicator><svg ndIcon="check"></svg></span>
            Panel
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DropdownMenuCheckboxesExample {
  protected readonly statusBar = signal(true);
  protected readonly activityBar = signal(false);
  protected readonly panel = signal(false);
}
