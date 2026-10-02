import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdDialog,
  NdDialogClose,
  NdDialogContent,
  NdDialogDescription,
  NdDialogOverlay,
  NdDialogPortal,
  NdDialogTitle,
  NdDialogTrigger,
} from './index';

const parts = [
  NdDialog,
  NdDialogTrigger,
  NdDialogPortal,
  NdDialogOverlay,
  NdDialogContent,
  NdDialogTitle,
  NdDialogDescription,
  NdDialogClose,
];

@Component({
  imports: parts,
  template: `
    <ng-container
      ndDialog
      [(open)]="open"
      [defaultOpen]="defaultOpen()"
      [closeOnEscape]="closeOnEscape()"
    >
      <button ndDialogTrigger>Edit profile</button>
      <ng-template ndDialogPortal>
        <div ndDialogOverlay data-testid="overlay"></div>
        <div ndDialogContent>
          <h2 ndDialogTitle>Edit profile</h2>
          <p ndDialogDescription>Changes are saved when you close.</p>
          <input aria-label="Name" />
          <button ndDialogClose>Close</button>
        </div>
      </ng-template>
    </ng-container>
  `,
})
class Host {
  readonly open = signal(false);
  readonly defaultOpen = signal(false);
  readonly closeOnEscape = signal(true);
}

async function setup() {
  const view = await render(Host);
  const host = view.fixture.componentInstance;
  const settle = async () => {
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
  };
  await settle();
  return {
    host,
    settle,
    trigger: screen.getByRole('button', { name: 'Edit profile' }),
  };
}

describe('NdDialog', () => {
  it('renders nothing but the trigger while closed', async () => {
    const { trigger } = await setup();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('opens from the trigger with dialog semantics wired up', async () => {
    const { host, trigger, settle } = await setup();
    await userEvent.click(trigger);
    await settle();

    const dialog = screen.getByRole('dialog');
    expect(host.open()).toBe(true);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog).toHaveProperty('tabIndex', -1);
    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBe(dialog);
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby') ?? ''),
    ).toHaveProperty('textContent', 'Changes are saved when you close.');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(dialog.getAttribute('data-state')).toBe('open');
  });

  it('moves focus into the content and back to the trigger on close', async () => {
    const { trigger, settle } = await setup();
    trigger.focus();
    await userEvent.click(trigger);
    await settle();
    // jsdom has no layout, so the CDK can't tell which element is tabbable;
    // the e2e suite checks that the first focusable element gets focus.
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
      true,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on Escape unless closeOnEscape is false', async () => {
    const { host, trigger, settle } = await setup();
    await userEvent.click(trigger);
    await settle();
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(host.open()).toBe(false);

    host.closeOnEscape.set(false);
    await userEvent.click(trigger);
    await settle();
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(host.open()).toBe(true);
  });

  it('closes on an overlay click', async () => {
    const { host, trigger, settle } = await setup();
    await userEvent.click(trigger);
    await settle();
    expect(screen.getByTestId('overlay').getAttribute('aria-hidden')).toBe(
      'true',
    );
    await userEvent.click(screen.getByTestId('overlay'));
    await settle();
    expect(host.open()).toBe(false);
  });

  it('follows a bound open state', async () => {
    const { host, settle } = await setup();
    host.open.set(true);
    await settle();
    expect(screen.getByRole('dialog')).toBeTruthy();
    host.open.set(false);
    await settle();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('NdDialog defaultOpen', () => {
  @Component({
    imports: parts,
    template: `
      <ng-container ndDialog defaultOpen>
        <button ndDialogTrigger>Open</button>
        <ng-template ndDialogPortal>
          <div ndDialogContent aria-label="Initially open">Hello</div>
        </ng-template>
      </ng-container>
    `,
  })
  class OpenHost {}

  it('opens after the first render when unbound', async () => {
    const { fixture } = await render(OpenHost);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(screen.getByRole('dialog', { name: 'Initially open' })).toBeTruthy();
  });
});
