import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdToast,
  NdToastAction,
  NdToastClose,
  NdToastDescription,
  NdToaster,
  NdToasterOutlet,
  NdToastRegion,
  NdToastTitle,
} from './toast';

@Component({
  imports: [
    NdToasterOutlet,
    NdToastRegion,
    NdToast,
    NdToastTitle,
    NdToastDescription,
    NdToastAction,
    NdToastClose,
  ],
  template: `
    <button>Page</button>
    <ng-template ndToaster>
      <section ndToastRegion data-testid="region">
        <ol>
          @for (toast of toaster.toasts(); track toast.id) {
            <li [ndToast]="toast" [attr.data-testid]="toast.id">
              <p ndToastTitle>{{ toast.title }}</p>
              @if (toast.action; as action) {
                <button ndToastAction>{{ action.label }}</button>
              }
              <button ndToastClose aria-label="Close">×</button>
            </li>
          }
        </ol>
      </section>
    </ng-template>
  `,
})
class Host {
  readonly toaster = inject(NdToaster);
}

async function setup() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  const view = await render(Host);
  const settle = async () => {
    await vi.advanceTimersByTimeAsync(0);
    await view.fixture.whenStable();
  };
  await settle();
  return { toaster: TestBed.inject(NdToaster), settle };
}

describe('toast', () => {
  afterEach(() => vi.useRealTimers());

  it('renders a labelled polite region in an overlay', async () => {
    await setup();
    const region = screen.getByRole('region', { name: 'Notifications (F8)' });
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.closest('.cdk-overlay-container')).not.toBeNull();
  });

  it('shows toasts newest first and dismisses them after their duration', async () => {
    const { toaster, settle } = await setup();
    toaster.show({ title: 'First', id: 'a' });
    toaster.show({ title: 'Second', id: 'b', type: 'success' });
    await settle();
    const second = screen.getByTestId('b');
    expect(second.getAttribute('data-index')).toBe('0');
    expect(second.hasAttribute('data-front')).toBe(true);
    expect(second.getAttribute('data-type')).toBe('success');
    expect(second.getAttribute('aria-atomic')).toBe('true');
    await vi.advanceTimersByTimeAsync(4000);
    await settle();
    expect(toaster.toasts()).toEqual([]);
  });

  it('pauses while hovered', async () => {
    const { toaster, settle } = await setup();
    toaster.show({ title: 'Saved', duration: 1000 });
    await settle();
    fireEvent.pointerEnter(screen.getByTestId('region'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(toaster.toasts().length).toBe(1);
    fireEvent.pointerLeave(screen.getByTestId('region'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(toaster.toasts().length).toBe(0);
  });

  it('runs its action, closes, and focuses the region on F8', async () => {
    const { toaster, settle } = await setup();
    const undo = vi.fn();
    toaster.show({
      title: 'Deleted',
      id: 'd',
      duration: Infinity,
      action: { label: 'Undo', onClick: undo },
    });
    await settle();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await settle();
    expect(undo).toHaveBeenCalled();
    expect(toaster.toasts()).toEqual([]);

    toaster.show({ title: 'Saved', id: 's', duration: Infinity });
    await settle();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await settle();
    expect(toaster.toasts()).toEqual([]);

    fireEvent.keyDown(document, { key: 'F8' });
    expect(document.activeElement).toBe(screen.getByTestId('region'));
  });

  it('dismisses on Escape inside it', async () => {
    const { toaster, settle } = await setup();
    toaster.show({ title: 'Saved', id: 'e', duration: Infinity });
    await settle();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close' }), {
      key: 'Escape',
    });
    await settle();
    expect(toaster.toasts()).toEqual([]);
  });
});
