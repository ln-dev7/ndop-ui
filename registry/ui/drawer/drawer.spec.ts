import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  DrawerContent,
  DrawerHandle,
  DrawerHeader,
  DrawerTitle,
} from './drawer';
import {
  NdDrawerOverlay as DrawerOverlay,
  NdDrawer as Drawer,
  NdDrawerPortal as DrawerPortal,
  NdDrawerTrigger as DrawerTrigger,
} from '@ndop/primitives/drawer';

/**
 * shadcn's classes as Ndop writes them: the primitive's `data-direction`
 * instead of vaul's attribute, and logical sides.
 */
function ndopClasses(classes: string): string | null {
  // Native ::backdrop replaces the overlay element (ADR-0032).
  if (classes.includes('fixed inset-0 z-50')) return null;
  return classes
    .replaceAll('data-[vaul-drawer-direction=', 'data-[direction=')
    .replaceAll('direction=right', 'direction=end')
    .replaceAll('direction=left', 'direction=start')
    .replaceAll(':right-0', ':end-0')
    .replaceAll(':left-0', ':start-0')
    .replaceAll(':border-l', ':border-s')
    .replaceAll(':border-r', ':border-e')
    .replaceAll('md:text-left', 'md:text-start');
}

describe('Drawer', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('drawer').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'drawer',
        registrySource('ui/drawer/drawer.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('opens at the bottom with its handle', async () => {
    const view = await render(
      `<ng-container ndDrawer>
        <button ndDrawerTrigger>Open</button>
        <ng-template ndDrawerPortal>
          <dialog ndDrawerContent>
            <div ndDrawerHandle data-testid="handle"></div>
            <div ndDrawerHeader><h2 ndDrawerTitle>Move goal</h2></div>
          </dialog>
        </ng-template>
      </ng-container>`,
      {
        imports: [
          Drawer,
          DrawerTrigger,
          DrawerPortal,
          DrawerOverlay,
          DrawerContent,
          DrawerHandle,
          DrawerHeader,
          DrawerTitle,
        ],
      },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await view.fixture.whenStable();
    const drawer = screen.getByRole('dialog', { name: 'Move goal' });
    expect(drawer.getAttribute('data-direction')).toBe('bottom');
    expect(drawer.style.getPropertyValue('--nd-drawer-drag')).toBe('0px');
    expect(screen.getByTestId('handle').getAttribute('aria-hidden')).toBe(
      'true',
    );
  });
});
