import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  NdCollapsible,
  NdCollapsibleContent,
  NdCollapsibleTrigger,
} from '@/ui/collapsible/collapsible';

/** A list of starred repositories that expands to show the rest. */
@Component({
  selector: 'example-collapsible-demo',
  imports: [
    Button,
    NdCollapsible,
    NdCollapsibleContent,
    NdCollapsibleTrigger,
    NdIcon,
  ],
  template: `
    <div ndCollapsible class="flex w-[350px] flex-col gap-2">
      <div class="flex items-center justify-between gap-4 px-4">
        <h2 class="text-sm font-semibold">
          &#64;peduarte starred 3 repositories
        </h2>
        <button
          ndCollapsibleTrigger
          ndButton
          variant="ghost"
          size="icon"
          class="size-8"
        >
          <svg ndIcon="chevrons-up-down"></svg>
          <span class="sr-only">Show all repositories</span>
        </button>
      </div>
      <div class="rounded-md border px-4 py-2 font-mono text-sm">
        &#64;radix-ui/primitives
      </div>
      <div ndCollapsibleContent class="flex flex-col gap-2">
        <div class="rounded-md border px-4 py-2 font-mono text-sm">
          &#64;radix-ui/colors
        </div>
        <div class="rounded-md border px-4 py-2 font-mono text-sm">
          &#64;stitches/react
        </div>
      </div>
    </div>
  `,
})
export class CollapsibleDemoExample {}
