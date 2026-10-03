import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEMOS } from '../demos/demos';
import { EXAMPLE_NAMES } from '../examples/example-names';

/**
 * Harness index (`/`): links every primitive demo and registry example.
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
      <h2 class="mt-8 text-lg font-semibold">Examples</h2>
      <ul class="mt-4 space-y-2">
        @for (example of examples; track example) {
          <li>
            <a class="underline" [routerLink]="'/examples/' + example">{{
              example
            }}</a>
          </li>
        }
      </ul>
    </main>
  `,
})
export default class HomePage {
  protected readonly demos = DEMOS;
  protected readonly examples = EXAMPLE_NAMES;
}
