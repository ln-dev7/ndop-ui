import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Toggle } from '@/ui/toggle/toggle';

/** The outline variant. */
@Component({
  selector: 'example-toggle-outline',
  imports: [NdIcon, Toggle],
  template: `
    <button ndToggle variant="outline" aria-label="Toggle italic">
      <svg ndIcon="italic"></svg>
    </button>
  `,
})
export class ToggleOutlineExample {}
