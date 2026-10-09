import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdSwitch, NdSwitchThumb } from './switch';

const PARTS = [NdSwitch, NdSwitchThumb];

describe('NdSwitch', () => {
  it('is an off switch whose thumb follows its state', async () => {
    await render(
      `<button ndSwitch aria-label="Wi-Fi">
        <span ndSwitchThumb data-testid="thumb"></span>
      </button>`,
      { imports: PARTS },
    );
    const control = screen.getByRole('switch', { name: 'Wi-Fi' });
    expect(control.getAttribute('aria-checked')).toBe('false');
    expect(control.getAttribute('type')).toBe('button');
    await userEvent.click(control);
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('thumb').getAttribute('data-state')).toBe(
      'checked',
    );
  });

  it('toggles on Space and Enter', async () => {
    await render(`<button ndSwitch aria-label="Wi-Fi"></button>`, {
      imports: PARTS,
    });
    const control = screen.getByRole('switch');
    control.focus();
    await userEvent.keyboard(' ');
    expect(control.getAttribute('aria-checked')).toBe('true');
    await userEvent.keyboard('{Enter}');
    expect(control.getAttribute('aria-checked')).toBe('false');
  });

  it('starts from defaultChecked, and ignores clicks while disabled', async () => {
    await render(
      `<button ndSwitch defaultChecked disabled aria-label="Wi-Fi"></button>`,
      { imports: PARTS },
    );
    const control = screen.getByRole('switch');
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(control.hasAttribute('data-disabled')).toBe(true);
    await userEvent.click(control);
    expect(control.getAttribute('aria-checked')).toBe('true');
  });

  it('binds Signal Forms and reactive forms', async () => {
    @Component({
      imports: [...PARTS, FormField, ReactiveFormsModule],
      template: `
        <button ndSwitch aria-label="A" [formField]="form.on"></button>
        <button ndSwitch aria-label="B" [formControl]="control"></button>
      `,
    })
    class Host {
      readonly model = signal({ on: true });
      readonly form = form(this.model);
      readonly control = new FormControl(false);
    }
    const { fixture } = await render(Host);
    const a = screen.getByRole('switch', { name: 'A' });
    expect(a.getAttribute('aria-checked')).toBe('true');
    await userEvent.click(a);
    expect(fixture.componentInstance.model().on).toBe(false);
    await userEvent.click(screen.getByRole('switch', { name: 'B' }));
    expect(fixture.componentInstance.control.value).toBe(true);
  });
});
