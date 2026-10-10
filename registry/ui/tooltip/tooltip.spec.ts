import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Tooltip,
  TooltipPortal,
  TooltipTrigger,
  TooltipContent,
} from './tooltip';

describe('Tooltip', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses('tooltip', registrySource('ui/tooltip/tooltip.ts'), {
        'origin-(--radix-tooltip-content-transform-origin) ': '',
        'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2':
          'data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2',
        'z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45': null,
      }),
    ).toEqual([]);
  });

  it('styles the tooltip bubble', async () => {
    const view = await render(
      `<ng-container ndTooltip defaultOpen>
        <button ndTooltipTrigger>Delete</button>
        <ng-template ndTooltipPortal>
          <div ndTooltipContent>Delete permanently</div>
        </ng-template>
      </ng-container>`,
      {
        imports: [Tooltip, TooltipTrigger, TooltipPortal, TooltipContent],
      },
    );
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.getAttribute('data-slot')).toBe('tooltip-content');
    expect(tooltip.classList).toContain('bg-foreground');
  });
});
