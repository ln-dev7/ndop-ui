import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  NdCollapsible,
  NdCollapsibleContent,
  NdCollapsibleTrigger,
} from '@/ui/collapsible/collapsible';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';

/**
 * Advanced options a form shows on demand; the chevron turns with
 * `data-state`.
 */
@Component({
  selector: 'example-collapsible-settings',
  imports: [
    Button,
    Input,
    Label,
    NdCollapsible,
    NdCollapsibleContent,
    NdCollapsibleTrigger,
    NdIcon,
  ],
  template: `
    <form class="grid w-full max-w-sm gap-4">
      <div class="grid gap-2">
        <label ndLabel for="collapsible-settings-name">Project name</label>
        <input ndInput id="collapsible-settings-name" value="ndop-docs" />
      </div>
      <div ndCollapsible class="grid gap-4">
        <button
          ndCollapsibleTrigger
          ndButton
          variant="ghost"
          size="sm"
          class="group justify-self-start"
        >
          Advanced options
          <svg
            ndIcon="chevron-right"
            class="transition-transform group-data-[state=open]:rotate-90 rtl:rotate-180 rtl:group-data-[state=open]:rotate-90"
          ></svg>
        </button>
        <div ndCollapsibleContent class="grid gap-2">
          <label ndLabel for="collapsible-settings-dir">Output folder</label>
          <input ndInput id="collapsible-settings-dir" value="dist" />
        </div>
      </div>
    </form>
  `,
})
export class CollapsibleSettingsExample {}
