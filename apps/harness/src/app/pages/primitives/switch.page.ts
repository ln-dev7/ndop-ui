import { Component } from '@angular/core';
import { NdLabel } from '@ndop/primitives/label';
import { NdSwitch, NdSwitchThumb } from '@ndop/primitives/switch';

/** Switch demo (`/primitives/switch`): an off switch and a disabled one. */
@Component({
  selector: 'harness-switch-demo',
  imports: [NdSwitch, NdSwitchThumb, NdLabel],
  template: `
    <main class="grid max-w-sm gap-4 p-8">
      <h1 class="text-2xl font-semibold">Switch</h1>
      <div class="flex items-center gap-2">
        <button ndSwitch id="airplane" [class]="track">
          <span ndSwitchThumb [class]="thumb"></span>
        </button>
        <label ndLabel for="airplane">Airplane mode</label>
      </div>
      <div class="flex items-center gap-2">
        <button ndSwitch id="sync" defaultChecked disabled [class]="track">
          <span ndSwitchThumb [class]="thumb"></span>
        </button>
        <label ndLabel for="sync" class="data-disabled:opacity-50">Sync</label>
      </div>
    </main>
  `,
})
export default class SwitchDemo {
  protected readonly track =
    'inline-flex h-5 w-9 items-center rounded-full border border-foreground data-[state=checked]:bg-foreground';
  protected readonly thumb =
    'block size-4 rounded-full bg-foreground data-[state=checked]:translate-x-4 data-[state=checked]:bg-background';
}
