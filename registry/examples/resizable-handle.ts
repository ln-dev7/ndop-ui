import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  ResizableHandle,
  ResizableHandleGrip,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/ui/resizable/resizable';

/** A handle with a grip, showing it can be dragged. */
@Component({
  selector: 'example-resizable-handle',
  imports: [
    NdIcon,
    ResizableHandle,
    ResizableHandleGrip,
    ResizablePanel,
    ResizablePanelGroup,
  ],
  template: `
    <div
      ndResizablePanelGroup
      orientation="horizontal"
      class="min-h-[200px] max-w-md rounded-lg border md:min-w-[450px]"
    >
      <div ndResizablePanel [defaultSize]="25" [minSize]="15">
        <div class="flex h-full items-center justify-center p-6">
          <span class="font-semibold">Sidebar</span>
        </div>
      </div>
      <div ndResizableHandle aria-label="Resize sidebar">
        <div ndResizableHandleGrip><svg ndIcon="grip-vertical"></svg></div>
      </div>
      <div ndResizablePanel [defaultSize]="75">
        <div class="flex h-full items-center justify-center p-6">
          <span class="font-semibold">Content</span>
        </div>
      </div>
    </div>
  `,
})
export class ResizableHandleExample {}
