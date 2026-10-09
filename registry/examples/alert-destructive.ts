import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert/alert';

/** An error, with what to do about it. */
@Component({
  selector: 'example-alert-destructive',
  imports: [Alert, AlertDescription, AlertTitle, NdIcon],
  template: `
    <div ndAlert variant="destructive" role="none" class="max-w-md">
      <svg ndIcon="circle-alert"></svg>
      <div ndAlertTitle>Unable to process your payment</div>
      <div ndAlertDescription>
        <p>Please check your billing information and try again.</p>
        <ul class="list-inside list-disc text-sm">
          <li>Check your card details</li>
          <li>Make sure there are enough funds</li>
          <li>Verify the billing address</li>
        </ul>
      </div>
    </div>
  `,
})
export class AlertDestructiveExample {}
