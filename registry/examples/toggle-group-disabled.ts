import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';

/** A disabled group. */
@Component({
  selector: 'example-toggle-group-disabled',
  imports: [NdIcon, ToggleGroup, ToggleGroupItem],
  template: `
    <div
      ndToggleGroup
      type="multiple"
      disabled
      aria-label="Text formatting"
      [defaultValue]="['bold']"
    >
      <button ndToggleGroupItem value="bold" aria-label="Toggle bold">
        <svg ndIcon="bold"></svg>
      </button>
      <button ndToggleGroupItem value="italic" aria-label="Toggle italic">
        <svg ndIcon="italic"></svg>
      </button>
      <button ndToggleGroupItem value="underline" aria-label="Toggle underline">
        <svg ndIcon="underline"></svg>
      </button>
    </div>
  `,
})
export class ToggleGroupDisabledExample {}
