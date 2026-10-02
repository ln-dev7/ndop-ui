import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdTooltip,
  NdTooltipContent,
  NdTooltipPortal,
  NdTooltipTrigger,
} from './index';

@Component({
  imports: [NdTooltip, NdTooltipTrigger, NdTooltipPortal, NdTooltipContent],
  template: `
    <ng-container ndTooltip [(open)]="open">
      <button ndTooltipTrigger aria-label="Delete" aria-describedby="hint">
        X
      </button>
      <ng-template ndTooltipPortal>
        <div ndTooltipContent side="top">Delete permanently</div>
      </ng-template>
    </ng-container>
    <p id="hint">Cannot be undone.</p>
  `,
})
class Host {
  readonly open = signal(false);
}

async function setup() {
  vi.useFakeTimers();
  const view = await render(Host);
  // Angular's zoneless scheduler runs on timers too, so with fake timers
  // the test advances time instead of awaiting whenStable().
  const settle = async (ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms);
    await vi.advanceTimersByTimeAsync(20);
  };
  await settle();
  return {
    host: view.fixture.componentInstance,
    trigger: screen.getByRole('button', { name: 'Delete' }),
    settle,
  };
}

describe('NdTooltip', () => {
  afterEach(() => vi.useRealTimers());

  it('opens on hover after the open delay', async () => {
    const { host, trigger, settle } = await setup();
    fireEvent.pointerEnter(trigger);
    await settle(600);
    expect(host.open()).toBe(false);
    await settle(100);
    expect(host.open()).toBe(true);
    expect(screen.getByRole('tooltip').textContent?.trim()).toBe(
      'Delete permanently',
    );
  });

  it('adds its id to aria-describedby while open, keeping existing ids', async () => {
    const { host, trigger, settle } = await setup();
    host.open.set(true);
    await settle();
    const id = screen.getByRole('tooltip').id;
    expect(trigger.getAttribute('aria-describedby')?.split(' ')).toEqual([
      'hint',
      id,
    ]);
    expect(
      screen.getByRole('button', { description: /Delete permanently/ }),
    ).toBe(trigger);

    host.open.set(false);
    await settle();
    expect(trigger.getAttribute('aria-describedby')).toBe('hint');
  });

  it('closes after the close delay unless the pointer moves onto the content', async () => {
    const { host, trigger, settle } = await setup();
    host.open.set(true);
    await settle();

    fireEvent.pointerLeave(trigger);
    await settle(200);
    fireEvent.pointerEnter(screen.getByRole('tooltip'));
    await settle(500);
    expect(host.open()).toBe(true);

    fireEvent.pointerLeave(screen.getByRole('tooltip'));
    await settle(300);
    expect(host.open()).toBe(false);
  });

  it('closes on Escape and on blur', async () => {
    const { host, trigger, settle } = await setup();
    host.open.set(true);
    await settle();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await settle();
    expect(host.open()).toBe(false);

    host.open.set(true);
    await settle();
    fireEvent.blur(trigger);
    await settle();
    expect(host.open()).toBe(false);
  });

  it('is never focusable', async () => {
    const { host, settle } = await setup();
    host.open.set(true);
    await settle();
    expect(screen.getByRole('tooltip').hasAttribute('tabindex')).toBe(false);
  });
});
