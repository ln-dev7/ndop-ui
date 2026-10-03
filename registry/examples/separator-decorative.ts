import { Component } from '@angular/core';
import { Separator } from '@/ui/separator/separator';

/**
 * A decorative separator, hidden from assistive technology because the
 * headings already divide the content.
 */
@Component({
  selector: 'example-separator-decorative',
  imports: [Separator],
  template: `
    <section class="max-w-sm text-sm">
      <h2 class="font-medium">Account</h2>
      <p class="text-muted-foreground">Name, email and password.</p>
      <div ndSeparator decorative class="my-4"></div>
      <h2 class="font-medium">Notifications</h2>
      <p class="text-muted-foreground">Email and push preferences.</p>
    </section>
  `,
})
export class SeparatorDecorativeExample {}
