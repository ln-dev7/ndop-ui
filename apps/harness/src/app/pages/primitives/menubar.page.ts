import { Component, signal } from '@angular/core';
import {
  NdMenuContent,
  NdMenuItem,
  NdMenuSeparator,
} from '@ndop/primitives/menu';
import { NdMenubar, NdMenubarTrigger } from '@ndop/primitives/menubar';

/**
 * Menubar demo (`/primitives/menubar`): File, Edit and View menus,
 * reporting the last command.
 */
@Component({
  selector: 'harness-menubar-demo',
  imports: [
    NdMenubar,
    NdMenubarTrigger,
    NdMenuContent,
    NdMenuItem,
    NdMenuSeparator,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Menubar</h1>
      <div
        ndMenubar
        aria-label="Editor"
        class="flex gap-1 rounded-md border p-1"
      >
        <div [ndMenubarTrigger]="file" [class]="trigger">File</div>
        <div [ndMenubarTrigger]="edit" [class]="trigger">Edit</div>
        <div [ndMenubarTrigger]="view" [class]="trigger">View</div>
      </div>
      <ng-template #file>
        <div ndMenuContent [class]="menu">
          <div ndMenuItem [class]="item" (triggered)="last.set('New tab')">
            New tab
          </div>
          <div ndMenuItem [class]="item" (triggered)="last.set('New window')">
            New window
          </div>
          <div ndMenuSeparator class="my-1 h-px bg-gray-200"></div>
          <div ndMenuItem [class]="item" (triggered)="last.set('Print')">
            Print
          </div>
        </div>
      </ng-template>
      <ng-template #edit>
        <div ndMenuContent [class]="menu">
          <div ndMenuItem [class]="item" (triggered)="last.set('Undo')">
            Undo
          </div>
          <div ndMenuItem [class]="item" (triggered)="last.set('Redo')">
            Redo
          </div>
        </div>
      </ng-template>
      <ng-template #view>
        <div ndMenuContent [class]="menu">
          <div ndMenuItem [class]="item" (triggered)="last.set('Zoom in')">
            Zoom in
          </div>
        </div>
      </ng-template>
      <p data-testid="last">{{ last() }}</p>
      <button class="rounded-md border px-3 py-1">Next</button>
    </main>
  `,
})
export default class MenubarDemo {
  protected readonly last = signal('');
  protected readonly trigger =
    'rounded-sm px-2 py-1 focus:bg-gray-100 data-[state=open]:bg-gray-100';
  protected readonly menu = 'grid min-w-40 rounded-md border bg-white p-1';
  protected readonly item = 'rounded-sm px-2 py-1 focus:bg-gray-100';
}
