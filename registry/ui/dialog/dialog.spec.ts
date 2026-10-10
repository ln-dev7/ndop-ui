import { provideNdopIcons } from '@ndop/core';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdIcon } from '@ndop/core';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  Dialog,
  DialogClose,
  DialogPortal,
  DialogTrigger,
} from './dialog';

describe('Dialog', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('dialog', registrySource('ui/dialog/dialog.ts'), {
        'top-4 right-4': 'top-4 end-4',
        'sm:text-left': 'sm:text-start',
      }),
    ).toEqual([]);
  });

  it('styles every part when open', async () => {
    const view = await render(
      `<ng-container ndDialog>
        <button ndDialogTrigger>Open</button>
        <ng-template ndDialogPortal>
          <div ndDialogOverlay data-testid="overlay"></div>
          <div ndDialogContent>
            <div ndDialogHeader data-testid="header">
              <h2 ndDialogTitle>Edit profile</h2>
              <p ndDialogDescription>Saved on close.</p>
            </div>
            <div ndDialogFooter data-testid="footer"><button ndDialogClose>Done</button></div>
            <button ndDialogCloseButton><svg ndIcon="x"></svg><span class="sr-only">Close</span></button>
          </div>
        </ng-template>
      </ng-container>`,
      {
        imports: [
          Dialog,
          DialogTrigger,
          DialogPortal,
          DialogClose,
          NdIcon,
          DialogOverlay,
          DialogContent,
          DialogHeader,
          DialogFooter,
          DialogTitle,
          DialogDescription,
          DialogCloseButton,
        ],
        providers: [
          provideNdopIcons({ x: { node: [['path', { d: 'M18 6 6 18' }]] } }),
        ],
      },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await view.fixture.whenStable();

    const dialog = screen.getByRole('dialog', { name: 'Edit profile' });
    expect(dialog.getAttribute('data-slot')).toBe('dialog-content');
    expect(dialog.classList).toContain('sm:max-w-lg');
    expect(screen.getByTestId('overlay').classList).toContain('bg-black/50');
    expect(screen.getByTestId('header').classList).toContain('sm:text-start');
    expect(screen.getByTestId('footer').classList).toContain('sm:justify-end');
    expect(screen.getByText('Edit profile').classList).toContain(
      'font-semibold',
    );
    expect(screen.getByText('Saved on close.').classList).toContain(
      'text-muted-foreground',
    );

    const close = screen.getByRole('button', { name: 'Close' });
    expect(close.getAttribute('type')).toBe('button');
    expect(close.classList).toContain('absolute');
    expect(close.querySelector('path')).not.toBeNull();
    await userEvent.click(close);
    await view.fixture.whenStable();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
