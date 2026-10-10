import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

/**
 * shadcn's classes as Ndop writes them: logical sides and spacing, and no
 * Radix custom properties, which the CDK overlay doesn't set.
 */
function ndopClasses(classes: string): string | null {
  // Icons are the user's markup, in the examples.
  if (/^(size-2 fill-current|ml-auto size-4|ml-auto|size-4)$/.test(classes)) {
    return null;
  }
  return classes
    .replace(/origin-\(--radix-[a-z-]+\) /, '')
    .replace(/max-h-\(--radix-[a-z-]+\)/, 'max-h-[80vh]')
    .replace(
      'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
      'data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2',
    )
    .replace('pr-2 pl-8', 'pe-2 ps-8')
    .replace('data-[inset]:pl-8', 'data-[inset]:ps-8')
    .replace('absolute left-2', 'absolute start-2')
    .replace('ml-auto text-xs', 'ms-auto text-xs');
}

describe('DropdownMenu', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('dropdown-menu').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'dropdown-menu',
        registrySource('ui/dropdown-menu/dropdown-menu.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('styles items, with inset and destructive variants', async () => {
    await render(
      `<button [ndDropdownMenuTrigger]="menu">Open</button>
      <ng-template #menu>
        <div ndDropdownMenuContent>
          <div ndDropdownMenuItem inset variant="destructive">Delete</div>
          <div ndDropdownMenuSeparator data-testid="separator"></div>
          <div ndDropdownMenuCheckboxItem [checked]="true">
            <span ndDropdownMenuItemIndicator data-testid="indicator">✓</span> Pinned
          </div>
        </div>
      </ng-template>`,
      {
        imports: [
          DropdownMenuTrigger,
          DropdownMenuContent,
          DropdownMenuItem,
          DropdownMenuSeparator,
          DropdownMenuCheckboxItem,
          DropdownMenuItemIndicator,
        ],
      },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
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
