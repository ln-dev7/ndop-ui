import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupHeading,
  CommandInput,
  CommandInputWrapper,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/ui/command/command';

/**
 * An inline command list with groups, shortcuts and a disabled command.
 * Focus stays in the search field; the arrow keys move the highlight and
 * Enter runs it.
 */
@Component({
  selector: 'example-command-demo',
  imports: [
    Command,
    CommandEmpty,
    CommandGroup,
    CommandGroupHeading,
    CommandInput,
    CommandInputWrapper,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
    NdIcon,
  ],
  template: `
    <div class="grid w-md max-w-full gap-2">
      <div ndCommand label="Commands" class="rounded-lg border shadow-md">
        <div ndCommandInputWrapper>
          <svg ndIcon="search"></svg>
          <input ndCommandInput placeholder="Type a command or search…" />
        </div>
        <div ndCommandList>
          <div ndCommandEmpty>No results found.</div>
          <div ndCommandGroup>
            <div ndCommandGroupHeading>Suggestions</div>
            <div ndCommandItem (triggered)="run('Calendar')">Calendar</div>
            <div
              ndCommandItem
              keywords="smiley emoji"
              (triggered)="run('Search emoji')"
            >
              Search emoji
            </div>
            <div ndCommandItem disabled>Calculator</div>
          </div>
          <div ndCommandSeparator></div>
          <div ndCommandGroup>
            <div ndCommandGroupHeading>Settings</div>
            <div ndCommandItem (triggered)="run('Profile')">
              Profile <span ndCommandShortcut>⌘P</span>
            </div>
            <div ndCommandItem (triggered)="run('Billing')">
              Billing <span ndCommandShortcut>⌘B</span>
            </div>
            <div ndCommandItem (triggered)="run('Settings')">
              Settings <span ndCommandShortcut>⌘S</span>
            </div>
          </div>
        </div>
      </div>
      <p class="text-sm text-muted-foreground" aria-live="polite">
        {{ ran() }}
      </p>
    </div>
  `,
})
export class CommandDemoExample {
  protected readonly ran = signal('');

  /**
   * Reports the command that ran.
   *
   * @param name - The command's name.
   */
  protected run(name: string): void {
    this.ran.set(`Ran ${name}.`);
  }
}
