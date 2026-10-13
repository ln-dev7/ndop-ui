import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSeparatorContent,
  FieldTitle,
} from '@/ui/form-field/form-field';
import { Input } from '@/ui/input/input';
import { Progress, ProgressIndicator } from '@/ui/progress/progress';
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/ui/radio-group/radio-group';

/**
 * The landing showcase's first column (ADR-0026, amendment 1): a sign-up
 * form, a payment method choice and file uploads, for the fictional Sawa
 * Studio. On phones only the sign-up form shows.
 */
@Component({
  selector: 'docs-showcase-column-1',
  imports: [
    NdIcon,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Checkbox,
    CheckboxIndicator,
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
    FieldSeparatorContent,
    FieldTitle,
    Input,
    Progress,
    ProgressIndicator,
    RadioGroup,
    RadioGroupIndicator,
    RadioGroupItem,
  ],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div ndCard class="gap-5 py-5">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Create your account</h3>
        <p ndCardDescription>Join the Sawa Studio workspace.</p>
      </div>
      <div ndCardContent class="px-5">
        <div ndFieldGroup class="gap-4">
          <div ndField>
            <label ndFieldLabel for="sc-signup-email">Email</label>
            <input
              ndInput
              id="sc-signup-email"
              type="email"
              autocomplete="off"
              value="fatou@sawa.studio"
            />
          </div>
          <div ndField>
            <label ndFieldLabel for="sc-signup-password">Password</label>
            <input
              ndInput
              id="sc-signup-password"
              type="password"
              autocomplete="off"
              value="kribi-sunrise-2026"
            />
            <p ndFieldDescription>At least 12 characters.</p>
          </div>
          <div ndField orientation="horizontal">
            <button ndCheckbox id="sc-signup-terms" [defaultChecked]="true">
              <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
            </button>
            <label ndFieldLabel for="sc-signup-terms"
              >I agree to the terms</label
            >
          </div>
        </div>
      </div>
      <div ndCardFooter class="flex-col gap-4 px-5">
        <button ndButton class="w-full">Create account</button>
        <div ndFieldSeparator class="w-full">
          <span ndFieldSeparatorContent class="bg-card">Or</span>
        </div>
        <button ndButton variant="outline" class="w-full">
          Continue with a passkey
        </button>
      </div>
    </div>

    <div ndCard class="hidden gap-5 py-5 md:flex">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle id="sc-payment-title">Payment method</h3>
        <p ndCardDescription>Billed monthly for the Pro plan.</p>
      </div>
      <div ndCardContent class="px-5">
        <div
          ndRadioGroup
          aria-labelledby="sc-payment-title"
          defaultValue="momo"
        >
          @for (method of methods; track method.value) {
            <label ndFieldLabel [for]="'sc-payment-' + method.value">
              <div ndField orientation="horizontal">
                <div ndFieldContent>
                  <div ndFieldTitle>{{ method.title }}</div>
                  <p ndFieldDescription>{{ method.description }}</p>
                </div>
                <button
                  ndRadioGroupItem
                  [value]="method.value"
                  [id]="'sc-payment-' + method.value"
                  [attr.aria-label]="method.title"
                >
                  <span ndRadioGroupIndicator><svg ndIcon="circle"></svg></span>
                </button>
              </div>
            </label>
          }
        </div>
      </div>
    </div>

    <div ndCard class="hidden flex-1 gap-5 py-5 md:flex">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Uploads</h3>
        <p ndCardDescription>Two files to Brand assets.</p>
      </div>
      <div ndCardContent class="px-5">
        <ul class="grid gap-4">
          @for (file of files; track file.name) {
            <li class="grid gap-2">
              <div class="flex justify-between gap-3 text-sm">
                <span
                  [id]="'sc-upload-' + $index"
                  class="truncate font-medium"
                  >{{ file.name }}</span
                >
                <span class="shrink-0 text-muted-foreground tabular-nums">{{
                  file.value + '%'
                }}</span>
              </div>
              <div
                ndProgress
                [value]="file.value"
                [attr.aria-labelledby]="'sc-upload-' + $index"
              >
                <div ndProgressIndicator></div>
              </div>
            </li>
          }
        </ul>
      </div>
      <div ndCardFooter class="mt-auto justify-end gap-2 px-5">
        <button ndButton size="sm" variant="outline">Cancel</button>
        <button ndButton size="sm">Add files</button>
      </div>
    </div>
  `,
})
export class ShowcaseColumn1 {
  protected readonly methods = [
    {
      value: 'card',
      title: 'Card ending 4242',
      description: 'Visa, expires 08/2028.',
    },
    {
      value: 'momo',
      title: 'Mobile money',
      description: 'MTN MoMo, +237 6•• ••• 512.',
    },
    {
      value: 'bank',
      title: 'Bank transfer',
      description: 'Pay each invoice within 30 days.',
    },
  ];

  protected readonly files = [
    { name: 'brand-guidelines.pdf', value: 100 },
    { name: 'logo-pack.zip', value: 64 },
  ];
}
