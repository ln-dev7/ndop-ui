import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Sheet,
  SheetCloseButton,
  SheetContent,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from './sheet';

describe('Sheet', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses('sheet', registrySource('ui/sheet/sheet.ts'), {
        // Logical sides: shadcn's right and left become end and start.
        'inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm':
          'inset-y-0 end-0 h-full w-3/4 border-s data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end sm:max-w-sm',
        'inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm':
          'inset-y-0 start-0 h-full w-3/4 border-e data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start sm:max-w-sm',
        'top-4 right-4': 'top-4 end-4',
        // The close button's icon and name are the user's markup.
        'sr-only': null,
      }),
    ).toEqual([]);
  });

  it('slides in from its side, labelled by its title', async () => {
    const view = await render(
      `<ng-container ndSheet>
        <button ndSheetTrigger>Open</button>
        <ng-template ndSheetPortal>
          <div ndSheetOverlay></div>
          <div ndSheetContent side="start">
            <h2 ndSheetTitle>Filters</h2>
            <button ndSheetCloseButton aria-label="Close">×</button>
          </div>
        </ng-template>
      </ng-container>`,
      {
        imports: [
          Sheet,
          SheetTrigger,
          SheetPortal,
          SheetOverlay,
          SheetContent,
          SheetTitle,
          SheetCloseButton,
        ],
      },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await view.fixture.whenStable();
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(sheet.getAttribute('data-side')).toBe('start');
    expect(sheet.classList).toContain('start-0');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
