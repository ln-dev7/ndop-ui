import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEMOS } from '../demos/demos';

/**
 * Harness index (`/`): links every primitive demo.
 */
@Component({
  selector: 'harness-home',
  imports: [RouterLink],
  template: `
    <main class="mx-auto max-w-3xl p-8">
      <h1 class="text-2xl font-semibold">Ndop harness</h1>
      <p class="text-muted-foreground mt-2">
        Every primitive, rendered with SSR, hydration and zoneless change
        detection.
      </p>
      <p class="mt-6">
        <a class="underline" routerLink="/tokens">Tokens</a>
      </p>
      <ul class="mt-6 space-y-2">
        @for (demo of demos; track demo.path) {
          <li>
            <a class="underline" [routerLink]="'/primitives/' + demo.path">{{
              demo.title
            }}</a>
          </li>
        } @empty {
          <li class="text-muted-foreground">No primitives yet.</li>
        }
      </ul>
    </main>
  `,
})
export default class HomePage {
  protected readonly demos = DEMOS;
}
