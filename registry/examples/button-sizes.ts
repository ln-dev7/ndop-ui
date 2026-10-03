import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';

/** Button sizes, including an icon-only button with an accessible name. */
@Component({
  selector: 'example-button-sizes',
  imports: [Button, NdIcon],
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <button ndButton variant="outline" size="xs">Extra small</button>
      <button ndButton variant="outline" size="sm">Small</button>
      <button ndButton variant="outline">Default</button>
      <button ndButton variant="outline" size="lg">Large</button>
      <button ndButton variant="outline" size="icon" aria-label="Dismiss">
        <svg ndIcon="x"></svg>
      </button>
    </div>
  `,
})
export class ButtonSizesExample {}
