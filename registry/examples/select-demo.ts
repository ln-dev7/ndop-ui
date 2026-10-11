import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Label } from '@/ui/label/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from '@/ui/select/select';

/**
 * A fruit picker with a placeholder. Typing a letter on the closed select
 * picks the next fruit starting with it.
 */
@Component({
  selector: 'example-select-demo',
  imports: [
    Label,
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
    <div class="grid gap-3">
      <label ndLabel for="select-demo-fruit">Fruit</label>
      <ng-container ndSelect [(value)]="fruit">
        <button ndSelectTrigger id="select-demo-fruit" class="w-[180px]">
          <span ndSelectValue placeholder="Select a fruit"></span>
          <svg ndIcon="chevron-down" class="size-4 opacity-50"></svg>
        </button>
        <div ndSelectContent>
          @for (option of fruits; track option.value) {
            <div ndSelectItem [value]="option.value">
              <span ndSelectItemIndicator><svg ndIcon="check"></svg></span>
              <span ndSelectItemText>{{ option.label }}</span>
            </div>
          }
        </div>
      </ng-container>
    </div>
  `,
})
export class SelectDemoExample {
  protected readonly fruit = signal<string | null>(null);
  protected readonly fruits = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'blueberry', label: 'Blueberry' },
    { value: 'grapes', label: 'Grapes' },
    { value: 'pineapple', label: 'Pineapple' },
  ];
}
