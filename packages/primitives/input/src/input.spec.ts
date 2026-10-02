import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { disabled, form, FormField, required } from '@angular/forms/signals';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdInput } from './input';

describe('NdInput', () => {
  describe('without a forms library', () => {
    @Component({
      imports: [NdInput],
      template: `<input
        ndInput
        aria-label="Name"
        [invalid]="invalid()"
        [disabled]="off()"
      />`,
    })
    class Host {
      readonly invalid = signal(false);
      readonly off = signal(false);
    }

    it('reflects the invalid input', async () => {
      const { fixture } = await render(Host);
      const element = screen.getByRole('textbox');
      expect(element.hasAttribute('aria-invalid')).toBe(false);

      fixture.componentInstance.invalid.set(true);
      await fixture.whenStable();
      expect(element.getAttribute('aria-invalid')).toBe('true');
      expect(element.hasAttribute('data-invalid')).toBe(true);
    });

    it('reflects a native disabled binding', async () => {
      const { fixture } = await render(Host);
      const element = screen.getByRole('textbox');
      expect(element.hasAttribute('data-disabled')).toBe(false);

      fixture.componentInstance.off.set(true);
      await fixture.whenStable();
      await vi.waitFor(() =>
        expect(element.hasAttribute('data-disabled')).toBe(true),
      );
    });
  });

  describe('with reactive forms', () => {
    @Component({
      imports: [NdInput, ReactiveFormsModule],
      template: `<input ndInput aria-label="Email" [formControl]="email" />`,
    })
    class Host {
      readonly email = new FormControl('', Validators.required);
    }

    it('shows invalid only once the field is touched', async () => {
      const { fixture } = await render(Host);
      const element = screen.getByRole('textbox');
      expect(element.hasAttribute('aria-invalid')).toBe(false);

      await userEvent.click(element);
      await userEvent.tab();
      await fixture.whenStable();
      expect(element.getAttribute('aria-invalid')).toBe('true');

      await userEvent.type(element, 'a@b.c');
      await fixture.whenStable();
      expect(element.hasAttribute('aria-invalid')).toBe(false);
    });

    it('reflects the control being disabled', async () => {
      const { fixture } = await render(Host);
      fixture.componentInstance.email.disable();
      await fixture.whenStable();
      expect(screen.getByRole('textbox').hasAttribute('data-disabled')).toBe(
        true,
      );
    });

    it('leaves the value to the forms library', async () => {
      const { fixture } = await render(Host);
      await userEvent.type(screen.getByRole('textbox'), 'hello');
      expect(fixture.componentInstance.email.value).toBe('hello');
    });
  });

  describe('with Signal Forms', () => {
    @Component({
      imports: [NdInput, FormField],
      template: `<input ndInput aria-label="Email" [formField]="form.email" />`,
    })
    class Host {
      readonly model = signal({ email: '', locked: false });
      readonly form = form(this.model, (path) => {
        required(path.email);
        disabled(path.email, ({ valueOf }) => valueOf(path.locked));
      });
    }

    it('shows invalid only once the field is touched', async () => {
      const { fixture } = await render(Host);
      const element = screen.getByRole('textbox');
      expect(element.hasAttribute('aria-invalid')).toBe(false);

      await userEvent.click(element);
      await userEvent.tab();
      await fixture.whenStable();
      expect(element.getAttribute('aria-invalid')).toBe('true');
    });

    it('reflects the field being disabled and keeps the value in the model', async () => {
      const { fixture } = await render(Host);
      await userEvent.type(screen.getByRole('textbox'), 'a@b.c');
      expect(fixture.componentInstance.model().email).toBe('a@b.c');

      fixture.componentInstance.model.update((m) => ({ ...m, locked: true }));
      await fixture.whenStable();
      expect(screen.getByRole('textbox').hasAttribute('data-disabled')).toBe(
        true,
      );
    });
  });
});
