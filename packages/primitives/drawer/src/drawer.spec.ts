import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdDrawer,
  NdDrawerClose,
  NdDrawerContent,
  NdDrawerHandle,
  NdDrawerOverlay,
  NdDrawerPortal,
  NdDrawerTitle,
  NdDrawerTrigger,
} from './drawer';

@Component({
  imports: [
    NdDrawer,
    NdDrawerTrigger,
    NdDrawerPortal,
    NdDrawerOverlay,
    NdDrawerContent,
    NdDrawerHandle,
    NdDrawerTitle,
    NdDrawerClose,
  ],
  template: `
    <ng-container ndDrawer [(open)]="open">
      <button ndDrawerTrigger>Open</button>
      <ng-template ndDrawerPortal>
        <div ndDrawerOverlay data-testid="overlay"></div>
        <div ndDrawerContent data-testid="content" [direction]="direction()">
          <div ndDrawerHandle data-testid="handle"></div>
          <h2 ndDrawerTitle>Move goal</h2>
          <input aria-label="Goal" />
          <button ndDrawerClose>Done</button>
        </div>
      </ng-template>
    </ng-container>
  `,
})
class Host {
  readonly open = signal(false);
  readonly direction = signal<'bottom' | 'end'>('bottom');
}

async function setup() {
  const view = await render(Host);
  const settle = async () => {
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
  };
  await settle();
  const host = view.fixture.componentInstance;
  host.open.set(true);
  await settle();
  const content = screen.getByTestId('content');
  content.getBoundingClientRect = () =>
    ({ width: 400, height: 400 }) as DOMRect;
  content.setPointerCapture = () => undefined;
  content.hasPointerCapture = () => true;
  content.releasePointerCapture = () => undefined;
  return { host, settle, content };
}

function pointer(
  element: Element,
  type: string,
  init: { clientX?: number; clientY?: number; timeStamp?: number },
) {
  const event = new MouseEvent(type, { bubbles: true, button: 0, ...init });
  if (init.timeStamp !== undefined) {
    Object.defineProperty(event, 'timeStamp', { value: init.timeStamp });
  }
  fireEvent(element, event);
}

describe('NdDrawer', () => {
  it('is a labelled modal dialog with a hidden handle', async () => {
    const { content } = await setup();
    const dialog = screen.getByRole('dialog', { name: 'Move goal' });
    expect(dialog).toBe(content);
    expect(dialog.getAttribute('data-direction')).toBe('bottom');
    expect(screen.getByTestId('handle').getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('follows a drag toward its edge and closes past a quarter', async () => {
    const { host, settle, content } = await setup();
    pointer(content, 'pointerdown', { clientY: 100, timeStamp: 0 });
    pointer(content, 'pointermove', { clientY: 150, timeStamp: 500 });
    await settle();
    expect(content.hasAttribute('data-dragging')).toBe(true);
    expect(content.style.getPropertyValue('--nd-drawer-drag')).toBe('50px');
    pointer(content, 'pointerup', { clientY: 150, timeStamp: 1000 });
    await settle();
    expect(host.open()).toBe(true);
    expect(content.style.getPropertyValue('--nd-drawer-drag')).toBe('0px');

    pointer(content, 'pointerdown', { clientY: 100, timeStamp: 0 });
    pointer(content, 'pointermove', { clientY: 250, timeStamp: 1000 });
    pointer(content, 'pointerup', { clientY: 250, timeStamp: 2000 });
    await settle();
    expect(host.open()).toBe(false);
  });

  it('closes on a quick flick, and ignores drags away from the edge or on fields', async () => {
    const { host, settle, content } = await setup();
    pointer(content, 'pointerdown', { clientY: 100, timeStamp: 0 });
    pointer(content, 'pointermove', { clientY: 50, timeStamp: 10 });
    await settle();
    expect(content.style.getPropertyValue('--nd-drawer-drag')).toBe('0px');
    pointer(content, 'pointerup', { clientY: 50, timeStamp: 20 });

    const field = screen.getByRole('textbox', { name: 'Goal' });
    pointer(field, 'pointerdown', { clientY: 100, timeStamp: 0 });
    pointer(field, 'pointermove', { clientY: 300, timeStamp: 10 });
    pointer(field, 'pointerup', { clientY: 300, timeStamp: 20 });
    await settle();
    expect(host.open()).toBe(true);

    pointer(content, 'pointerdown', { clientY: 100, timeStamp: 0 });
    pointer(content, 'pointermove', { clientY: 160, timeStamp: 50 });
    pointer(content, 'pointerup', { clientY: 160, timeStamp: 60 });
    await settle();
    expect(host.open()).toBe(false);
  });

  it('closes with its close button', async () => {
    const { host, settle } = await setup();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await settle();
    expect(host.open()).toBe(false);
  });
});
