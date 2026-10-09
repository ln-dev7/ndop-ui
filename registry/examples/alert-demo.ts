import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert/alert';

/** A success message with an icon, shown with the page. */
@Component({
  selector: 'example-alert-demo',
  imports: [Alert, AlertDescription, AlertTitle, NdIcon],
  template: `
    <div ndAlert role="none" class="max-w-md">
      <svg ndIcon="circle-check"></svg>
      <div ndAlertTitle>Your changes have been saved</div>
      <div ndAlertDescription>
        Everyone on the team sees the new settings right away.
      </div>
    </div>
  `,
})
export class AlertDemoExample {}
