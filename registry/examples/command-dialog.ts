import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupHeading,
  CommandInput,
  CommandInputWrapper,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/ui/command/command';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog/dialog';
import {
  NdDialog as Dialog,
  NdDialogTrigger as DialogTrigger,
} from '@ndop/primitives/dialog';

/**
 * A command palette in a dialog, opened with its button or with Ctrl+K
 * (⌘K on a Mac). Running a command closes it.
 */
@Component({
  selector: 'example-command-dialog',
  imports: [
    Button,
    Command,
    CommandEmpty,
    CommandGroup,
    CommandGroupHeading,
    CommandInput,
    CommandInputWrapper,
    CommandItem,
    CommandList,
    CommandShortcut,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,

    DialogTitle,
    DialogTrigger,
    NdIcon,
  ],
  host: { '(document:keydown)': 'shortcut($event)' },
  template: `
    <ng-container ndDialog [(open)]="open">
      <button ndButton variant="outline" ndDialogTrigger>
        Open palette <kbd class="text-muted-foreground text-xs">⌘K</kbd>
      </button>

      <dialog ndDialogContent class="overflow-hidden p-0">
        <div ndDialogHeader class="sr-only">
          <h2 ndDialogTitle>Command palette</h2>
          <p ndDialogDescription>Search for a command to run.</p>
        </div>
        <div
          ndCommand
          label="Commands"
          class="**:data-[slot=command-input-wrapper]:h-12 **:data-[slot=command-group-heading]:px-2 **:data-[slot=command-group-heading]:font-medium **:data-[slot=command-group-heading]:text-muted-foreground **:data-[slot=command-group]:px-2 **:data-[slot=command-input-wrapper]:[&>svg]:h-5 **:data-[slot=command-input-wrapper]:[&>svg]:w-5 **:data-[slot=command-input]:h-12 **:data-[slot=command-item]:px-2 **:data-[slot=command-item]:py-3 **:data-[slot=command-item]:[&_svg]:h-5 **:data-[slot=command-item]:[&_svg]:w-5"
        >
          <div ndCommandInputWrapper>
            <svg ndIcon="search"></svg>
            <input ndCommandInput placeholder="Type a command or search…" />
          </div>
          <div ndCommandList>
            <div ndCommandEmpty>No results found.</div>
            <div ndCommandGroup>
              <div ndCommandGroupHeading>Suggestions</div>
              <div ndCommandItem (triggered)="run('Calendar')">Calendar</div>
              <div ndCommandItem (triggered)="run('Search emoji')">
                Search emoji
              </div>
            </div>
            <div ndCommandGroup>
              <div ndCommandGroupHeading>Settings</div>
              <div ndCommandItem (triggered)="run('Profile')">
                Profile <span ndCommandShortcut>⌘P</span>
              </div>
              <div ndCommandItem (triggered)="run('Settings')">
                Settings <span ndCommandShortcut>⌘S</span>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </ng-container>
    <p class="text-sm text-muted-foreground" aria-live="polite">{{ ran() }}</p>
  `,
})
export class CommandDialogExample {
  protected readonly open = signal(false);
  protected readonly ran = signal('');

  /**
   * Opens or closes the palette for Ctrl+K or ⌘K.
   *
   * @param event - A keydown anywhere in the document.
   */
  protected shortcut(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.open.update((open) => !open);
    }
  }

  /**
   * Runs a command and closes the palette.
   *
   * @param name - The command's name.
   */
  protected run(name: string): void {
    this.ran.set(`Ran ${name}.`);
    this.open.set(false);
  }
}
