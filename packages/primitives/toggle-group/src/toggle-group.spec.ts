import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdToggleGroup, NdToggleGroupItem } from './toggle-group';

const PARTS = [NdToggleGroup, NdToggleGroupItem];

// The CDK key manager reads `keyCode`, which user-event doesn't set.
const KEY_CODES: Record<string, number> = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Home: 36,
  End: 35,
};

async function press(key: string): Promise<void> {
  fireEvent.keyDown(document.activeElement as HTMLElement, {
    key,
    keyCode: KEY_CODES[key],
  });
  await new Promise((resolve) => setTimeout(resolve));
}

const ITEMS = `
  <button ndToggleGroupItem value="bold" aria-label="Bold"></button>
  <button ndToggleGroupItem value="italic" aria-label="Italic" disabled></button>
  <button ndToggleGroupItem value="underline" aria-label="Underline"></button>
`;

describe('NdToggleGroup', () => {
  it('presses one item at a time in single mode, and releases it again', async () => {
    @Component({
      imports: PARTS,
      template: `<div ndToggleGroup aria-label="Style" [(value)]="value">
        <button ndToggleGroupItem value="bold" aria-label="Bold"></button>
        <button
          ndToggleGroupItem
          value="italic"
          aria-label="Italic"
          disabled
        ></button>
        <button
          ndToggleGroupItem
          value="underline"
          aria-label="Underline"
        ></button>
      </div>`,
    })
    class Host {
      readonly value = signal<readonly string[]>([]);
    }
    const { fixture } = await render(Host);
    expect(screen.getByRole('group', { name: 'Style' })).toBeTruthy();
    const bold = screen.getByRole('button', { name: 'Bold' });
    const underline = screen.getByRole('button', { name: 'Underline' });
    await userEvent.click(bold);
    expect(fixture.componentInstance.value()).toEqual(['bold']);
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(underline);
    expect(fixture.componentInstance.value()).toEqual(['underline']);
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(underline);
    expect(fixture.componentInstance.value()).toEqual([]);
  });

  it('presses items independently in multiple mode', async () => {
    await render(
      `<div ndToggleGroup type="multiple" aria-label="Style" [defaultValue]="['bold']">${ITEMS}</div>`,
      { imports: PARTS },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Underline' }));
    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-pressed')),
    ).toEqual(['true', 'false', 'true']);
  });

  it('roves focus with arrows, Home and End, without pressing', async () => {
    await render(
      `<div ndToggleGroup aria-label="Style" [defaultValue]="['underline']">${ITEMS}</div>`,
      { imports: PARTS },
    );
    const [bold, , underline] = screen.getAllByRole('button') as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    expect(underline.getAttribute('tabindex')).toBe('0');
    expect(bold.getAttribute('tabindex')).toBe('-1');
    underline.focus();
    await press('ArrowRight');
    expect(document.activeElement).toBe(bold);
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    expect(bold.getAttribute('tabindex')).toBe('0');
    await press('ArrowRight');
    expect(document.activeElement).toBe(underline);
    await press('Home');
    expect(document.activeElement).toBe(bold);
    await press('End');
    expect(document.activeElement).toBe(underline);
    await press('ArrowDown');
    expect(document.activeElement).toBe(underline);
  });

  it('uses up and down arrows when vertical', async () => {
    await render(
      `<div ndToggleGroup orientation="vertical" aria-label="Style">${ITEMS}</div>`,
      { imports: PARTS },
    );
    const bold = screen.getByRole('button', { name: 'Bold' });
    bold.focus();
    await press('ArrowDown');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Underline' }),
    );
  });

  it('binds reactive forms', async () => {
    @Component({
      imports: [...PARTS, ReactiveFormsModule],
      template: `<div
        ndToggleGroup
        type="multiple"
        aria-label="Style"
        [formControl]="style"
      >
        <button ndToggleGroupItem value="bold" aria-label="Bold"></button>
        <button
          ndToggleGroupItem
          value="italic"
          aria-label="Italic"
          disabled
        ></button>
        <button
          ndToggleGroupItem
          value="underline"
          aria-label="Underline"
        ></button>
      </div>`,
    })
    class Host {
      readonly style = new FormControl<readonly string[]>(['bold']);
    }
    const { fixture } = await render(Host);
    await userEvent.click(screen.getByRole('button', { name: 'Underline' }));
    expect(fixture.componentInstance.style.value).toEqual([
      'bold',
      'underline',
    ]);
    fixture.componentInstance.style.disable();
    await fixture.whenStable();
    expect(
      (screen.getByRole('button', { name: 'Bold' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
