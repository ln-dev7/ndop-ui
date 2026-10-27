import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdPopover,
  NdPopoverClose,
  NdPopoverContent,
  NdPopoverPortal,
  NdPopoverTrigger,
} from './index';

@Component({
  imports: [
    NdPopover,
    NdPopoverTrigger,
    NdPopoverPortal,
    NdPopoverContent,
    NdPopoverClose,
  ],
  template: `
    <button>Before</button>
    <ng-container ndPopover [(open)]="open">
      <button ndPopoverTrigger>Filters</button>
      <ng-template ndPopoverPortal>
        <div ndPopoverContent side="end" align="start" aria-label="Filters">
          <input aria-label="Search" />
          <button ndPopoverClose>Done</button>
        </div>
      </ng-template>
    </ng-container>
    <button>Outside</button>
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
  const trigger = screen.getByRole('button', { name: 'Filters' });
  const open = async () => {
    await userEvent.click(trigger);
    await settle();
    return screen.getByRole('dialog', { name: 'Filters' });
  };
  return { host: view.fixture.componentInstance, trigger, settle, open };
}

describe('NdPopover', () => {
  it('does not emit model changes while destroying an open trigger and root', async () => {
    const view = await render(Host);
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await view.fixture.whenStable();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    view.fixture.destroy();
    expect(warn.mock.calls.flat().join(' ')).not.toContain('NG0953');
    warn.mockRestore();
  });

  it('wires the trigger to the content while open', async () => {
    const { trigger, open } = await setup();
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);

    const content = await open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(content.hasAttribute('aria-modal')).toBe(false);
    expect(content.getAttribute('data-state')).toBe('open');
    expect(content.getAttribute('data-side')).toBe('end');
    expect(content.getAttribute('data-align')).toBe('start');
  });

  it('synchronizes native dismissal and returns focus to the trigger', async () => {
    const { host, trigger, settle, open } = await setup();
    trigger.focus();
    await open();
    screen.getByRole('dialog').hidePopover();
    await settle();
    expect(host.open()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from the close button and returns focus', async () => {
    const { host, trigger, settle, open } = await setup();
    trigger.focus();
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await settle();
    expect(host.open()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on an outside click, leaving focus where the user clicked', async () => {
    const { host, settle, open } = await setup();
    await open();
    const outside = screen.getByRole('button', { name: 'Outside' });
    await userEvent.click(outside);
    const content = document.querySelector<HTMLElement>('[ndPopoverContent]');
    content?.hidePopover();
    await settle();
    expect(host.open()).toBe(false);
    expect(document.activeElement).toBe(outside);
  });

  it('toggles from the trigger without the outside-click handler reopening it', async () => {
    const { host, trigger, settle, open } = await setup();
    await open();
    await userEvent.click(trigger);
    await settle();
    expect(host.open()).toBe(false);
  });

  it('closes when focus moves to another element on the page', async () => {
    const { host, settle, open } = await setup();
    await open();
    screen.getByRole('textbox', { name: 'Search' }).focus();
    screen.getByRole('button', { name: 'Before' }).focus();
    await settle();
    expect(host.open()).toBe(false);
  });
});
