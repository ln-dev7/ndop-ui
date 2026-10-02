import { Component, signal } from '@angular/core';
import { NdButton } from '@ndop/primitives/button';

/**
 * Button demo (`/primitives/button`): enabled and disabled buttons and
 * links, with counters showing activations.
 */
@Component({
  selector: 'harness-button-demo',
  imports: [NdButton],
  template: `
    <main class="grid max-w-sm gap-4 p-8">
      <h1 class="text-2xl font-semibold">Button</h1>
      <button
        ndButton
        class="bg-primary text-primary-foreground rounded-md px-4 py-2"
        (click)="count('button')"
      >
        Increment
      </button>
      <button
        ndButton
        disabled
        class="bg-primary text-primary-foreground rounded-md px-4 py-2 data-disabled:opacity-50"
        (click)="count('button')"
      >
        Disabled button
      </button>
      <a
        ndButton
        href="/primitives/button#activated"
        class="underline"
        (click)="count('link')"
        >Link</a
      >
      <a
        ndButton
        href="/primitives/button#activated"
        disabled
        class="underline data-disabled:opacity-50"
        (click)="count('link')"
        >Disabled link</a
      >
      <p data-testid="button-count">{{ counts().button }}</p>
      <p data-testid="link-count">{{ counts().link }}</p>
    </main>
  `,
})
export default class ButtonDemo {
  protected readonly counts = signal({ button: 0, link: 0 });

  protected count(kind: 'button' | 'link'): void {
    this.counts.update((counts) => ({ ...counts, [kind]: counts[kind] + 1 }));
  }
}
