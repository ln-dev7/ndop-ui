import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarItemIndicator,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/ui/menubar/menubar';

/**
 * An editor's File, Edit, View and Profiles menus, with shortcuts, a
 * disabled item, a submenu, checkbox items and a radio group. The menubar
 * is one tab stop; the arrow keys move between its menus.
 */
@Component({
  selector: 'example-menubar-demo',
  imports: [
    Menubar,
    MenubarCheckboxItem,
    MenubarContent,
    MenubarGroup,
    MenubarItem,
    MenubarItemIndicator,
    MenubarRadioGroup,
    MenubarRadioItem,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
    NdIcon,
  ],
  template: `
    <div class="grid justify-items-start gap-2">
      <div ndMenubar aria-label="Editor">
        <div [ndMenubarTrigger]="file">File</div>
        <div [ndMenubarTrigger]="edit">Edit</div>
        <div [ndMenubarTrigger]="view">View</div>
        <div [ndMenubarTrigger]="profiles">Profiles</div>
      </div>
      <p class="text-sm text-muted-foreground" aria-live="polite">
        {{ chosen() }}
      </p>
    </div>
    <ng-template #file>
      <div ndMenubarContent>
        <div ndMenubarItem (triggered)="choose('New tab')">
          New tab <span ndMenubarShortcut>⌘T</span>
        </div>
        <div ndMenubarItem (triggered)="choose('New window')">
          New window <span ndMenubarShortcut>⌘N</span>
        </div>
        <div ndMenubarItem disabled>New incognito window</div>
        <div ndMenubarSeparator></div>
        <div [ndMenubarSubTrigger]="share">
          Share
          <svg
            ndIcon="chevron-right"
            class="ms-auto size-4 rtl:rotate-180"
          ></svg>
        </div>
        <div ndMenubarSeparator></div>
        <div ndMenubarItem (triggered)="choose('Print')">
          Print… <span ndMenubarShortcut>⌘P</span>
        </div>
      </div>
    </ng-template>
    <ng-template #share>
      <div ndMenubarSubContent>
        <div ndMenubarItem (triggered)="choose('Email link')">Email link</div>
        <div ndMenubarItem (triggered)="choose('Messages')">Messages</div>
        <div ndMenubarItem (triggered)="choose('Notes')">Notes</div>
      </div>
    </ng-template>
    <ng-template #edit>
      <div ndMenubarContent>
        <div ndMenubarItem (triggered)="choose('Undo')">
          Undo <span ndMenubarShortcut>⌘Z</span>
        </div>
        <div ndMenubarItem (triggered)="choose('Redo')">
          Redo <span ndMenubarShortcut>⇧⌘Z</span>
        </div>
        <div ndMenubarSeparator></div>
        <div ndMenubarItem (triggered)="choose('Cut')">Cut</div>
        <div ndMenubarItem (triggered)="choose('Copy')">Copy</div>
        <div ndMenubarItem (triggered)="choose('Paste')">Paste</div>
      </div>
    </ng-template>
    <ng-template #view>
      <div ndMenubarContent>
        <div ndMenubarCheckboxItem [(checked)]="bookmarks">
          <span ndMenubarItemIndicator><svg ndIcon="check"></svg></span>
          Always show bookmarks bar
        </div>
        <div ndMenubarCheckboxItem [(checked)]="fullUrls">
          <span ndMenubarItemIndicator><svg ndIcon="check"></svg></span>
          Always show full URLs
        </div>
        <div ndMenubarSeparator></div>
        <div ndMenubarItem inset (triggered)="choose('Reload')">
          Reload <span ndMenubarShortcut>⌘R</span>
        </div>
        <div ndMenubarItem inset disabled>
          Force reload <span ndMenubarShortcut>⇧⌘R</span>
        </div>
        <div ndMenubarSeparator></div>
        <div ndMenubarItem inset (triggered)="choose('Toggle full screen')">
          Toggle full screen
        </div>
      </div>
    </ng-template>
    <ng-template #profiles>
      <div ndMenubarContent>
        <div ndMenubarRadioGroup aria-label="Profile" [(value)]="profile">
          @for (name of names; track name) {
            <div ndMenubarRadioItem [value]="name">
              <span ndMenubarItemIndicator>
                <svg ndIcon="circle" class="size-2 fill-current"></svg>
              </span>
              {{ name }}
            </div>
          }
        </div>
        <div ndMenubarSeparator></div>
        <div ndMenubarGroup aria-label="Manage">
          <div ndMenubarItem inset (triggered)="choose('Edit profiles')">
            Edit…
          </div>
          <div ndMenubarItem inset (triggered)="choose('Add profile')">
            Add profile…
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class MenubarDemoExample {
  protected readonly chosen = signal('');
  protected readonly bookmarks = signal(false);
  protected readonly fullUrls = signal(true);
  protected readonly profile = signal<string | null>('Benoit');
  protected readonly names = ['Andy', 'Benoit', 'Luis'];

  /**
   * Reports what was chosen.
   *
   * @param action - The item's name.
   */
  protected choose(action: string): void {
    this.chosen.set(`Chose ${action}.`);
  }
}
