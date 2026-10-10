import { Component, signal } from '@angular/core';
import { NdDropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdMenuContent,
  NdMenuGroup,
  NdMenuItem,
  NdMenuItemCheckbox,
  NdMenuItemIndicator,
  NdMenuItemRadio,
  NdMenuLabel,
  NdMenuRadioGroup,
  NdMenuSeparator,
  NdMenuSubTrigger,
} from './menu';

@Component({
  imports: [
    NdDropdownMenuTrigger,
    NdMenuContent,
    NdMenuGroup,
    NdMenuItem,
    NdMenuItemCheckbox,
    NdMenuItemIndicator,
    NdMenuItemRadio,
    NdMenuLabel,
    NdMenuRadioGroup,
    NdMenuSeparator,
    NdMenuSubTrigger,
  ],
  template: `
    <button [ndDropdownMenuTrigger]="menu">View</button>
    <ng-template #menu>
      <div ndMenuContent data-testid="menu">
        <div ndMenuGroup aria-labelledby="label">
          <div ndMenuLabel id="label">Actions</div>
          <div ndMenuItem (triggered)="edited.set(true)">Edit</div>
          <div ndMenuItem disabled>Share</div>
        </div>
        <div ndMenuSeparator data-testid="separator"></div>
        <div ndMenuItemCheckbox [(checked)]="statusBar">
          <span ndMenuItemIndicator data-testid="check">✓</span>
          Status bar
        </div>
        <div ndMenuRadioGroup aria-label="Sort" [(value)]="sort">
          <div ndMenuItemRadio value="name">Name</div>
          <div ndMenuItemRadio value="date">Date</div>
        </div>
        <div [ndMenuSubTrigger]="more">More</div>
      </div>
    </ng-template>
    <ng-template #more>
      <div ndMenuContent data-testid="submenu">
        <div ndMenuItem>Archive</div>
      </div>
    </ng-template>
  `,
})
class Host {
  readonly edited = signal(false);
  readonly statusBar = signal(false);
  readonly sort = signal<string | null>('name');
}

async function open() {
  const view = await render(Host);
  await userEvent.click(screen.getByRole('button', { name: 'View' }));
  await view.fixture.whenStable();
  return { host: view.fixture.componentInstance, fixture: view.fixture };
}

describe('menu parts', () => {
  it('render a menu with items, groups and a separator', async () => {
    await open();
    const menu = screen.getByRole('menu');
    expect(menu.getAttribute('data-side')).toBe('bottom');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeTruthy();
    const share = screen.getByRole('menuitem', { name: 'Share' });
    expect(share.getAttribute('aria-disabled')).toBe('true');
    expect(share.hasAttribute('data-disabled')).toBe(true);
    expect(screen.getByRole('group', { name: 'Actions' })).toBeTruthy();
    expect(screen.getByTestId('separator').getAttribute('role')).toBe(
      'separator',
    );
  });

  it('emits triggered and closes', async () => {
    const { host } = await open();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(host.edited()).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('flips a checkbox item and shows its indicator', async () => {
    const { host } = await open();
    const item = screen.getByRole('menuitemcheckbox', { name: /Status bar/ });
    expect(item.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByTestId('check').hidden).toBe(true);
    await userEvent.click(item);
    expect(host.statusBar()).toBe(true);
  });

  it('checks one radio item of a group', async () => {
    const { host } = await open();
    expect(
      screen
        .getByRole('menuitemradio', { name: 'Name' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(host.sort()).toBe('date');
  });

  it('opens a submenu at the end side', async () => {
    const { fixture } = await open();
    const more = screen.getByRole('menuitem', { name: 'More' });
    expect(more.getAttribute('aria-haspopup')).toBe('menu');
    more.focus();
    // The CDK reads keyCode, which user-event doesn't set.
    fireEvent.keyDown(more, { key: 'ArrowRight', keyCode: 39 });
    await fixture.whenStable();
    expect(screen.getByTestId('submenu').getAttribute('data-side')).toBe('end');
    expect(more.getAttribute('data-state')).toBe('open');
  });
});
