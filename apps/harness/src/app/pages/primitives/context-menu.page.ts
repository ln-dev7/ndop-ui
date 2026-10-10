import { Component, signal } from '@angular/core';
import { NdContextMenuTrigger } from '@ndop/primitives/context-menu';
import { NdMenuContent, NdMenuItem } from '@ndop/primitives/menu';

/** Context Menu demo (`/primitives/context-menu`): a canvas with a menu. */
@Component({
  selector: 'harness-context-menu-demo',
  imports: [NdContextMenuTrigger, NdMenuContent, NdMenuItem],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Context Menu</h1>
      <div
        [ndContextMenuTrigger]="menu"
        tabindex="0"
        aria-label="Canvas"
        data-testid="canvas"
        class="grid h-40 w-80 place-items-center rounded-md border border-dashed"
      >
        Right click here
      </div>
      <ng-template #menu>
        <div
          ndMenuContent
          class="bg-background grid min-w-40 rounded-md border p-1"
        >
          <div
            ndMenuItem
            class="px-2 py-1 text-start focus:bg-muted"
            (triggered)="last.set('Back')"
          >
            Back
          </div>
          <div
            ndMenuItem
            class="px-2 py-1 text-start focus:bg-muted"
            (triggered)="last.set('Reload')"
          >
            Reload
          </div>
        </div>
      </ng-template>
      <p>Last: {{ last() }}</p>
    </main>
  `,
})
export default class ContextMenuDemo {
  protected readonly last = signal('none');
}
