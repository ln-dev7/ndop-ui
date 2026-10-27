import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/ui/dropdown-menu/dropdown-menu';
import { NdMenuRadioGroup as DropdownMenuRadioGroup } from '@ndop/primitives/menu';
import { NdDropdownMenuTrigger as DropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';

/** Radio items that choose one panel position. */
@Component({
  selector: 'example-dropdown-menu-radio-group',
  imports: [
    Button,
    DropdownMenuContent,
    DropdownMenuItemIndicator,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    NdIcon,
  ],
  template: `
    <button ndButton variant="outline" [ndDropdownMenuTrigger]="positions">
      Panel: {{ position() }}
    </button>
    <ng-template #positions>
      <div ndDropdownMenuContent class="w-56">
        <div ndDropdownMenuLabel id="dropdown-menu-radio-group-label">
          Panel position
        </div>
        <div ndDropdownMenuSeparator></div>
        <div
          ndMenuRadioGroup
          aria-labelledby="dropdown-menu-radio-group-label"
          [(value)]="position"
        >
          @for (option of options; track option) {
            <div ndDropdownMenuRadioItem [value]="option" class="capitalize">
              <span ndDropdownMenuItemIndicator>
                <svg ndIcon="circle" class="size-2 fill-current"></svg>
              </span>
              {{ option }}
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class DropdownMenuRadioGroupExample {
  protected readonly options = ['top', 'bottom', 'end'];
  protected readonly position = signal<string | null>('bottom');
}
