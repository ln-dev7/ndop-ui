import { Component, signal } from '@angular/core';
import { email, form, FormField } from '@angular/forms/signals';
import { NdInput } from '@ndop/primitives/input';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdField, NdFieldDescription, NdFieldError } from './form-field';

const PARTS = [NdField, NdFieldDescription, NdFieldError];

describe('NdField', () => {
  it('describes its control, and shows the error once the field is invalid and touched', async () => {
    @Component({
      imports: [...PARTS, NdInput, FormField],
      template: `<div ndField data-testid="field">
        <input ndInput aria-label="Email" [formField]="form.email" />
        <p ndFieldDescription>We never share it.</p>
        <p ndFieldError data-testid="error">Enter a valid email address.</p>
      </div>`,
    })
    class Host {
      readonly model = signal({ email: 'nope' });
      readonly form = form(this.model, (path) => email(path.email));
    }
    await render(Host);
    const input = screen.getByRole('textbox');
    const description = screen.getByText('We never share it.');
    const error = screen.getByTestId('error');
    const field = screen.getByRole('group');
    expect(description.id).toMatch(/^nd-field-description-/);
    expect(input.getAttribute('aria-describedby')).toBe(description.id);
    expect(error.hidden).toBe(true);
    expect(error.getAttribute('role')).toBe('alert');
    expect(field.hasAttribute('data-invalid')).toBe(false);

    await userEvent.click(input);
    await userEvent.tab();
    expect(error.hidden).toBe(false);
    expect(field.hasAttribute('data-invalid')).toBe(true);
    expect(input.getAttribute('aria-describedby')).toBe(
      `${description.id} ${error.id}`,
    );
  });

  it('is invalid by hand, and disabled when its control is', async () => {
    await render(
      `<div ndField invalid data-testid="field">
        <input ndInput aria-label="Name" disabled />
        <p ndFieldError id="error">Taken.</p>
      </div>`,
      { imports: [...PARTS, NdInput] },
    );
    const field = screen.getByTestId('field');
    expect(field.hasAttribute('data-invalid')).toBe(true);
    await vi.waitFor(() =>
      expect(field.hasAttribute('data-disabled')).toBe(true),
    );
    expect(screen.getByText('Taken.').hidden).toBe(false);
    expect(screen.getByRole('textbox').getAttribute('aria-describedby')).toBe(
      'error',
    );
  });
});
