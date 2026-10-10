import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Popover,
  PopoverPortal,
  PopoverTrigger,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from './popover';

describe('Popover', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses('popover', registrySource('ui/popover/popover.ts'), {
        'origin-(--radix-popover-content-transform-origin) ': '',
        'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2':
          'data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2',
      }),
    ).toEqual([]);
  });

  it('styles the content and its header parts', async () => {
    const view = await render(
      `<ng-container ndPopover>
        <button ndPopoverTrigger>Filters</button>
        <ng-template ndPopoverPortal>
          <div ndPopoverContent align="start" aria-labelledby="t">
            <div ndPopoverHeader data-testid="header">
              <h2 ndPopoverTitle id="t">Filters</h2>
              <p ndPopoverDescription>Narrow results.</p>
            </div>
          </div>
        </ng-template>
      </ng-container>`,
      {
        imports: [
          Popover,
          PopoverTrigger,
          PopoverPortal,
          PopoverContent,
          PopoverHeader,
          PopoverTitle,
          PopoverDescription,
        ],
      },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await view.fixture.whenStable();

    const content = screen.getByRole('dialog', { name: 'Filters' });
    expect(content.getAttribute('data-slot')).toBe('popover-content');
    expect(content.classList).toContain('w-72');
    expect(content.getAttribute('data-align')).toBe('start');
    expect(screen.getByTestId('header').classList).toContain('gap-1');
    expect(screen.getByText('Narrow results.').classList).toContain(
      'text-muted-foreground',
    );
  });
});
