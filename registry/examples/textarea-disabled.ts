import { Component } from '@angular/core';
import { Label } from '@/ui/label/label';
import { Textarea } from '@/ui/textarea/textarea';

/** A disabled textarea; its label dims with it. */
@Component({
  selector: 'example-textarea-disabled',
  imports: [Label, Textarea],
  template: `
    <div class="grid w-full max-w-sm gap-3">
      <label ndLabel for="textarea-disabled-notes">Notes</label>
      <textarea ndTextarea id="textarea-disabled-notes" disabled>
Archived projects can't be edited.</textarea
      >
    </div>
  `,
})
export class TextareaDisabledExample {}
