import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Toggle } from '@/ui/toggle/toggle';

/** An icon-only toggle, named for screen readers. */
@Component({
  selector: 'example-toggle-demo',
  imports: [NdIcon, Toggle],
  template: `
    <button ndToggle aria-label="Toggle bold">
      <svg ndIcon="bold"></svg>
    </button>
  `,
})
export class ToggleDemoExample {}
