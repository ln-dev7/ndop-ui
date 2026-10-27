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

/** The default and small triggers. */
@Component({
  selector: 'example-select-sizes',
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
      @for (size of sizes; track size) {
        <ng-container ndSelect defaultValue="week">
          <button
            ndSelectTrigger
            [size]="size"
            [attr.aria-label]="'Range, ' + size + ' size'"
            class="w-[140px]"
          >
            <span ndSelectValue></span>
            <svg ndIcon="chevron-down" class="size-4 opacity-50"></svg>
          </button>
          <div ndSelectContent>
            @for (range of ranges; track range.value) {
              <div ndSelectItem [value]="range.value">
                <span ndSelectItemIndicator><svg ndIcon="check"></svg></span>
                <span ndSelectItemText>{{ range.label }}</span>
              </div>
            }
          </div>
        </ng-container>
      }
    </div>
  `,
})
export class SelectSizesExample {
  protected readonly sizes = ['default', 'sm'] as const;
  protected readonly ranges = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
  ];
}
