import { Component } from '@angular/core';
import {
  NdHoverCard,
  NdHoverCardContent,
  NdHoverCardPortal,
  NdHoverCardTrigger,
} from '@ndop/primitives/hover-card';

/** Hover Card demo (`/primitives/hover-card`): a profile behind a username. */
@Component({
  selector: 'harness-hover-card-demo',
  imports: [
    NdHoverCard,
    NdHoverCardTrigger,
    NdHoverCardPortal,
    NdHoverCardContent,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Hover Card</h1>
      <p>
        Built by
        <ng-container ndHoverCard [openDelay]="200" [closeDelay]="100">
          <a ndHoverCardTrigger href="#ada" class="underline">&#64;ada</a>
          <ng-template ndHoverCardPortal>
            <div
              ndHoverCardContent
              data-testid="card"
              class="bg-background w-64 rounded-md border p-4"
            >
              Ada Lovelace wrote the first program.
            </div>
          </ng-template>
        </ng-container>
      </p>
      <button class="rounded-md border px-3 py-1">Next</button>
    </main>
  `,
})
export default class HoverCardDemo {}
