import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Toggle } from '@/ui/toggle/toggle';

/** The small, default and large sizes. */
@Component({
  selector: 'example-toggle-sizes',
  imports: [NdIcon, Toggle],
  template: `
    <div class="flex items-center gap-2">
      <button ndToggle size="sm" aria-label="Toggle underline, small">
        <svg ndIcon="underline"></svg>
      </button>
      <button ndToggle aria-label="Toggle underline">
        <svg ndIcon="underline"></svg>
      </button>
      <button ndToggle size="lg" aria-label="Toggle underline, large">
        <svg ndIcon="underline"></svg>
      </button>
    </div>
  `,
})
export class ToggleSizesExample {}
