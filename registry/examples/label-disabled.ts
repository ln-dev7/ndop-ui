import { Component } from '@angular/core';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';

/** A label that dims with its disabled input. */
@Component({
  selector: 'example-label-disabled',
  imports: [Label, Input],
  template: `
    <div class="grid w-full max-w-sm gap-3">
      <label ndLabel for="label-disabled-plan">Plan</label>
      <input ndInput id="label-disabled-plan" value="Team" disabled />
    </div>
  `,
})
export class LabelDisabledExample {}
