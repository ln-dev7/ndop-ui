import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { NdInput } from '@ndop/primitives/input';
import { NdLabel } from '@ndop/primitives/label';

/**
 * Input and Label demo (`/primitives/input`): a Signal Forms field, a
 * reactive forms field and a disabled field, each labelled.
 */
@Component({
  selector: 'harness-input-demo',
  imports: [NdInput, NdLabel, FormField, ReactiveFormsModule],
  template: `
    <main class="grid max-w-sm gap-4 p-8">
      <h1 class="text-2xl font-semibold">Input and Label</h1>

      <label ndLabel for="signal-email" class="data-invalid:text-destructive">
        Email (Signal Forms)
      </label>
      <input
        ndInput
        id="signal-email"
        type="email"
        class="border-input rounded-md border px-3 py-2 data-invalid:border-destructive"
        [formField]="signalForm.email"
      />

      <label ndLabel for="reactive-name">Name (reactive forms)</label>
      <input
        ndInput
        id="reactive-name"
        class="border-input rounded-md border px-3 py-2"
        [formControl]="name"
      />

      <label ndLabel for="disabled-field" class="data-disabled:opacity-50">
        Disabled
      </label>
      <input
        ndInput
        id="disabled-field"
        disabled
        class="border-input rounded-md border px-3 py-2"
      />
    </main>
  `,
})
export default class InputDemo {
  protected readonly model = signal({ email: '' });
  protected readonly signalForm = form(this.model, (path) => {
    required(path.email);
  });
  protected readonly name = new FormControl('', Validators.required);
}
