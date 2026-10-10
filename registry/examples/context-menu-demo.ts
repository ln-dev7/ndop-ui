import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuItemIndicator,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/ui/context-menu/context-menu';

/**
 * Browser-style actions on an area: shortcuts, a disabled item, a submenu,
 * a checkbox and a group of radios. The area is focusable and named, so
 * Shift + F10 opens the menu from the keyboard.
 */
@Component({
  selector: 'example-context-menu-demo',
  imports: [
    ContextMenuCheckboxItem,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuItemIndicator,
    ContextMenuLabel,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuSeparator,
    ContextMenuShortcut,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
    NdIcon,
  ],
  template: `
    <div
      [ndContextMenuTrigger]="menu"
      tabindex="0"
      aria-label="Page preview"
      class="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      Right click here
    </div>
    <ng-template #menu>
      <div ndContextMenuContent class="w-52">
        <div ndContextMenuItem inset>
          Back <span ndContextMenuShortcut>⌘[</span>
        </div>
        <div ndContextMenuItem inset disabled>
          Forward <span ndContextMenuShortcut>⌘]</span>
        </div>
        <div ndContextMenuItem inset>
          Reload <span ndContextMenuShortcut>⌘R</span>
        </div>
        <div [ndContextMenuSubTrigger]="tools" inset>
          More tools
          <svg ndIcon="chevron-right" class="ms-auto rtl:rotate-180"></svg>
        </div>
        <div ndContextMenuSeparator></div>
        <div ndContextMenuCheckboxItem [(checked)]="bookmarks">
          <span ndContextMenuItemIndicator><svg ndIcon="check"></svg></span>
          Show bookmarks
        </div>
        <div ndContextMenuSeparator></div>
        <div ndContextMenuLabel inset id="context-menu-demo-people">People</div>
        <div
          ndContextMenuRadioGroup
          aria-labelledby="context-menu-demo-people"
          [(value)]="person"
        >
          @for (name of people; track name) {
            <div ndContextMenuRadioItem [value]="name">
              <span ndContextMenuItemIndicator>
                <svg ndIcon="circle" class="size-2 fill-current"></svg>
              </span>
              {{ name }}
            </div>
          }
        </div>
      </div>
    </ng-template>
    <ng-template #tools>
      <div ndContextMenuSubContent class="w-44">
        <div ndContextMenuItem>Save page…</div>
        <div ndContextMenuItem>Developer tools</div>
        <div ndContextMenuSeparator></div>
        <div ndContextMenuItem variant="destructive">Delete</div>
      </div>
    </ng-template>
  `,
})
export class ContextMenuDemoExample {
  protected readonly bookmarks = signal(true);
  protected readonly people = ['Pedro Duarte', 'Colm Tuite'];
  protected readonly person = signal<string | null>('Pedro Duarte');
}
