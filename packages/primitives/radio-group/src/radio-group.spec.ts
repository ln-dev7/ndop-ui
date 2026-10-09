import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdRadioGroup,
  NdRadioGroupIndicator,
  NdRadioGroupItem,
} from './radio-group';

const PARTS = [NdRadioGroup, NdRadioGroupItem, NdRadioGroupIndicator];

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

const GROUP = `
  <button ndRadioGroupItem value="free" aria-label="Free">
    <span ndRadioGroupIndicator data-testid="free-dot"></span>
  </button>
  <button ndRadioGroupItem value="pro" aria-label="Pro"></button>
  <button ndRadioGroupItem value="team" aria-label="Team" [disabled]="true"></button>
  <button ndRadioGroupItem value="enterprise" aria-label="Enterprise"></button>
`;

describe('NdRadioGroup', () => {
  it('is a radiogroup with the first enabled radio as tab stop', async () => {
    await render(`<div ndRadioGroup aria-label="Plan">${GROUP}</div>`, {
      imports: PARTS,
    });
    const group = screen.getByRole('radiogroup', { name: 'Plan' });
    expect(group.getAttribute('aria-orientation')).toBe('vertical');
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
    ]);
    expect(
      radios.every((radio) => radio.getAttribute('aria-checked') === 'false'),
    ).toBe(true);
    expect(screen.getByTestId('free-dot').hidden).toBe(true);
  });

  it('checks on click and makes the checked radio the tab stop', async () => {
    @Component({
      imports: PARTS,
      template: `<div ndRadioGroup aria-label="Plan" [(value)]="plan">
        <button ndRadioGroupItem value="free" aria-label="Free">
          <span ndRadioGroupIndicator data-testid="free-dot"></span>
        </button>
        <button ndRadioGroupItem value="pro" aria-label="Pro"></button>
        <button
          ndRadioGroupItem
          value="team"
          aria-label="Team"
          [disabled]="true"
        ></button>
        <button
          ndRadioGroupItem
          value="enterprise"
          aria-label="Enterprise"
        ></button>
      </div>`,
    })
    class Host {
      readonly plan = signal<string | null>('pro');
    }
    const { fixture } = await render(Host);
    const pro = screen.getByRole('radio', { name: 'Pro' });
    expect(pro.getAttribute('aria-checked')).toBe('true');
    expect(pro.getAttribute('tabindex')).toBe('0');
    await userEvent.click(screen.getByRole('radio', { name: 'Free' }));
    expect(fixture.componentInstance.plan()).toBe('free');
    expect(screen.getByTestId('free-dot').hidden).toBe(false);
  });

  it('moves focus and selection with arrows, skipping disabled radios and wrapping', async () => {
    await render(
      `<div ndRadioGroup aria-label="Plan" defaultValue="pro">${GROUP}</div>`,
      { imports: PARTS },
    );
    const pro = screen.getByRole('radio', { name: 'Pro' });
    pro.focus();
    await press('ArrowDown');
    const enterprise = screen.getByRole('radio', { name: 'Enterprise' });
    expect(document.activeElement).toBe(enterprise);
    expect(enterprise.getAttribute('aria-checked')).toBe('true');
    await press('ArrowRight');
    expect(
      screen.getByRole('radio', { name: 'Free' }).getAttribute('aria-checked'),
    ).toBe('true');
    await press('ArrowUp');
    expect(enterprise.getAttribute('aria-checked')).toBe('true');
    await userEvent.keyboard('{Enter}');
    expect(enterprise.getAttribute('aria-checked')).toBe('true');
  });

  it('reverses horizontal arrows in right-to-left layouts', async () => {
    await render(
      `<div dir="rtl" ndRadioGroup aria-label="Plan" defaultValue="free">${GROUP}</div>`,
      { imports: PARTS },
    );
    screen.getByRole('radio', { name: 'Free' }).focus();
    await press('ArrowLeft');
    expect(
      screen.getByRole('radio', { name: 'Pro' }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('disables every radio while disabled', async () => {
    await render(
      `<div ndRadioGroup disabled aria-label="Plan">${GROUP}</div>`,
      { imports: PARTS },
    );
    expect(screen.getByRole('radiogroup').getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(
      screen
        .getAllByRole('radio')
        .every((radio) => (radio as HTMLButtonElement).disabled),
    ).toBe(true);
  });

  it('binds Signal Forms and reactive forms, touched when focus leaves', async () => {
    @Component({
      imports: [...PARTS, FormField, ReactiveFormsModule],
      template: `
        <div ndRadioGroup aria-label="A" [formField]="form.plan">
          <button ndRadioGroupItem value="free" aria-label="Free">
            <span ndRadioGroupIndicator data-testid="free-dot"></span>
          </button>
          <button ndRadioGroupItem value="pro" aria-label="Pro"></button>
          <button
            ndRadioGroupItem
            value="team"
            aria-label="Team"
            [disabled]="true"
          ></button>
          <button
            ndRadioGroupItem
            value="enterprise"
            aria-label="Enterprise"
          ></button>
        </div>
        <div ndRadioGroup aria-label="B" [formControl]="control">
          <button ndRadioGroupItem value="x" aria-label="X"></button>
          <button ndRadioGroupItem value="y" aria-label="Y"></button>
        </div>
      `,
    })
    class Host {
      readonly model = signal({ plan: 'enterprise' as string | null });
      readonly form = form(this.model);
      readonly control = new FormControl<string | null>(
        null,
        Validators.required,
      );
    }
    const { fixture } = await render(Host);
    expect(
      screen
        .getByRole('radio', { name: 'Enterprise' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    await userEvent.click(screen.getByRole('radio', { name: 'Free' }));
    expect(fixture.componentInstance.model().plan).toBe('free');

    const x = screen.getByRole('radio', { name: 'X' });
    x.focus();
    await press('ArrowDown');
    expect(fixture.componentInstance.control.touched).toBe(false);
    expect(fixture.componentInstance.control.value).toBe('y');
    await userEvent.tab();
    expect(fixture.componentInstance.control.touched).toBe(true);
  });
});
