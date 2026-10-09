import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Toggle } from '@/ui/toggle/toggle';

/**
 * A toggle with an icon and a label, whose icon fills while it's pressed.
 */
@Component({
  selector: 'example-toggle-with-text',
  imports: [NdIcon, Toggle],
  template: `
    <button
      ndToggle
      variant="outline"
      size="sm"
      class="data-[state=on]:bg-transparent data-[state=on]:*:[svg]:fill-current"
      [(pressed)]="saved"
    >
      <svg ndIcon="bookmark"></svg>
      Bookmark
    </button>
  `,
})
export class ToggleWithTextExample {
  protected readonly saved = signal(false);
}
