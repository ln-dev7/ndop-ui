import { Component, signal } from '@angular/core';
import {
  NdResizableHandle,
  NdResizablePanel,
  NdResizablePanelGroup,
} from '@ndop/primitives/resizable';

/**
 * Resizable demo (`/primitives/resizable`): a sidebar and content split by
 * a handle, reporting the sizes.
 */
@Component({
  selector: 'harness-resizable-demo',
  imports: [NdResizablePanelGroup, NdResizablePanel, NdResizableHandle],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Resizable</h1>
      <div
        ndResizablePanelGroup
        data-testid="group"
        class="flex h-40 w-[600px] rounded-md border"
        [(sizes)]="sizes"
      >
        <div ndResizablePanel [defaultSize]="30" [minSize]="20" class="p-2">
          Sidebar
        </div>
        <div
          ndResizableHandle
          aria-label="Resize sidebar"
          class="w-2 bg-gray-300"
        ></div>
        <div ndResizablePanel class="p-2">Content</div>
      </div>
      <p data-testid="sizes">{{ sizes().join(' / ') }}</p>
      <div
        ndResizablePanelGroup
        orientation="vertical"
        class="flex h-60 w-60 flex-col rounded-md border"
        [(sizes)]="stacked"
      >
        <div ndResizablePanel class="p-2">Top</div>
        <div
          ndResizableHandle
          aria-label="Resize top"
          class="h-2 bg-gray-300"
        ></div>
        <div ndResizablePanel class="p-2">Bottom</div>
      </div>
      <p data-testid="stacked">{{ stacked().join(' / ') }}</p>
    </main>
  `,
})
export default class ResizableDemo {
  protected readonly sizes = signal<readonly number[]>([]);
  protected readonly stacked = signal<readonly number[]>([]);
}
