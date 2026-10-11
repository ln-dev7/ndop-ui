import { Component, signal } from '@angular/core';
import {
  NdCommand,
  NdCommandEmpty,
  NdCommandGroup,
  NdCommandGroupHeading,
  NdCommandInput,
  NdCommandItem,
  NdCommandList,
  NdCommandSeparator,
} from '@ndop/primitives/command';

/**
 * Command demo (`/primitives/command`): a command list filtered by its
 * search field, reporting the last command run.
 */
@Component({
  selector: 'harness-command-demo',
  imports: [
    NdCommand,
    NdCommandInput,
    NdCommandList,
    NdCommandEmpty,
    NdCommandGroup,
    NdCommandGroupHeading,
    NdCommandItem,
    NdCommandSeparator,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Command</h1>
      <div ndCommand label="Commands" class="w-80 rounded-md border">
        <input
          ndCommandInput
          placeholder="Type a command…"
          class="w-full border-b px-2 py-1"
        />
        <div ndCommandList class="p-1">
          <div ndCommandEmpty class="px-2">No results.</div>
          <div ndCommandGroup>
            <div ndCommandGroupHeading class="px-2 text-xs text-gray-500">
              Suggestions
            </div>
            <div
              ndCommandItem
              [class]="item"
              (triggered)="last.set('Calendar')"
            >
              Calendar
            </div>
            <div
              ndCommandItem
              keywords="smiley"
              [class]="item"
              (triggered)="last.set('Search emoji')"
            >
              Search emoji
            </div>
            <div ndCommandItem disabled [class]="item">Calculator</div>
          </div>
          <div ndCommandSeparator class="my-1 h-px bg-gray-200"></div>
          <div ndCommandGroup>
            <div ndCommandGroupHeading class="px-2 text-xs text-gray-500">
              Settings
            </div>
            <div ndCommandItem [class]="item" (triggered)="last.set('Profile')">
              Profile
            </div>
          </div>
        </div>
      </div>
      <p data-testid="last">{{ last() }}</p>
    </main>
  `,
})
export default class CommandDemo {
  protected readonly last = signal('');
  protected readonly item =
    'rounded-sm px-2 py-1 data-[selected=true]:bg-gray-100';
}
