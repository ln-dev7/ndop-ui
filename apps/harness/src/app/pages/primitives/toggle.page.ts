import { Component } from '@angular/core';
import { NdToggle } from '@ndop/primitives/toggle';

/** Toggle demo (`/primitives/toggle`): a toggle and a disabled one. */
@Component({
  selector: 'harness-toggle-demo',
  imports: [NdToggle],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Toggle</h1>
      <button ndToggle [class]="toggle">Bold</button>
      <button ndToggle defaultPressed disabled [class]="toggle">Italic</button>
    </main>
  `,
})
export default class ToggleDemo {
  protected readonly toggle =
    'rounded-md border px-3 py-1 data-[state=on]:bg-foreground data-[state=on]:text-background';
}
