import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarItemIndicator,
  MenubarSeparator,
  MenubarTrigger,
} from './menubar';

/**
 * shadcn's classes as Ndop writes them: logical sides and spacing, and no
 * Radix custom properties, which the CDK overlay doesn't set.
 */
function ndopClasses(classes: string): string | null {
  // Icons are the user's markup, in the examples.
  if (
    /^(size-2 fill-current|ml-auto size-4|ml-auto h-4 w-4|ml-auto|size-4)$/.test(
      classes,
    )
  ) {
    return null;
  }
  const nativeExit = classes.includes('data-[state=closed]:animate-out')
    ? classes
    : classes.replace(
        'data-[state=closed]:fade-out-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      );
  return nativeExit
    .replace(/origin-\(--radix-[a-z-]+\) /, '')
    .replace(/max-h-\(--radix-[a-z-]+\)/, 'max-h-[80vh]')
    .replace(
      'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
      'data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2',
    )
    .replace('pr-2 pl-8', 'pe-2 ps-8')
    .replace('data-[inset]:pl-8', 'data-[inset]:ps-8')
    .replace('absolute left-2', 'absolute start-2')
    .replace('ml-auto text-xs', 'ms-auto text-xs')
    .replace(
      'rounded-sm px-2 py-1.5 text-sm outline-none',
      'rounded-sm px-2 py-1.5 text-sm outline-hidden',
    );
}

describe('Menubar', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('menubar').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'menubar',
        registrySource('ui/menubar/menubar.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('styles items, with inset and destructive variants', async () => {
    await render(
      `<div ndMenubar aria-label="App"><div [ndMenubarTrigger]="menu">Open</div></div>
      <ng-template #menu>
        <div ndMenubarContent>
          <div ndMenubarItem inset variant="destructive">Delete</div>
          <div ndMenubarSeparator data-testid="separator"></div>
          <div ndMenubarCheckboxItem [checked]="true">
            <span ndMenubarItemIndicator data-testid="indicator">✓</span> Pinned
          </div>
        </div>
      </ng-template>`,
      {
        imports: [
          Menubar,
          MenubarTrigger,
          MenubarContent,
          MenubarItem,
          MenubarSeparator,
          MenubarCheckboxItem,
          MenubarItemIndicator,
        ],
      },
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Open' }));
    const item = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(item.hasAttribute('data-inset')).toBe(true);
    expect(item.getAttribute('data-variant')).toBe('destructive');
    expect(item.classList).toContain('data-[inset]:ps-8');
    expect(screen.getByTestId('separator').getAttribute('role')).toBe(
      'separator',
    );
    expect(
      screen
        .getByRole('menuitemcheckbox', { name: /Pinned/ })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getByTestId('indicator').hidden).toBe(false);
  });
});
