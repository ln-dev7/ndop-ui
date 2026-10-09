import { Component } from '@angular/core';
import { Progress, ProgressIndicator } from '@/ui/progress/progress';

/** A progress bar named by a visible label. */
@Component({
  selector: 'example-progress-demo',
  imports: [Progress, ProgressIndicator],
  template: `
    <div class="grid w-full max-w-sm gap-2">
      <span id="progress-demo-label" class="text-sm font-medium"
        >Setting up your workspace</span
      >
      <div ndProgress [value]="66" aria-labelledby="progress-demo-label">
        <div ndProgressIndicator></div>
      </div>
    </div>
  `,
})
export class ProgressDemoExample {}
