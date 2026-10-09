import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';

/** Text formatting where any number of options combine, in the outline style. */
@Component({
  selector: 'example-toggle-group-demo',
  imports: [NdIcon, ToggleGroup, ToggleGroupItem],
  template: `
    <div
      ndToggleGroup
      type="multiple"
      variant="outline"
      aria-label="Text formatting"
      [(value)]="formatting"
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
export class ToggleGroupDemoExample {
  protected readonly formatting = signal<readonly string[]>(['bold']);
}
