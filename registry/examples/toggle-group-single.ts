import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';

/** Text alignment, where one option at most is pressed. */
@Component({
  selector: 'example-toggle-group-single',
  imports: [NdIcon, ToggleGroup, ToggleGroupItem],
  template: `
    <div ndToggleGroup aria-label="Text alignment" [(value)]="alignment">
      <button ndToggleGroupItem value="start" aria-label="Align start">
        <svg ndIcon="text-align-start"></svg>
      </button>
      <button ndToggleGroupItem value="center" aria-label="Align center">
        <svg ndIcon="text-align-center"></svg>
      </button>
      <button ndToggleGroupItem value="end" aria-label="Align end">
        <svg ndIcon="text-align-end"></svg>
      </button>
    </div>
  `,
})
export class ToggleGroupSingleExample {
  protected readonly alignment = signal<readonly string[]>(['start']);
}
