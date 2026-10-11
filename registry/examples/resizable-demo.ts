import { Component } from '@angular/core';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/ui/resizable/resizable';

/**
 * A sidebar beside two stacked panes. Each handle is a separator that the
 * arrow keys or a pointer move.
 */
@Component({
  selector: 'example-resizable-demo',
  imports: [ResizableHandle, ResizablePanel, ResizablePanelGroup],
  template: `
    <div
      ndResizablePanelGroup
      orientation="horizontal"
      class="max-w-md rounded-lg border md:min-w-[450px]"
    >
      <div ndResizablePanel [defaultSize]="50">
        <div class="flex h-[200px] items-center justify-center p-6">
          <span class="font-semibold">One</span>
        </div>
      </div>
      <div ndResizableHandle aria-label="Resize one"></div>
      <div ndResizablePanel [defaultSize]="50">
        <div ndResizablePanelGroup orientation="vertical">
          <div ndResizablePanel [defaultSize]="25">
            <div class="flex h-full items-center justify-center p-6">
              <span class="font-semibold">Two</span>
            </div>
          </div>
          <div ndResizableHandle aria-label="Resize two"></div>
          <div ndResizablePanel [defaultSize]="75">
            <div class="flex h-full items-center justify-center p-6">
              <span class="font-semibold">Three</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ResizableDemoExample {}
