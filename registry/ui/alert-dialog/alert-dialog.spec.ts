import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialog,
  AlertDialogPortal,
  AlertDialogTrigger,
} from './alert-dialog';

describe('AlertDialog', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses(
        'alert-dialog',
        registrySource('ui/alert-dialog/alert-dialog.ts'),
        {
          'alert-dialog-content:text-left': 'alert-dialog-content:text-start',
        },
      ),
    ).toEqual([]);
  });

  it('opens a styled alertdialog with button-styled actions', async () => {
    const view = await render(
      `<ng-container ndAlertDialog>
        <button ndAlertDialogTrigger>Delete</button>
        <ng-template ndAlertDialogPortal>
          <div ndAlertDialogOverlay></div>
          <div ndAlertDialogContent size="sm">
            <div ndAlertDialogHeader>
              <h2 ndAlertDialogTitle>Delete project?</h2>
              <p ndAlertDialogDescription>This can't be undone.</p>
            </div>
            <div ndAlertDialogFooter>
              <button ndAlertDialogCancel>Cancel</button>
              <button ndAlertDialogAction variant="destructive">Delete it</button>
            </div>
          </div>
        </ng-template>
      </ng-container>`,
      {
        imports: [
          AlertDialog,
          AlertDialogTrigger,
          AlertDialogPortal,
          AlertDialogOverlay,
          AlertDialogContent,
          AlertDialogHeader,
          AlertDialogTitle,
          AlertDialogDescription,
          AlertDialogFooter,
          AlertDialogCancel,
          AlertDialogAction,
        ],
      },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await view.fixture.whenStable();
    const dialog = screen.getByRole('alertdialog', { name: 'Delete project?' });
    expect(dialog.getAttribute('data-size')).toBe('sm');
    expect(screen.getByRole('button', { name: 'Cancel' }).classList).toContain(
      'border',
    );
    expect(
      screen.getByRole('button', { name: 'Delete it' }).classList,
    ).toContain('bg-destructive');
  });
});
