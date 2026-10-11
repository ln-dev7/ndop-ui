import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdResizableHandle,
  NdResizablePanel,
  NdResizablePanelGroup,
} from './resizable';

@Component({
  imports: [NdResizablePanelGroup, NdResizablePanel, NdResizableHandle],
  template: `
    <div [attr.dir]="dir()">
      <div
        ndResizablePanelGroup
        [orientation]="orientation()"
        [(sizes)]="sizes"
      >
        <div ndResizablePanel [defaultSize]="30" [minSize]="20" [maxSize]="60">
          One
        </div>
        <div ndResizableHandle aria-label="Resize one"></div>
        <div ndResizablePanel [minSize]="10">Two</div>
        <div ndResizableHandle aria-label="Resize two" disabled></div>
        <div ndResizablePanel [defaultSize]="20">Three</div>
      </div>
    </div>
  `,
})
class Host {
  readonly sizes = signal<readonly number[]>([]);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

async function press(
  view: Awaited<ReturnType<typeof render>>,
  key: string,
): Promise<void> {
  fireEvent.keyDown(screen.getByRole('separator', { name: 'Resize one' }), {
    key,
  });
  await view.fixture.whenStable();
}

describe('NdResizablePanelGroup', () => {
  it('lays panels out from their default sizes before any interaction', async () => {
    await render(Host);
    expect(screen.getByText('One').style.flex).toBe('30 1 0px');
    expect(screen.getByText('Two').style.flex).toBe('50 1 0px');
    expect(screen.getByText('Three').style.flex).toBe('20 1 0px');
  });

  it('describes each handle as a separator for the panel before it', async () => {
    await render(Host);
    const handle = screen.getByRole('separator', { name: 'Resize one' });
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuenow')).toBe('30');
    expect(handle.getAttribute('aria-valuemin')).toBe('20');
    expect(handle.getAttribute('aria-valuemax')).toBe('60');
    expect(handle.getAttribute('aria-controls')).toBe(
      screen.getByText('One').id,
    );
    expect(handle.getAttribute('tabindex')).toBe('0');
    const disabled = screen.getByRole('separator', { name: 'Resize two' });
    expect(disabled.hasAttribute('tabindex')).toBe(false);
    expect(disabled.getAttribute('aria-valuenow')).toBe('50');
  });

  it('moves the boundary with the arrow keys, Home and End, within bounds', async () => {
    const view = await render(Host);
    await press(view, 'ArrowRight');
    expect(view.fixture.componentInstance.sizes()).toEqual([40, 40, 20]);
    await press(view, 'ArrowLeft');
    await press(view, 'ArrowLeft');
    expect(view.fixture.componentInstance.sizes()).toEqual([20, 60, 20]);
    await press(view, 'ArrowLeft');
    expect(view.fixture.componentInstance.sizes()).toEqual([20, 60, 20]);
    await press(view, 'End');
    expect(view.fixture.componentInstance.sizes()).toEqual([60, 20, 20]);
    await press(view, 'Home');
    expect(view.fixture.componentInstance.sizes()).toEqual([20, 60, 20]);
  });

  it('mirrors the horizontal arrow keys in right-to-left layouts', async () => {
    const view = await render(Host);
    view.fixture.componentInstance.dir.set('rtl');
    await view.fixture.whenStable();
    await press(view, 'ArrowLeft');
    expect(view.fixture.componentInstance.sizes()).toEqual([40, 40, 20]);
  });

  it('uses the vertical arrow keys in a vertical group', async () => {
    const view = await render(Host);
    view.fixture.componentInstance.orientation.set('vertical');
    await view.fixture.whenStable();
    const handle = screen.getByRole('separator', { name: 'Resize one' });
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    await press(view, 'ArrowRight');
    expect(view.fixture.componentInstance.sizes()).toEqual([]);
    await press(view, 'ArrowDown');
    expect(view.fixture.componentInstance.sizes()).toEqual([40, 40, 20]);
  });
});
