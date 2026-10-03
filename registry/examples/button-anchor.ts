import { Component, signal } from '@angular/core';
import { Button } from '@/ui/button/button';

/**
 * Button styles on links, where shadcn uses `asChild`: an enabled link, and
 * a disabled one that stays focusable and announces itself as disabled.
 */
@Component({
  selector: 'example-button-anchor',
  imports: [Button],
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <a ndButton href="#login">Login</a>
      <a ndButton variant="outline" href="#billing" [disabled]="locked()">
        Billing
      </a>
    </div>
  `,
})
export class ButtonAnchorExample {
  protected readonly locked = signal(true);
}
