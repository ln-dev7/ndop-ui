import { Component } from '@angular/core';
import { NdMenuContent, NdMenuItem } from '@ndop/primitives/menu';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdMenubar, NdMenubarTrigger } from './menubar';

@Component({
  imports: [NdMenubar, NdMenubarTrigger, NdMenuContent, NdMenuItem],
  template: `
    <div ndMenubar aria-label="Editor">
      <div [ndMenubarTrigger]="file">File</div>
      <div [ndMenubarTrigger]="edit">Edit</div>
    </div>
    <ng-template #file>
      <div ndMenuContent><div ndMenuItem>New tab</div></div>
    </ng-template>
    <ng-template #edit>
      <div ndMenuContent><div ndMenuItem>Undo</div></div>
    </ng-template>
  `,
})
class Host {}

async function setup() {
  const view = await render(Host);
  const settle = async () => {
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
  };
  await settle();
  return { settle };
}

describe('NdMenubar', () => {
  it('is a menubar of menu triggers with one tab stop', async () => {
    await setup();
    const menubar = screen.getByRole('menubar', { name: 'Editor' });
    expect(menubar.getAttribute('tabindex')).toBe('0');
    const [file, edit] = screen.getAllByRole('menuitem');
    expect(file?.getAttribute('aria-haspopup')).toBe('menu');
    expect(file?.getAttribute('aria-expanded')).toBe('false');
    expect(file?.getAttribute('tabindex')).toBe('-1');
    expect(edit?.getAttribute('tabindex')).toBe('-1');
  });

  it('opens a trigger’s menu below it on click', async () => {
    await setup();
    const file = screen.getByRole('menuitem', { name: 'File' });
    await userEvent.click(file);
    expect(file.getAttribute('data-state')).toBe('open');
    expect(file.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu');
    expect(menu.getAttribute('data-side')).toBe('bottom');
    expect(screen.getByRole('menuitem', { name: 'New tab' })).toBeTruthy();
  });

  it('moves to the next trigger’s menu with ArrowRight while one is open', async () => {
    const { settle } = await setup();
    await userEvent.click(screen.getByRole('menuitem', { name: 'File' }));
    // The CDK key manager reads `keyCode`, which user-event doesn't set.
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'New tab' }), {
      key: 'ArrowRight',
      keyCode: 39,
    });
    await settle();
    expect(screen.queryByRole('menuitem', { name: 'New tab' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Undo' })).toBeTruthy();
  });
});
