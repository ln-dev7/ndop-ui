import { Component, computed, input } from '@angular/core';
import { Input } from '@/ui/input/input';
import type { PlaygroundHost, PlaygroundValues } from '../playground';

/** The values the Input playground binds. */
interface Values {
  invalid: boolean;
}

/** Renders an Input with the playground's values. */
@Component({
  selector: 'docs-input-playground',
  imports: [Input],
  template: `
    <input
      ndInput
      type="email"
      placeholder="Email"
      aria-label="Email"
      class="w-64"
      [invalid]="v().invalid"
    />
  `,
})
export class InputPlayground {
  /** Every control's value. */
  readonly values = input.required<PlaygroundValues>();
  protected readonly v = computed(() => this.values() as unknown as Values);
}

/** Input's playground; `id` is left to the label it pairs with. */
export const playground: PlaygroundHost = {
  part: 'Input',
  exclude: ['id'],
  snippet:
    '<input ndInput type="email" placeholder="Email" aria-label="Email" class="w-64"%attrs% />',
  component: InputPlayground,
};
