import { Component } from '@angular/core';
import { Label } from '@/ui/label/label';
import { Textarea } from '@/ui/textarea/textarea';

/** A textarea with a label and a description. */
@Component({
  selector: 'example-textarea-demo',
  imports: [Label, Textarea],
  template: `
    <div class="grid w-full max-w-sm gap-3">
      <label ndLabel for="textarea-demo-message">Your message</label>
      <textarea
        ndTextarea
        id="textarea-demo-message"
        placeholder="Type your message here."
        aria-describedby="textarea-demo-hint"
      ></textarea>
      <p id="textarea-demo-hint" class="text-sm text-muted-foreground">
        Your message goes to the support team.
      </p>
    </div>
  `,
})
export class TextareaDemoExample {}
