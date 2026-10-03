import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';

/** Every Button variant, side by side. */
@Component({
  selector: 'example-button-variants',
  imports: [Button],
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <button ndButton>Default</button>
      <button ndButton variant="secondary">Secondary</button>
      <button ndButton variant="outline">Outline</button>
      <button ndButton variant="ghost">Ghost</button>
      <button ndButton variant="destructive">Destructive</button>
      <button ndButton variant="link">Link</button>
    </div>
  `,
})
export class ButtonVariantsExample {}
