import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdHoverCard,
  NdHoverCardContent,
  NdHoverCardPortal,
  NdHoverCardTrigger,
} from './hover-card';

@Component({
  imports: [
    NdHoverCard,
    NdHoverCardTrigger,
    NdHoverCardPortal,
    NdHoverCardContent,
  ],
  template: `
    <ng-container ndHoverCard [(open)]="open" [openDelay]="0" [closeDelay]="0">
      <a ndHoverCardTrigger href="/ada">&#64;ada</a>
      <ng-template ndHoverCardPortal>
        <div ndHoverCardContent data-testid="card">Ada Lovelace</div>
      </ng-template>
    </ng-container>
  `,
})
class Host {
  readonly open = signal(false);
}

async function settle(view: Awaited<ReturnType<typeof render>>) {
  await new Promise((resolve) => setTimeout(resolve, 10));
  await view.fixture.whenStable();
}

describe('NdHoverCard', () => {
  it('opens on hover with no role or reference, and closes on leave', async () => {
    const view = await render(Host);
    const link = screen.getByRole('link', { name: '@ada' });
    fireEvent.pointerEnter(link);
    await settle(view);
    const card = screen.getByTestId('card');
    expect(card.hasAttribute('role')).toBe(false);
    expect(card.getAttribute('data-side')).toBe('bottom');
    expect(link.hasAttribute('aria-describedby')).toBe(false);
    expect(link.getAttribute('data-state')).toBe('open');
    fireEvent.pointerLeave(link);
    await settle(view);
    expect(screen.queryByTestId('card')).toBeNull();
  });

  it('stays open while the pointer is over the card', async () => {
    const view = await render(Host);
    const link = screen.getByRole('link');
    fireEvent.pointerEnter(link);
    await settle(view);
    fireEvent.pointerLeave(link);
    fireEvent.pointerEnter(screen.getByTestId('card'));
    await settle(view);
    expect(view.fixture.componentInstance.open()).toBe(true);
  });
});
