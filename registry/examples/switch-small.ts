import { Component } from '@angular/core';
import { Label } from '@/ui/label/label';
import { Switch, SwitchThumb } from '@/ui/switch/switch';

/** The small size, for dense lists of settings. */
@Component({
  selector: 'example-switch-small',
  imports: [Label, Switch, SwitchThumb],
  template: `
    <div class="flex items-center gap-2">
      <button
        ndSwitch
        size="sm"
        id="switch-small-captions"
        [defaultChecked]="true"
      >
        <span ndSwitchThumb></span>
      </button>
      <label ndLabel for="switch-small-captions">Captions</label>
    </div>
  `,
})
export class SwitchSmallExample {}
