import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { NdLabel } from '@ndop/primitives/label';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdInputOtp,
  NdInputOtpGroup,
  NdInputOtpInput,
  NdInputOtpSeparator,
  NdInputOtpSlot,
} from './input-otp';

const PARTS = [
  NdInputOtp,
  NdInputOtpInput,
  NdInputOtpGroup,
  NdInputOtpSlot,
  NdInputOtpSeparator,
];

const SLOTS = `
  <div ndInputOtpGroup data-testid="group">
    <div ndInputOtpSlot [index]="0"></div>
    <div ndInputOtpSlot [index]="1"></div>
    <div ndInputOtpSlot [index]="2"></div>
  </div>
  <div ndInputOtpSeparator></div>
  <div ndInputOtpGroup>
    <div ndInputOtpSlot [index]="3"></div>
  </div>
`;

function slots(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[ndInputOtpSlot]'));
}

describe('NdInputOtp', () => {
  it('is one labelled one-time-code input with hidden slots', async () => {
    await render(
      `<div ndInputOtp [length]="4">
        <label ndLabel for="code">Code</label>
        <input ndInputOtpInput id="code" />
        ${SLOTS}
      </div>`,
      { imports: [...PARTS, NdLabel] },
    );
    const input = screen.getByRole('textbox', { name: 'Code' });
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('maxlength')).toBe('4');
    expect(screen.getByTestId('group').getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(
      slots().every((slot) => slot.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
  });

  it('fills slots as allowed characters are typed, and marks the active one', async () => {
    @Component({
      imports: PARTS,
      template: `<div
        ndInputOtp
        [length]="4"
        [(value)]="code"
        (completed)="done = $event"
        data-testid="root"
      >
        <input ndInputOtpInput aria-label="Code" />

        <div ndInputOtpGroup data-testid="group">
          <div ndInputOtpSlot [index]="0"></div>
          <div ndInputOtpSlot [index]="1"></div>
          <div ndInputOtpSlot [index]="2"></div>
        </div>
        <div ndInputOtpSeparator></div>
        <div ndInputOtpGroup>
          <div ndInputOtpSlot [index]="3"></div>
        </div>
      </div>`,
    })
    class Host {
      readonly code = signal('');
      done = '';
    }
    const { fixture } = await render(Host);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await userEvent.click(input);
    expect(slots()[0]?.hasAttribute('data-caret')).toBe(true);
    await userEvent.keyboard('1a2');
    expect(fixture.componentInstance.code()).toBe('12');
    expect(input.value).toBe('12');
    expect(slots().map((slot) => slot.textContent)).toEqual(['1', '2', '', '']);
    expect(slots()[2]?.hasAttribute('data-active')).toBe(true);
    expect(slots()[1]?.hasAttribute('data-filled')).toBe(true);
    await userEvent.keyboard('{Backspace}');
    expect(fixture.componentInstance.code()).toBe('1');
    await userEvent.keyboard('234');
    expect(fixture.componentInstance.done).toBe('1234');
    expect(screen.getByTestId('root').hasAttribute('data-complete')).toBe(true);
    expect(slots()[3]?.hasAttribute('data-active')).toBe(true);
    expect(slots()[3]?.hasAttribute('data-caret')).toBe(false);
  });

  it('pastes only allowed characters, from the start', async () => {
    @Component({
      imports: PARTS,
      template: `<div
        ndInputOtp
        [length]="4"
        [(value)]="code"
        allow="[A-Z0-9]"
        inputMode="text"
      >
        <input ndInputOtpInput aria-label="Code" />

        <div ndInputOtpGroup data-testid="group">
          <div ndInputOtpSlot [index]="0"></div>
          <div ndInputOtpSlot [index]="1"></div>
          <div ndInputOtpSlot [index]="2"></div>
        </div>
        <div ndInputOtpSeparator></div>
        <div ndInputOtpGroup>
          <div ndInputOtpSlot [index]="3"></div>
        </div>
      </div>`,
    })
    class Host {
      readonly code = signal('9');
    }
    const { fixture } = await render(Host);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('inputmode')).toBe('text');
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'AB-12-CD' },
    });
    await fixture.whenStable();
    expect(fixture.componentInstance.code()).toBe('AB12');
  });

  it('binds Signal Forms and reactive forms on the root', async () => {
    @Component({
      imports: [...PARTS, FormField, ReactiveFormsModule],
      template: `
        <div ndInputOtp [length]="4" [formField]="form.code">
          <input ndInputOtpInput aria-label="A" />
        </div>
        <div ndInputOtp [length]="4" [formControl]="control">
          <input ndInputOtpInput aria-label="B" />
        </div>
      `,
    })
    class Host {
      readonly model = signal({ code: '12' });
      readonly form = form(this.model);
      readonly control = new FormControl('', Validators.required);
    }
    const { fixture } = await render(Host);
    const a = screen.getByRole('textbox', { name: 'A' }) as HTMLInputElement;
    expect(a.value).toBe('12');
    await userEvent.type(a, '3');
    expect(fixture.componentInstance.model().code).toBe('123');
    const b = screen.getByRole('textbox', { name: 'B' });
    await userEvent.click(b);
    await userEvent.tab();
    expect(b.getAttribute('aria-invalid')).toBe('true');
    fixture.componentInstance.control.disable();
    await fixture.whenStable();
    expect((b as HTMLInputElement).disabled).toBe(true);
  });
});
