import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Toaster,
  ToasterOutlet,
  Toast,
  ToastClose,
  ToastContent,
  ToastList,
  ToastRegion,
  ToastTitle,
} from './toast';

@Component({
  imports: [
    ToasterOutlet,
    ToastRegion,
    ToastList,
    Toast,
    ToastContent,
    ToastTitle,
    ToastClose,
  ],
  template: `
    <ng-template ndToaster>
      <section ndToastRegion>
        <ol ndToastList>
          @for (toast of toaster.toasts(); track toast.id) {
            <li [ndToast]="toast" [attr.data-testid]="toast.id">
              <div ndToastContent>
                <p ndToastTitle>{{ toast.title }}</p>
              </div>
              <button ndToastClose aria-label="Close">×</button>
            </li>
          }
        </ol>
      </section>
    </ng-template>
  `,
})
class Host {
  readonly toaster = inject(Toaster);
}

describe('Toast', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses('sonner', registrySource('ui/toast/toast.ts'), {
        // Sonner's icons are the user's markup, in the examples.
        'size-4 animate-spin': null,
      }),
    ).toEqual([]);
  });

  it('stacks toasts, hiding all but the newest three until it spreads out', async () => {
    const view = await render(Host);
    await view.fixture.whenStable();
    const toaster = TestBed.inject(Toaster);
    for (const id of ['a', 'b', 'c', 'd']) {
      toaster.show({ title: id, id, duration: Infinity });
    }
    await view.fixture.whenStable();
    expect(screen.getByRole('region').getAttribute('data-slot')).toBe(
      'toaster',
    );
    expect(screen.getByTestId('d').classList).not.toContain('opacity-0');
    expect(screen.getByTestId('a').classList).toContain('opacity-0');
  });
});
