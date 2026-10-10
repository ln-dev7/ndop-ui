import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import { NdMenuContent, NdMenuItem } from '@ndop/primitives/menu';
import { NdContextMenuTrigger } from './context-menu';

const TEMPLATE = `
  <div [ndContextMenuTrigger]="menu" tabindex="0" aria-label="Canvas" data-testid="area">Right click</div>
  <ng-template #menu>
    <div ndMenuContent><div ndMenuItem>Paste</div></div>
  </ng-template>
`;

describe('NdContextMenuTrigger', () => {
  it('opens on contextmenu, at the bottom side', async () => {
    const view = await render(TEMPLATE, {
      imports: [NdContextMenuTrigger, NdMenuContent, NdMenuItem],
    });
    const area = screen.getByTestId('area');
    expect(area.getAttribute('data-state')).toBe('closed');
    fireEvent.contextMenu(area, { button: 2, clientX: 10, clientY: 10 });
    await view.fixture.whenStable();
    expect(screen.getByRole('menu').getAttribute('data-side')).toBe('bottom');
    expect(area.getAttribute('data-state')).toBe('open');
  });

  it('opens on Shift + F10 and focuses the first item', async () => {
    const view = await render(TEMPLATE, {
      imports: [NdContextMenuTrigger, NdMenuContent, NdMenuItem],
    });
    const area = screen.getByTestId('area');
    area.focus();
    fireEvent.keyDown(area, { key: 'F10', shiftKey: true });
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Paste' }),
    );
  });
});
