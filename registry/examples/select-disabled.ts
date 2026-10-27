import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
} from '@/ui/select/select';
import {
  NdSelect as Select,
  NdSelectItemText as SelectItemText,
  NdSelectValue as SelectValue,
} from '@ndop/primitives/select';

/**
 * A disabled select, and one with a disabled option, which the arrow keys
 * skip.
 */
@Component({
  selector: 'example-select-disabled',
  imports: [
    NdIcon,
    Select,
    SelectContent,
    SelectItem,
    SelectItemIndicator,
    SelectItemText,
    SelectTrigger,
    SelectValue,
  ],
  template: `
    <div class="flex flex-wrap items-center gap-4">
      <ng-container ndSelect disabled>
        <button ndSelectTrigger aria-label="Plan" class="w-[180px]">
          <span ndSelectValue placeholder="Select a plan"></span>
          <svg ndIcon="chevron-down" class="size-4 opacity-50"></svg>
        </button>
        <div ndSelectContent>
          <div ndSelectItem value="free">
            <span ndSelectItemText>Free</span>
          </div>
        </div>
      </ng-container>
      <ng-container ndSelect>
        <button ndSelectTrigger aria-label="Seats" class="w-[180px]">
          <span ndSelectValue placeholder="Select seats"></span>
          <svg ndIcon="chevron-down" class="size-4 opacity-50"></svg>
        </button>
        <div ndSelectContent>
          <div ndSelectItem value="1">
            <span ndSelectItemIndicator><svg ndIcon="check"></svg></span>
            <span ndSelectItemText>1 seat</span>
          </div>
          <div ndSelectItem value="5">
            <span ndSelectItemIndicator><svg ndIcon="check"></svg></span>
            <span ndSelectItemText>5 seats</span>
          </div>
          <div ndSelectItem value="unlimited" disabled>
            <span ndSelectItemIndicator><svg ndIcon="check"></svg></span>
            <span ndSelectItemText>Unlimited (Enterprise)</span>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class SelectDisabledExample {}
