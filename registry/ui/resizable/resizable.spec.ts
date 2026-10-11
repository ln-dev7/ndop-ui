import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  ResizableHandle,
  ResizableHandleGrip,
  ResizablePanel,
  ResizablePanelGroup,
} from './resizable';

describe('Resizable', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses(
        'resizable',
        registrySource('ui/resizable/resizable.ts'),
        {
          // `aria-orientation` isn't allowed on the group, which has no role;
          // the primitive sets `data-orientation` instead.
          'flex h-full w-full aria-[orientation=vertical]:flex-col':
            'flex h-full w-full data-[orientation=vertical]:flex-col',
          // The grip icon is the user's markup; the grip styles it.
          'size-2.5': '[&>svg]:size-2.5',
          // A logical side for the horizontal handle's hit area.
          'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90':
            'relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:start-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90',
        },
      ),
    ).toEqual([]);
  });

  it('styles its parts', async () => {
    await render(
      `<div ndResizablePanelGroup orientation="vertical" data-testid="group">
        <div ndResizablePanel>Top</div>
        <div ndResizableHandle aria-label="Resize">
          <div ndResizableHandleGrip data-testid="grip"></div>
        </div>
        <div ndResizablePanel>Bottom</div>
      </div>`,
      {
        imports: [
          ResizablePanelGroup,
          ResizablePanel,
          ResizableHandle,
          ResizableHandleGrip,
        ],
      },
    );
    expect(screen.getByTestId('group').getAttribute('data-orientation')).toBe(
      'vertical',
    );
    const handle = screen.getByRole('separator', { name: 'Resize' });
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.getAttribute('data-slot')).toBe('resizable-handle');
    expect(screen.getByTestId('grip').getAttribute('aria-hidden')).toBe('true');
  });
});
