import { Component, signal } from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import {
  NdField,
  NdFieldDescription,
  NdFieldError,
} from '@ndop/primitives/form-field';
import { NdLabel } from '@ndop/primitives/label';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdCheckbox, NdCheckboxIndicator } from './checkbox';

const PARTS = [NdCheckbox, NdCheckboxIndicator];

describe('NdCheckbox', () => {
  it('is an unchecked checkbox button that never submits', async () => {
    await render(
      `<button ndCheckbox aria-label="Terms">
        <span ndCheckboxIndicator data-testid="indicator">✓</span>
      </button>`,
      { imports: PARTS },
    );
    const box = screen.getByRole('checkbox', { name: 'Terms' });
    expect(box.getAttribute('aria-checked')).toBe('false');
    expect(box.getAttribute('type')).toBe('button');
    expect(box.getAttribute('data-state')).toBe('unchecked');
    expect(screen.getByTestId('indicator').hidden).toBe(true);
  });

  it('toggles on click and Space, not on Enter', async () => {
    await render(`<button ndCheckbox aria-label="Terms"></button>`, {
      imports: PARTS,
    });
    const box = screen.getByRole('checkbox');
    await userEvent.click(box);
    expect(box.getAttribute('aria-checked')).toBe('true');
    expect(box.getAttribute('data-state')).toBe('checked');
    await userEvent.keyboard(' ');
    expect(box.getAttribute('aria-checked')).toBe('false');
    await userEvent.keyboard('{Enter}');
    expect(box.getAttribute('aria-checked')).toBe('false');
  });

  it('starts from defaultChecked and follows a bound checked state', async () => {
    @Component({
      imports: PARTS,
      template: `
        <button ndCheckbox defaultChecked aria-label="A"></button>
        <button ndCheckbox [(checked)]="checked" aria-label="B"></button>
      `,
    })
    class Host {
      readonly checked = signal(true);
    }
    const { fixture } = await render(Host);
    expect(
      screen.getByRole('checkbox', { name: 'A' }).getAttribute('aria-checked'),
    ).toBe('true');
    const bound = screen.getByRole('checkbox', { name: 'B' });
    expect(bound.getAttribute('aria-checked')).toBe('true');
    await userEvent.click(bound);
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('is mixed while indeterminate, and becomes checked when activated', async () => {
    @Component({
      imports: PARTS,
      template: `<button
        ndCheckbox
        aria-label="All"
        [(indeterminate)]="mixed"
        [(checked)]="checked"
      >
        <span ndCheckboxIndicator data-testid="indicator"></span>
      </button>`,
    })
    class Host {
      readonly mixed = signal(true);
      readonly checked = signal(false);
    }
    const { fixture } = await render(Host);
    const box = screen.getByRole('checkbox');
    expect(box.getAttribute('aria-checked')).toBe('mixed');
    expect(box.getAttribute('data-state')).toBe('indeterminate');
    expect(screen.getByTestId('indicator').hidden).toBe(false);
    await userEvent.click(box);
    expect(fixture.componentInstance.mixed()).toBe(false);
    expect(fixture.componentInstance.checked()).toBe(true);
    expect(box.getAttribute('aria-checked')).toBe('true');
  });

  it('does nothing while disabled', async () => {
    await render(`<button ndCheckbox disabled aria-label="Terms"></button>`, {
      imports: PARTS,
    });
    const box = screen.getByRole('checkbox');
    expect((box as HTMLButtonElement).disabled).toBe(true);
    expect(box.hasAttribute('data-disabled')).toBe(true);
    await userEvent.click(box);
    expect(box.getAttribute('aria-checked')).toBe('false');
  });

  it('is required and invalid by input without a forms library', async () => {
    await render(
      `<button ndCheckbox required invalid aria-label="Terms"></button>`,
      { imports: PARTS },
    );
    const box = screen.getByRole('checkbox');
    expect(box.getAttribute('aria-required')).toBe('true');
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(box.hasAttribute('data-invalid')).toBe(true);
  });

  it('is toggled and mirrored by its label', async () => {
    @Component({
      imports: [...PARTS, NdLabel],
      template: `
        <button ndCheckbox id="terms" disabled>
          <span ndCheckboxIndicator>✓</span>
        </button>
        <label ndLabel for="terms">Accept</label>
        <button ndCheckbox id="news">
          <span ndCheckboxIndicator>✓</span>
        </button>
        <label ndLabel for="news">Newsletter</label>
      `,
    })
    class Host {}
    await render(Host);
    expect(screen.getByText('Accept').hasAttribute('data-disabled')).toBe(true);
    await userEvent.click(screen.getByText('Newsletter'));
    expect(
      screen
        .getByRole('checkbox', { name: 'Newsletter' })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('binds a Signal Forms field', async () => {
    @Component({
      imports: [...PARTS, FormField],
      template: `<button
        ndCheckbox
        aria-label="Terms"
        [formField]="form.terms"
      ></button>`,
    })
    class Host {
      readonly model = signal({ terms: false });
      readonly form = form(this.model, (path) => required(path.terms));
    }
    const { fixture } = await render(Host);
    const box = screen.getByRole('checkbox');
    expect(box.hasAttribute('aria-invalid')).toBe(false);
    expect(box.getAttribute('aria-required')).toBe('true');
    box.focus();
    await userEvent.tab();
    expect(box.getAttribute('aria-invalid')).toBe('true');
    await userEvent.click(box);
    expect(fixture.componentInstance.model().terms).toBe(true);
    expect(box.hasAttribute('aria-invalid')).toBe(false);
    fixture.componentInstance.model.set({ terms: false });
    await fixture.whenStable();
    expect(box.getAttribute('aria-checked')).toBe('false');
  });

  it('binds reactive forms, disabled state included', async () => {
    @Component({
      imports: [...PARTS, ReactiveFormsModule],
      template: `<button
        ndCheckbox
        aria-label="Terms"
        [formControl]="terms"
      ></button>`,
    })
    class Host {
      readonly terms = new FormControl(false, Validators.requiredTrue);
    }
    const { fixture } = await render(Host);
    const box = screen.getByRole('checkbox');
    await userEvent.click(box);
    expect(fixture.componentInstance.terms.value).toBe(true);
    await userEvent.click(box);
    await userEvent.tab();
    expect(fixture.componentInstance.terms.touched).toBe(true);
    expect(box.getAttribute('aria-invalid')).toBe('true');
    fixture.componentInstance.terms.disable();
    await fixture.whenStable();
    expect((box as HTMLButtonElement).disabled).toBe(true);
  });

  it('binds ngModel', async () => {
    @Component({
      imports: [...PARTS, FormsModule],
      template: `<button
        ndCheckbox
        aria-label="Terms"
        [(ngModel)]="terms"
      ></button>`,
    })
    class Host {
      terms = true;
    }
    const { fixture } = await render(Host);
    const box = screen.getByRole('checkbox');
    await vi.waitFor(() =>
      expect(box.getAttribute('aria-checked')).toBe('true'),
    );
    await userEvent.click(box);
    expect(fixture.componentInstance.terms).toBe(false);
  });

  it('is described by its form field', async () => {
    await render(
      `<div ndField data-testid="field">
        <button ndCheckbox invalid aria-label="Terms" aria-describedby="own"></button>
        <p ndFieldDescription id="help">Required to continue.</p>
        <p ndFieldError id="error">Accept the terms.</p>
      </div>`,
      { imports: [...PARTS, NdField, NdFieldDescription, NdFieldError] },
    );
    expect(screen.getByRole('checkbox').getAttribute('aria-describedby')).toBe(
      'own help error',
    );
    expect(screen.getByTestId('field').hasAttribute('data-invalid')).toBe(true);
  });
});
