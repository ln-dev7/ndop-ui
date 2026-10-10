import { Component, signal } from '@angular/core';
import { NdMenuContent, NdMenuItem } from '@ndop/primitives/menu';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdDropdownMenuTrigger } from './dropdown-menu';

@Component({
  imports: [NdDropdownMenuTrigger, NdMenuContent, NdMenuItem],
  template: `
    <button [ndDropdownMenuTrigger]="menu" [(open)]="open" side="top">
      Actions
    </button>
    <ng-template #menu>
      <div ndMenuContent><div ndMenuItem>Edit</div></div>
    </ng-template>
  `,
})
class Host {
  readonly open = signal(false);
}

async function setup() {
  const view = await render(Host);
  const settle = async () => {
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
  };
  await settle();
  return { host: view.fixture.componentInstance, settle };
}

describe('NdDropdownMenuTrigger', () => {
  it('is a menu button that opens on click and reports it', async () => {
    const { host } = await setup();
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(trigger);
    expect(host.open()).toBe(true);
    expect(trigger.getAttribute('data-state')).toBe('open');
    expect(screen.getByRole('menu').getAttribute('data-side')).toBe('top');
    await userEvent.click(trigger);
    expect(host.open()).toBe(false);
  });

  it('follows a bound open state', async () => {
    const { host, settle } = await setup();
    host.open.set(true);
    await settle();
    expect(screen.getByRole('menu')).toBeTruthy();
    host.open.set(false);
    await settle();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
