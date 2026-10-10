import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdAlertDialog,
  NdAlertDialogAction,
  NdAlertDialogCancel,
  NdAlertDialogContent,
  NdAlertDialogDescription,
  NdAlertDialogOverlay,
  NdAlertDialogPortal,
  NdAlertDialogTitle,
  NdAlertDialogTrigger,
} from './alert-dialog';

@Component({
  imports: [
    NdAlertDialog,
    NdAlertDialogTrigger,
    NdAlertDialogPortal,
    NdAlertDialogOverlay,
    NdAlertDialogContent,
    NdAlertDialogTitle,
    NdAlertDialogDescription,
    NdAlertDialogCancel,
    NdAlertDialogAction,
  ],
  template: `
    <ng-container ndAlertDialog [(open)]="open">
      <button ndAlertDialogTrigger>Delete project</button>
      <ng-template ndAlertDialogPortal>
        <div ndAlertDialogOverlay data-testid="overlay"></div>
        <div ndAlertDialogContent>
          <h2 ndAlertDialogTitle>Delete this project?</h2>
          <p ndAlertDialogDescription>This can't be undone.</p>
          <button ndAlertDialogAction (click)="deleted.set(true)">
            Delete
          </button>
          <button ndAlertDialogCancel>Cancel</button>
        </div>
      </ng-template>
    </ng-container>
  `,
})
class Host {
  readonly open = signal(false);
  readonly deleted = signal(false);
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

describe('NdAlertDialog', () => {
  it('opens an alertdialog, labelled and described, that starts on Cancel', async () => {
    const { settle } = await setup();
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete project' }),
    );
    await settle();
    const dialog = screen.getByRole('alertdialog', {
      name: 'Delete this project?',
    });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText("This can't be undone.").id,
    );
    // The CDK focus trap focuses this element first; jsdom has no layout,
    // so its visibility check fails here, and the e2e test checks focus.
    expect(
      screen
        .getByRole('button', { name: 'Cancel' })
        .hasAttribute('cdkfocusinitial'),
    ).toBe(true);
  });

  it("doesn't close on an overlay click, but closes on Escape and Cancel", async () => {
    const { host, settle } = await setup();
    host.open.set(true);
    await settle();
    await userEvent.click(screen.getByTestId('overlay'));
    await settle();
    expect(host.open()).toBe(true);
    await userEvent.keyboard('{Escape}');
    await settle();
    expect(host.open()).toBe(false);
    host.open.set(true);
    await settle();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await settle();
    expect(host.open()).toBe(false);
  });

  it('runs the action, then closes', async () => {
    const { host, settle } = await setup();
    host.open.set(true);
    await settle();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await settle();
    expect(host.deleted()).toBe(true);
    expect(host.open()).toBe(false);
  });
});
