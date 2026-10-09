import { Component } from '@angular/core';
import { Progress, ProgressIndicator } from '@/ui/progress/progress';

/**
 * Files uploading, each with its own bar and percentage; the last one
 * waits to start, so its bar is indeterminate.
 */
@Component({
  selector: 'example-progress-upload',
  imports: [Progress, ProgressIndicator],
  template: `
    <ul class="grid w-full max-w-sm gap-4">
      @for (file of files; track file.name) {
        <li class="grid gap-2">
          <div class="flex justify-between text-sm">
            <span [id]="'progress-upload-' + $index" class="font-medium">{{
              file.name
            }}</span>
            <span class="text-muted-foreground">{{
              file.value === null ? 'Waiting' : file.value + '%'
            }}</span>
          </div>
          <div
            ndProgress
            [value]="file.value"
            [attr.aria-labelledby]="'progress-upload-' + $index"
          >
            <div ndProgressIndicator></div>
          </div>
        </li>
      }
    </ul>
  `,
})
export class ProgressUploadExample {
  protected readonly files = [
    { name: 'report.pdf', value: 100 },
    { name: 'photos.zip', value: 45 },
    { name: 'video.mp4', value: null },
  ];
}
