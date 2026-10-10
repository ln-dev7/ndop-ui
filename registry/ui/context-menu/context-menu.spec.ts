import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuItemIndicator,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './context-menu';

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

describe('ContextMenu', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('context-menu').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'context-menu',
        registrySource('ui/context-menu/context-menu.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('styles items, with inset and destructive variants', async () => {
    await render(
      `<div [ndContextMenuTrigger]="menu" tabindex="0" aria-label="Area">Open</div>
      <ng-template #menu>
        <div ndContextMenuContent>
          <div ndContextMenuItem inset variant="destructive">Delete</div>
          <div ndContextMenuSeparator data-testid="separator"></div>
          <div ndContextMenuCheckboxItem [checked]="true">
            <span ndContextMenuItemIndicator data-testid="indicator">✓</span> Pinned
          </div>
        </div>
      </ng-template>`,
      {
        imports: [
          ContextMenuTrigger,
          ContextMenuContent,
          ContextMenuItem,
          ContextMenuSeparator,
          ContextMenuCheckboxItem,
          ContextMenuItemIndicator,
        ],
      },
    );
    fireEvent.contextMenu(screen.getByText('Open'), { button: 2 });
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
