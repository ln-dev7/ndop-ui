import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdToggle } from './toggle';

describe('NdToggle', () => {
  it('is a toggle button that flips on click, Space and Enter', async () => {
    await render(`<button ndToggle aria-label="Bold">B</button>`, {
      imports: [NdToggle],
    });
    const toggle = screen.getByRole('button', { name: 'Bold' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('data-state')).toBe('off');
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('data-state')).toBe('on');
    await userEvent.keyboard(' ');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await userEvent.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });

  it('starts from defaultPressed, follows [(pressed)] and stays put while disabled', async () => {
    @Component({
      imports: [NdToggle],
      template: `
        <button ndToggle defaultPressed disabled aria-label="A"></button>
        <button ndToggle [(pressed)]="pressed" aria-label="B"></button>
      `,
    })
    class Host {
      readonly pressed = signal(false);
    }
    const { fixture } = await render(Host);
    const a = screen.getByRole('button', { name: 'A' });
    expect(a.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(a);
    expect(a.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(fixture.componentInstance.pressed()).toBe(true);
  });

  it('binds reactive forms', async () => {
    @Component({
      imports: [NdToggle, ReactiveFormsModule],
      template: `<button
        ndToggle
        aria-label="Bold"
        [formControl]="bold"
      ></button>`,
    })
    class Host {
      readonly bold = new FormControl(true);
    }
    const { fixture } = await render(Host);
    const toggle = screen.getByRole('button');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(toggle);
    expect(fixture.componentInstance.bold.value).toBe(false);
  });
});
