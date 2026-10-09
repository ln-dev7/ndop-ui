import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Spinner } from '@/ui/spinner/spinner';

/** Spinners in three sizes. */
@Component({
  selector: 'example-spinner-demo',
  imports: [NdIcon, Spinner],
  template: `
    <div class="flex items-center gap-6">
      <span ndSpinner><svg ndIcon="loader-circle"></svg></span>
      <span ndSpinner class="size-6"><svg ndIcon="loader-circle"></svg></span>
      <span ndSpinner label="Loading results" class="size-8">
        <svg ndIcon="loader-circle"></svg>
      </span>
    </div>
  `,
})
export class SpinnerDemoExample {}
