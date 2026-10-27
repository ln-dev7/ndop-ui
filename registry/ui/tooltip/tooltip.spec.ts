import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { TooltipContent } from './tooltip';
import {
  NdTooltip as Tooltip,
  NdTooltipPortal as TooltipPortal,
  NdTooltipTrigger as TooltipTrigger,
} from '@ndop/primitives/tooltip';

describe('Tooltip', () => {
  afterEach(() => vi.useRealTimers());
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
    vi.useFakeTimers();
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
    // Flush Angular's zoneless render frames deterministically, as primitive
    // Tooltip tests do; this assertion concerns styles, not wall-clock timing.
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(20);
    view.fixture.detectChanges();
    // This style test needs the rendered bubble, not JSDOM's costly role/style traversal.
    const tooltip = screen.getByText('Delete permanently');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.matches(':popover-open')).toBe(true);
    expect(tooltip.getAttribute('data-slot')).toBe('tooltip-content');
    expect(tooltip.classList).toContain('bg-foreground');
  });
});
