import { Component } from '@angular/core';
import { Label } from '@/ui/label/label';
import { Switch, SwitchThumb } from '@/ui/switch/switch';

/** A switch that turns a setting on or off right away. */
@Component({
  selector: 'example-switch-demo',
  imports: [Label, Switch, SwitchThumb],
  template: `
    <div class="flex items-center gap-2">
      <button ndSwitch id="switch-demo-airplane">
        <span ndSwitchThumb></span>
      </button>
      <label ndLabel for="switch-demo-airplane">Airplane Mode</label>
    </div>
  `,
})
export class SwitchDemoExample {}
