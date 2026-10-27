import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/ui/dropdown-menu/dropdown-menu';
import { NdMenuGroup as DropdownMenuGroup } from '@ndop/primitives/menu';
import { NdDropdownMenuTrigger as DropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';

/**
 * An account menu: labelled groups, shortcuts, a submenu, a disabled item
 * and a destructive action, reporting what was chosen.
 */
@Component({
  selector: 'example-dropdown-menu-demo',
  imports: [
    Button,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    NdIcon,
  ],
  template: `
    <div class="flex flex-col items-start gap-3">
      <button ndButton variant="outline" [ndDropdownMenuTrigger]="account">
        Open
      </button>
      <p class="text-sm text-muted-foreground" aria-live="polite">
        {{ chosen() }}
      </p>
    </div>
    <ng-template #account>
      <div ndDropdownMenuContent class="w-56">
        <div ndMenuGroup aria-labelledby="dropdown-menu-demo-account">
          <div ndDropdownMenuLabel id="dropdown-menu-demo-account">
            My account
          </div>
          <div ndDropdownMenuItem (triggered)="choose('Profile')">
            Profile <span ndDropdownMenuShortcut>⇧⌘P</span>
          </div>
          <div ndDropdownMenuItem (triggered)="choose('Billing')">
            Billing <span ndDropdownMenuShortcut>⌘B</span>
          </div>
          <div ndDropdownMenuItem (triggered)="choose('Settings')">
            Settings <span ndDropdownMenuShortcut>⌘S</span>
          </div>
        </div>
        <div ndDropdownMenuSeparator></div>
        <div ndMenuGroup aria-label="Team">
          <div ndDropdownMenuItem (triggered)="choose('Team')">Team</div>
          <div [ndDropdownMenuSubTrigger]="invite">
            Invite users
            <svg ndIcon="chevron-right" class="ms-auto rtl:rotate-180"></svg>
          </div>
          <div ndDropdownMenuItem disabled>API (coming soon)</div>
        </div>
        <div ndDropdownMenuSeparator></div>
        <div
          ndDropdownMenuItem
          variant="destructive"
          (triggered)="choose('Log out')"
        >
          Log out <span ndDropdownMenuShortcut>⇧⌘Q</span>
        </div>
      </div>
    </ng-template>
    <ng-template #invite>
      <div ndDropdownMenuSubContent>
        <div ndDropdownMenuItem (triggered)="choose('Invite by email')">
          Email
        </div>
        <div ndDropdownMenuItem (triggered)="choose('Invite by message')">
          Message
        </div>
      </div>
    </ng-template>
  `,
})
export class DropdownMenuDemoExample {
  protected readonly chosen = signal('');

  /**
   * Reports what was chosen.
   *
   * @param action - The item's name.
   */
  protected choose(action: string): void {
    this.chosen.set(`Chose ${action}.`);
  }
}
