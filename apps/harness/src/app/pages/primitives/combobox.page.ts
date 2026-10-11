import { Component, signal } from '@angular/core';
import {
  NdCombobox,
  NdComboboxChip,
  NdComboboxChipRemove,
  NdComboboxChips,
  NdComboboxClear,
  NdComboboxContent,
  NdComboboxEmpty,
  NdComboboxInput,
  NdComboboxItem,
  NdComboboxItemIndicator,
  NdComboboxList,
  NdComboboxTrigger,
} from '@ndop/primitives/combobox';

/**
 * Combobox demo (`/primitives/combobox`): one framework, then several as
 * chips, reporting both values.
 */
@Component({
  selector: 'harness-combobox-demo',
  imports: [
    NdCombobox,
    NdComboboxInput,
    NdComboboxTrigger,
    NdComboboxClear,
    NdComboboxContent,
    NdComboboxList,
    NdComboboxEmpty,
    NdComboboxItem,
    NdComboboxItemIndicator,
    NdComboboxChips,
    NdComboboxChip,
    NdComboboxChipRemove,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Combobox</h1>
      <label for="framework">Framework</label>
      <ng-container ndCombobox [(value)]="framework">
        <div class="flex gap-1">
          <input
            ndComboboxInput
            id="framework"
            class="rounded-md border px-2"
          />
          <button ndComboboxTrigger class="rounded-md border px-2">⌄</button>
          <button ndComboboxClear class="rounded-md border px-2">×</button>
        </div>
        <div ndComboboxContent class="rounded-md border bg-white p-1">
          <div ndComboboxList>
            <div ndComboboxEmpty class="px-2">No framework found.</div>
            @for (name of frameworks; track name) {
              <div
                ndComboboxItem
                [value]="name.toLowerCase()"
                [disabled]="name === 'Vue'"
                [class]="item"
              >
                {{ name }}
                <span ndComboboxItemIndicator aria-hidden="true">✓</span>
              </div>
            }
          </div>
        </div>
      </ng-container>
      <p data-testid="value">{{ framework() }}</p>

      <ng-container ndCombobox multiple [(values)]="stack">
        <div
          ndComboboxChips
          class="flex w-80 flex-wrap gap-1 rounded-md border p-1"
        >
          @for (value of stack(); track value) {
            <span
              ndComboboxChip
              [value]="value"
              class="rounded-sm bg-gray-100 px-1"
            >
              {{ value }}
              <button ndComboboxChipRemove>×</button>
            </span>
          }
          <input
            ndComboboxInput
            aria-label="Stack"
            class="flex-1 outline-none"
          />
        </div>
        <div ndComboboxContent class="rounded-md border bg-white p-1">
          <div ndComboboxList>
            <div ndComboboxEmpty class="px-2">No framework found.</div>
            @for (name of frameworks; track name) {
              <div ndComboboxItem [value]="name.toLowerCase()" [class]="item">
                {{ name }}
              </div>
            }
          </div>
        </div>
      </ng-container>
      <p data-testid="values">{{ stack().join(', ') }}</p>
      <button class="rounded-md border px-3 py-1">Next</button>
    </main>
  `,
})
export default class ComboboxDemo {
  protected readonly framework = signal<string | null>(null);
  protected readonly stack = signal<readonly string[]>([]);
  protected readonly frameworks = [
    'Angular',
    'Analog',
    'Vue',
    'Svelte',
    'Solid',
  ];
  protected readonly item =
    'flex justify-between rounded-sm px-2 py-1 data-[highlighted]:bg-gray-100';
}
