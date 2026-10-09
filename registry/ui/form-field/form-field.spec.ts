import { Component, signal } from '@angular/core';
import { email, form, FormField } from '@angular/forms/signals';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { Input } from '@/ui/input/input';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Field, FieldDescription, FieldError, FieldLabel } from './form-field';

describe('Field', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'field',
        registrySource('ui/form-field/form-field.ts'),
        {
          // The primitive sets presence attributes, not "true".
          'data-[invalid=true]:text-destructive':
            'data-invalid:text-destructive',
          'group-data-[disabled=true]/field:opacity-50':
            'group-data-disabled/field:opacity-50',
          // Error lists are the user's markup, in the examples.
          'ml-4 flex list-disc flex-col gap-1': null,
          // The separator's line is its ::before, since a directive can't
          // add elements.
          'absolute inset-0 top-1/2': null,
        },
      ),
    ).toEqual([]);
  });

  it('turns destructive and shows its error once the control is invalid', async () => {
    @Component({
      imports: [
        Field,
        FieldLabel,
        FieldDescription,
        FieldError,
        Input,
        FormField,
      ],
      template: `<div ndField data-testid="field">
        <label ndFieldLabel for="email">Email</label>
        <input ndInput id="email" [formField]="account.email" />
        <p ndFieldDescription>We'll never share it.</p>
        <div ndFieldError>Enter a valid email address.</div>
      </div>`,
    })
    class Host {
      readonly model = signal({ email: 'nope' });
      readonly account = form(this.model, (path) => email(path.email));
    }
    await render(Host);
    const field = screen.getByTestId('field');
    expect(field.getAttribute('data-orientation')).toBe('vertical');
    const input = screen.getByRole('textbox', { name: 'Email' });
    await userEvent.click(input);
    await userEvent.tab();
    expect(field.hasAttribute('data-invalid')).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('valid email');
  });
});
