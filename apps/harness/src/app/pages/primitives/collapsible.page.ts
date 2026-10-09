import { Component } from '@angular/core';
import {
  NdCollapsible,
  NdCollapsibleContent,
  NdCollapsibleTrigger,
} from '@ndop/primitives/collapsible';

/**
 * Collapsible demo (`/primitives/collapsible`): one closed, one starting
 * open, and a disabled one.
 */
@Component({
  selector: 'harness-collapsible-demo',
  imports: [NdCollapsible, NdCollapsibleTrigger, NdCollapsibleContent],
  template: `
    <main class="grid justify-items-start gap-6 p-8">
      <h1 class="text-2xl font-semibold">Collapsible</h1>
      <div ndCollapsible data-testid="closed">
        <button ndCollapsibleTrigger class="rounded-md border px-3 py-1">
          Repositories
        </button>
        <ul ndCollapsibleContent class="mt-2">
          <li><a href="#angular">angular/angular</a></li>
          <li><a href="#cdk">angular/components</a></li>
        </ul>
      </div>
      <div ndCollapsible defaultOpen data-testid="open">
        <button ndCollapsibleTrigger class="rounded-md border px-3 py-1">
          Details
        </button>
        <p ndCollapsibleContent class="mt-2">Shown from the start.</p>
      </div>
      <div ndCollapsible disabled>
        <button ndCollapsibleTrigger class="rounded-md border px-3 py-1">
          Locked
        </button>
        <p ndCollapsibleContent>Never shown.</p>
      </div>
    </main>
  `,
})
export default class CollapsibleDemoPage {}
