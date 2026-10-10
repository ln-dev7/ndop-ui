import { Component, signal } from '@angular/core';
import { NdDropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';
import {
  NdMenuContent,
  NdMenuGroup,
  NdMenuItem,
  NdMenuItemCheckbox,
  NdMenuItemIndicator,
  NdMenuItemRadio,
  NdMenuLabel,
  NdMenuRadioGroup,
  NdMenuSeparator,
  NdMenuSubTrigger,
} from '@ndop/primitives/menu';

/**
 * Dropdown Menu demo (`/primitives/dropdown-menu`): a menu with plain,
 * disabled, checkbox and radio items and a submenu, reporting each choice.
 */
@Component({
  selector: 'harness-dropdown-menu-demo',
  imports: [
    NdDropdownMenuTrigger,
    NdMenuContent,
    NdMenuGroup,
    NdMenuItem,
    NdMenuItemCheckbox,
    NdMenuItemIndicator,
    NdMenuItemRadio,
    NdMenuLabel,
    NdMenuRadioGroup,
    NdMenuSeparator,
    NdMenuSubTrigger,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Dropdown Menu</h1>
      <button
        [ndDropdownMenuTrigger]="menu"
        class="rounded-md border px-4 py-2"
      >
        Options
      </button>
      <ng-template #menu>
        <div
          ndMenuContent
          class="bg-background grid min-w-48 rounded-md border p-1"
        >
          <div ndMenuGroup aria-labelledby="actions-label">
            <div
              ndMenuLabel
              id="actions-label"
              class="px-2 py-1 text-sm font-medium"
            >
              Actions
            </div>
            <div ndMenuItem [class]="item" (triggered)="last.set('Edit')">
              Edit
            </div>
            <div ndMenuItem [class]="item" (triggered)="last.set('Duplicate')">
              Duplicate
            </div>
            <div ndMenuItem disabled [class]="item">Share</div>
          </div>
          <div ndMenuSeparator class="bg-muted my-1 h-px"></div>
          <div ndMenuItemCheckbox [(checked)]="statusBar" [class]="item">
            <span ndMenuItemIndicator>✓</span> Status bar
          </div>
          <div ndMenuRadioGroup aria-label="Sort by" [(value)]="sort">
            <div ndMenuItemRadio value="name" [class]="item">
              <span ndMenuItemIndicator>•</span> Name
            </div>
            <div ndMenuItemRadio value="date" [class]="item">
              <span ndMenuItemIndicator>•</span> Date
            </div>
          </div>
          <div [ndMenuSubTrigger]="more" [class]="item">More</div>
        </div>
      </ng-template>
      <ng-template #more>
        <div
          ndMenuContent
          class="bg-background grid min-w-40 rounded-md border p-1"
        >
          <div ndMenuItem [class]="item" (triggered)="last.set('Archive')">
            Archive
          </div>
          <div ndMenuItem [class]="item" (triggered)="last.set('Export')">
            Export
          </div>
        </div>
      </ng-template>
      <p>Last: {{ last() }}</p>
      <p>Status bar: {{ statusBar() ? 'on' : 'off' }}</p>
      <p>Sort: {{ sort() }}</p>
      <button class="rounded-md border px-3 py-1">After</button>
    </main>
  `,
})
export default class DropdownMenuDemo {
  protected readonly item =
    'rounded-sm px-2 py-1 text-start focus:bg-muted aria-disabled:opacity-50';
  protected readonly last = signal('none');
  protected readonly statusBar = signal(false);
  protected readonly sort = signal<string | null>('name');
}
