import { Component } from '@angular/core';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';

/** Separate buttons instead of one joined bar. */
@Component({
  selector: 'example-toggle-group-spacing',
  imports: [ToggleGroup, ToggleGroupItem],
  template: `
    <div
      ndToggleGroup
      variant="outline"
      size="sm"
      [spacing]="2"
      aria-label="Release channel"
      [defaultValue]="['stable']"
    >
      <button ndToggleGroupItem value="stable">Stable</button>
      <button ndToggleGroupItem value="beta">Beta</button>
      <button ndToggleGroupItem value="nightly">Nightly</button>
    </div>
  `,
})
export class ToggleGroupSpacingExample {}
