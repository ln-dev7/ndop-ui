import { Component } from '@angular/core';
import {
  NdTooltip,
  NdTooltipContent,
  NdTooltipPortal,
  NdTooltipTrigger,
} from '@ndop/primitives/tooltip';

/**
 * Tooltip demo (`/primitives/tooltip`): an icon button with a tooltip, and a
 * focusable text trigger reached from an input, for keyboard tests.
 */
@Component({
  selector: 'harness-tooltip-demo',
  imports: [NdTooltip, NdTooltipTrigger, NdTooltipPortal, NdTooltipContent],
  template: `
    <main class="grid justify-items-start gap-6 p-16">
      <h1 class="text-2xl font-semibold">Tooltip</h1>

      <ng-container ndTooltip>
        <button
          ndTooltipTrigger
          aria-label="Delete"
          class="rounded-md border px-3 py-2"
        >
          🗑
        </button>
        <ng-template ndTooltipPortal>
          <div
            ndTooltipContent
            side="top"
            class="bg-primary text-primary-foreground rounded-md px-2 py-1 text-sm"
          >
            Delete permanently
          </div>
        </ng-template>
      </ng-container>

      <input
        aria-label="Before"
        class="border-input rounded-md border px-3 py-2"
      />
      <ng-container ndTooltip>
        <span ndTooltipTrigger tabindex="0" class="underline">Shortcuts</span>
        <ng-template ndTooltipPortal>
          <div
            ndTooltipContent
            class="bg-primary text-primary-foreground rounded-md px-2 py-1 text-sm"
          >
            Press ? to see all shortcuts
          </div>
        </ng-template>
      </ng-container>
      <input
        aria-label="After"
        class="border-input rounded-md border px-3 py-2"
      />
    </main>
  `,
})
export default class TooltipDemo {}
