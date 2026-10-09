import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';

/** The small and large sizes. */
@Component({
  selector: 'example-toggle-group-sizes',
  imports: [NdIcon, ToggleGroup, ToggleGroupItem],
  template: `
    <div class="flex flex-col items-start gap-4">
      @for (size of sizes; track size) {
        <div
          ndToggleGroup
          type="multiple"
          variant="outline"
          [size]="size"
          [attr.aria-label]="'Text formatting, ' + size"
        >
          <button ndToggleGroupItem value="bold" aria-label="Toggle bold">
            <svg ndIcon="bold"></svg>
          </button>
          <button ndToggleGroupItem value="italic" aria-label="Toggle italic">
            <svg ndIcon="italic"></svg>
          </button>
          <button
            ndToggleGroupItem
            value="underline"
            aria-label="Toggle underline"
          >
            <svg ndIcon="underline"></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToggleGroupSizesExample {
  protected readonly sizes = ['sm', 'lg'] as const;
}
