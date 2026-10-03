import { Component, computed, input } from '@angular/core';
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from '@/ui/button/button';
import type { PlaygroundHost, PlaygroundValues } from '../playground';

/** The values the Button playground binds. */
interface Values {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
}

/** Renders a Button with the playground's values. */
@Component({
  selector: 'docs-button-playground',
  imports: [Button],
  template: `
    <button
      ndButton
      [variant]="v().variant"
      [size]="v().size"
      [disabled]="v().disabled"
    >
      Button
    </button>
  `,
})
export class ButtonPlayground {
  /** Every control's value. */
  readonly values = input.required<PlaygroundValues>();
  protected readonly v = computed(() => this.values() as unknown as Values);
}

/** Button's playground. */
export const playground: PlaygroundHost = {
  part: 'Button',
  snippet: '<button ndButton%attrs%>Button</button>',
  component: ButtonPlayground,
};
