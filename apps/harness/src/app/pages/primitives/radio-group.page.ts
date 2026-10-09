import { Component, signal } from '@angular/core';
import { NdLabel } from '@ndop/primitives/label';
import {
  NdRadioGroup,
  NdRadioGroupIndicator,
  NdRadioGroupItem,
} from '@ndop/primitives/radio-group';

/**
 * Radio Group demo (`/primitives/radio-group`): plans with one disabled
 * item, and a horizontal group in a right-to-left section.
 */
@Component({
  selector: 'harness-radio-group-demo',
  imports: [NdRadioGroup, NdRadioGroupItem, NdRadioGroupIndicator, NdLabel],
  template: `
    <main class="grid max-w-sm gap-6 p-8">
      <h1 class="text-2xl font-semibold">Radio Group</h1>
      <div ndRadioGroup aria-label="Plan" [(value)]="plan" class="grid gap-2">
        @for (option of plans; track option.value) {
          <div class="flex items-center gap-2">
            <button
              ndRadioGroupItem
              [value]="option.value"
              [id]="option.value"
              [disabled]="option.disabled"
              [class]="radio"
            >
              <span
                ndRadioGroupIndicator
                class="block size-2 rounded-full bg-foreground"
              ></span>
            </button>
            <label
              ndLabel
              [for]="option.value"
              class="data-disabled:opacity-50"
              >{{ option.label }}</label
            >
          </div>
        }
      </div>
      <p>Plan: {{ plan() }}</p>
      <section dir="rtl" aria-label="Right to left">
        <div
          ndRadioGroup
          aria-label="Size"
          orientation="horizontal"
          defaultValue="s"
          class="flex gap-4"
        >
          @for (size of sizes; track size) {
            <button
              ndRadioGroupItem
              [value]="size"
              [attr.aria-label]="size"
              [class]="radio"
            >
              <span
                ndRadioGroupIndicator
                class="block size-2 rounded-full bg-foreground"
              ></span>
            </button>
          }
        </div>
      </section>
    </main>
  `,
})
export default class RadioGroupDemo {
  protected readonly radio =
    'flex size-5 items-center justify-center rounded-full border border-foreground';
  protected readonly plans = [
    { value: 'free', label: 'Free', disabled: false },
    { value: 'pro', label: 'Pro', disabled: false },
    { value: 'team', label: 'Team', disabled: true },
    { value: 'enterprise', label: 'Enterprise', disabled: false },
  ];
  protected readonly sizes = ['s', 'm', 'l'];
  protected readonly plan = signal<string | null>('pro');
}
