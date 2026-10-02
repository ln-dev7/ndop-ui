import { Component, signal } from '@angular/core';
import { NdInput } from '@ndop/primitives/input';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import { NdLabel } from './label';

@Component({
  imports: [NdLabel, NdInput],
  template: `
    <label ndLabel for="email">Email <a href="/help">help</a></label>
    <input ndInput id="email" [invalid]="invalid()" [disabled]="off()" />
    <label ndLabel for="missing">Orphan</label>
  `,
})
class Host {
  readonly invalid = signal(false);
  readonly off = signal(false);
}

describe('NdLabel', () => {
  it('names its control through native label semantics', async () => {
    await render(Host);
    expect(screen.getByLabelText(/Email/)).toBe(
      document.getElementById('email'),
    );
  });

  it('mirrors the labelled input state', async () => {
    const { fixture } = await render(Host);
    const label = screen.getByText(/Email/).closest('label') as HTMLElement;
    expect(label.hasAttribute('data-invalid')).toBe(false);

    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.off.set(true);
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(label.hasAttribute('data-invalid')).toBe(true);
      expect(label.hasAttribute('data-disabled')).toBe(true);
    });
  });

  it('ignores ids no input registered', async () => {
    await render(Host);
    const orphan = screen.getByText('Orphan');
    expect(orphan.hasAttribute('data-invalid')).toBe(false);
    expect(orphan.hasAttribute('data-disabled')).toBe(false);
  });

  it('prevents text selection on double click, except on nested interactive elements', async () => {
    await render(Host);
    const label = screen.getByText(/Email/).closest('label') as HTMLElement;

    expect(fireEvent.mouseDown(label, { detail: 2 })).toBe(false);
    expect(fireEvent.mouseDown(label, { detail: 1 })).toBe(true);
    expect(fireEvent.mouseDown(screen.getByRole('link'), { detail: 2 })).toBe(
      true,
    );
  });
});
