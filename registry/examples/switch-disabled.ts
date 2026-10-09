import { Component } from '@angular/core';
import { Label } from '@/ui/label/label';
import { Switch, SwitchThumb } from '@/ui/switch/switch';

/** Disabled switches, on and off. */
@Component({
  selector: 'example-switch-disabled',
  imports: [Label, Switch, SwitchThumb],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <button ndSwitch id="switch-disabled-off" disabled>
          <span ndSwitchThumb></span>
        </button>
        <label ndLabel for="switch-disabled-off">Beta features</label>
      </div>
      <div class="flex items-center gap-2">
        <button
          ndSwitch
          id="switch-disabled-on"
          disabled
          [defaultChecked]="true"
        >
          <span ndSwitchThumb></span>
        </button>
        <label ndLabel for="switch-disabled-on">Managed by your admin</label>
      </div>
    </div>
  `,
})
export class SwitchDisabledExample {}
