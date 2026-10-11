import { Component, signal } from '@angular/core';
import {
  NdSelect,
  NdSelectContent,
  NdSelectGroup,
  NdSelectItem,
  NdSelectItemIndicator,
  NdSelectItemText,
  NdSelectLabel,
  NdSelectSeparator,
  NdSelectTrigger,
  NdSelectValue,
} from '@ndop/primitives/select';

/** Select demo (`/primitives/select`): a fruit picker, reporting its value. */
@Component({
  selector: 'harness-select-demo',
  imports: [
    NdSelect,
    NdSelectTrigger,
    NdSelectValue,
    NdSelectContent,
    NdSelectGroup,
    NdSelectLabel,
    NdSelectItem,
    NdSelectItemText,
    NdSelectItemIndicator,
    NdSelectSeparator,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Select</h1>
      <label for="fruit">Fruit</label>
      <ng-container ndSelect [(value)]="fruit">
        <button
          ndSelectTrigger
          id="fruit"
          class="w-48 rounded-md border px-3 py-1 text-start"
        >
          <span ndSelectValue placeholder="Pick a fruit"></span>
        </button>
        <div ndSelectContent class="grid rounded-md border bg-white p-1">
          <div ndSelectGroup aria-labelledby="fruits">
            <div ndSelectLabel id="fruits" class="px-2 text-xs text-gray-500">
              Fruits
            </div>
            @for (option of fruits; track option.value) {
              <div
                ndSelectItem
                [value]="option.value"
                [disabled]="option.value === 'banana'"
                [class]="item"
              >
                <span ndSelectItemText>{{ option.label }}</span>
                <span ndSelectItemIndicator aria-hidden="true">✓</span>
              </div>
            }
          </div>
          <div ndSelectSeparator class="my-1 h-px bg-gray-200"></div>
          <div ndSelectItem value="tomato" [class]="item">
            <span ndSelectItemText>Tomato</span>
          </div>
        </div>
      </ng-container>
      <p data-testid="value">{{ fruit() }}</p>
      <button class="rounded-md border px-3 py-1">Next</button>
    </main>
  `,
})
export default class SelectDemo {
  protected readonly fruit = signal<string | null>(null);
  protected readonly fruits = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'blueberry', label: 'Blueberry' },
    { value: 'cherry', label: 'Cherry' },
  ];
  protected readonly item =
    'flex justify-between rounded-sm px-2 py-1 outline-none data-[highlighted]:bg-gray-100';
}
