import { Component } from '@angular/core';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';

/** A label naming its input. */
@Component({
  selector: 'example-label-demo',
  imports: [Label, Input],
  template: `
    <div class="grid w-full max-w-sm gap-3">
      <label ndLabel for="label-demo-name">Full name</label>
      <input ndInput id="label-demo-name" placeholder="Ada Lovelace" />
    </div>
  `,
})
export class LabelDemoExample {}
