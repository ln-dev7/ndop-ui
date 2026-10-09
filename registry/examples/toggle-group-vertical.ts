import { Component } from '@angular/core';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';

/** A vertical group, moved through with the up and down arrows. */
@Component({
  selector: 'example-toggle-group-vertical',
  imports: [ToggleGroup, ToggleGroupItem],
  template: `
    <div
      ndToggleGroup
      orientation="vertical"
      variant="outline"
      [spacing]="1"
      aria-label="Layout"
      [defaultValue]="['list']"
    >
      <button ndToggleGroupItem value="list">List</button>
      <button ndToggleGroupItem value="board">Board</button>
      <button ndToggleGroupItem value="calendar">Calendar</button>
    </div>
  `,
})
export class ToggleGroupVerticalExample {}
