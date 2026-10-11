import { Component, signal } from '@angular/core';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/ui/resizable/resizable';

/**
 * Two panes stacked, resized up and down; the sizes are bound, to save
 * and restore the layout.
 */
@Component({
  selector: 'example-resizable-vertical',
  imports: [ResizableHandle, ResizablePanel, ResizablePanelGroup],
  template: `
    <div
      ndResizablePanelGroup
      orientation="vertical"
      [(sizes)]="sizes"
      class="min-h-[200px] max-w-md rounded-lg border md:min-w-[450px]"
    >
      <div ndResizablePanel [defaultSize]="25" [minSize]="10">
        <div class="flex h-full items-center justify-center p-6">
          <span class="font-semibold">Header</span>
        </div>
      </div>
      <div ndResizableHandle aria-label="Resize header"></div>
      <div ndResizablePanel [defaultSize]="75">
        <div class="flex h-full items-center justify-center p-6">
          <span class="font-semibold">Content</span>
        </div>
      </div>
    </div>
  `,
})
export class ResizableVerticalExample {
  protected readonly sizes = signal<readonly number[]>([]);
}
