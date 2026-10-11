import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandInputWrapper,
  CommandItem,
  CommandList,
  CommandShortcut,
} from './command';

/**
 * shadcn's classes as Ndop writes them. cmdk's `[cmdk-*]` selectors become
 * Ndop's own parts: the group heading is `CommandGroupHeading`; the
 * search icon is the user's markup, styled by the input wrapper; and
 * shadcn's `CommandDialog` is composed from Dialog and Command in the
 * `command-dialog` example.
 *
 * @param classes - A shadcn class string.
 * @returns The Ndop string, or `null` when dropped.
 */
function ndopClasses(classes: string): string | null {
  if (classes.startsWith('**:data-[slot=command-input-wrapper]:h-12')) {
    return null;
  }
  if (classes === 'overflow-hidden p-0' || classes === 'sr-only') {
    return null;
  }
  if (classes === 'size-4 shrink-0 opacity-50') {
    return '[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:opacity-50';
  }
  if (classes.startsWith('overflow-hidden p-1 text-foreground')) {
    return 'overflow-hidden p-1 text-foreground';
  }
  return classes.replace('ml-auto text-xs', 'ms-auto text-xs');
}

describe('Command', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('command').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'command',
        registrySource('ui/command/command.ts'),
        exceptions,
      ),
    ).toEqual([]);
    expect(registrySource('ui/command/command.ts')).toContain(
      'px-2 py-1.5 text-xs font-medium text-muted-foreground',
    );
  });

  it('styles the highlighted command through data-selected', async () => {
    await render(
      `<div ndCommand label="Commands">
        <div ndCommandInputWrapper><input ndCommandInput /></div>
        <div ndCommandList>
          <div ndCommandEmpty>No results.</div>
          <div ndCommandItem>Calendar <span ndCommandShortcut>⌘C</span></div>
        </div>
      </div>`,
      {
        imports: [
          Command,
          CommandInputWrapper,
          CommandInput,
          CommandList,
          CommandEmpty,
          CommandItem,
          CommandShortcut,
        ],
      },
    );
    await new Promise((resolve) => setTimeout(resolve));
    const item = screen.getByRole('option', { name: /Calendar/ });
    expect(item.getAttribute('data-selected')).toBe('true');
    expect(item.getAttribute('data-slot')).toBe('command-item');
  });
});
