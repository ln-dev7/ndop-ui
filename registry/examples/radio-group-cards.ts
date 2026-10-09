import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/ui/form-field/form-field';
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/ui/radio-group/radio-group';

/**
 * Plans as selectable cards: each card is the label of its radio, so
 * clicking anywhere on it chooses the plan, and the chosen card is
 * highlighted.
 */
@Component({
  selector: 'example-radio-group-cards',
  imports: [
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
    FieldTitle,
    NdIcon,
    RadioGroup,
    RadioGroupIndicator,
    RadioGroupItem,
  ],
  template: `
    <div
      ndRadioGroup
      aria-label="Plan"
      class="w-full max-w-sm"
      [(value)]="plan"
    >
      @for (option of plans; track option.value) {
        <label ndFieldLabel [for]="'radio-group-cards-' + option.value">
          <div ndField orientation="horizontal">
            <div ndFieldContent>
              <div ndFieldTitle>{{ option.title }}</div>
              <p ndFieldDescription>{{ option.description }}</p>
            </div>
            <button
              ndRadioGroupItem
              [value]="option.value"
              [id]="'radio-group-cards-' + option.value"
              [attr.aria-label]="option.title"
            >
              <span ndRadioGroupIndicator><svg ndIcon="circle"></svg></span>
            </button>
          </div>
        </label>
      }
    </div>
  `,
})
export class RadioGroupCardsExample {
  protected readonly plans = [
    {
      value: 'starter',
      title: 'Starter',
      description: 'For side projects: one seat, 5 GB of storage.',
    },
    {
      value: 'pro',
      title: 'Pro',
      description: 'For small teams: ten seats, 100 GB of storage.',
    },
    {
      value: 'business',
      title: 'Business',
      description: 'Unlimited seats, single sign-on and audit logs.',
    },
  ];

  protected readonly plan = signal<string | null>('pro');
}
