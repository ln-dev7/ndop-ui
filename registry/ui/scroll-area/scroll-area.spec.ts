import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { ScrollArea } from './scroll-area';

describe('ScrollArea', () => {
  it('matches shadcn new-york-v4 classes, but for the scrollbar', () => {
    expect(
      missingShadcnClasses(
        'scroll-area',
        registrySource('ui/scroll-area/scroll-area.ts'),
        // Native scrolling: the scrollbar is the browser's, themed with
        // scrollbar-color, so Radix's scrollbar and thumb parts are gone.
        {
          'flex touch-none p-px transition-colors select-none': null,
          'h-full w-2.5 border-l border-l-transparent': null,
          'h-2.5 flex-col border-t border-t-transparent': null,
          'relative flex-1 rounded-full bg-border': null,
        },
      ),
    ).toEqual([]);
  });

  it('can take focus and scrolls the chosen way', async () => {
    await render(
      `<div ndScrollArea aria-label="Tags" data-testid="v"></div>
       <div ndScrollArea orientation="horizontal" data-testid="h"></div>`,
      { imports: [ScrollArea] },
    );
    const vertical = screen.getByTestId('v');
    expect(vertical.getAttribute('tabindex')).toBe('0');
    expect(vertical.classList).toContain('overflow-y-auto');
    expect(screen.getByTestId('h').classList).toContain('overflow-x-auto');
  });
});
