import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Toggle } from '@/ui/toggle/toggle';

/** A disabled toggle. */
@Component({
  selector: 'example-toggle-disabled',
  imports: [NdIcon, Toggle],
  template: `
    <button ndToggle disabled aria-label="Toggle underline">
      <svg ndIcon="underline"></svg>
    </button>
  `,
})
export class ToggleDisabledExample {}
