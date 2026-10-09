import { Component } from '@angular/core';
import {
  NdToggleGroup,
  NdToggleGroupItem,
} from '@ndop/primitives/toggle-group';

/**
 * Toggle Group demo (`/primitives/toggle-group`): single alignment,
 * multiple formatting with a disabled item, and a vertical group.
 */
@Component({
  selector: 'harness-toggle-group-demo',
  imports: [NdToggleGroup, NdToggleGroupItem],
  template: `
    <main class="grid justify-items-start gap-6 p-8">
      <h1 class="text-2xl font-semibold">Toggle Group</h1>
      <div
        ndToggleGroup
        aria-label="Alignment"
        [defaultValue]="['center']"
        class="flex gap-1"
      >
        <button ndToggleGroupItem value="start" [class]="item">Start</button>
        <button ndToggleGroupItem value="center" [class]="item">Center</button>
        <button ndToggleGroupItem value="end" [class]="item">End</button>
      </div>
      <div
        ndToggleGroup
        type="multiple"
        aria-label="Formatting"
        class="flex gap-1"
      >
        <button ndToggleGroupItem value="bold" [class]="item">Bold</button>
        <button ndToggleGroupItem value="italic" disabled [class]="item">
          Italic
        </button>
        <button ndToggleGroupItem value="underline" [class]="item">
          Underline
        </button>
      </div>
      <div
        ndToggleGroup
        aria-label="View"
        orientation="vertical"
        class="grid gap-1"
      >
        <button ndToggleGroupItem value="list" [class]="item">List</button>
        <button ndToggleGroupItem value="grid" [class]="item">Grid</button>
      </div>
    </main>
  `,
})
export default class ToggleGroupDemo {
  protected readonly item =
    'rounded-md border px-3 py-1 data-[state=on]:bg-foreground data-[state=on]:text-background';
}
