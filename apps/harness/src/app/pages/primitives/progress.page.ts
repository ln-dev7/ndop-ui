import { Component } from '@angular/core';
import { NdProgress, NdProgressIndicator } from '@ndop/primitives/progress';

/**
 * Progress demo (`/primitives/progress`): a determinate bar, an
 * indeterminate one and a finished one.
 */
@Component({
  selector: 'harness-progress-demo',
  imports: [NdProgress, NdProgressIndicator],
  template: `
    <main class="grid gap-6 p-8">
      <h1 class="text-2xl font-semibold">Progress</h1>
      @for (bar of bars; track bar.label) {
        <div
          ndProgress
          #progress="ndProgress"
          [value]="bar.value"
          [attr.aria-label]="bar.label"
          class="bg-muted h-2 w-64 overflow-hidden rounded-full"
        >
          <div
            ndProgressIndicator
            class="bg-primary h-full"
            [style.width.%]="progress.percent() ?? 0"
          ></div>
        </div>
      }
    </main>
  `,
})
export default class ProgressDemoPage {
  protected readonly bars = [
    { label: 'Upload', value: 40 },
    { label: 'Sync', value: null },
    { label: 'Install', value: 100 },
  ];
}
