import { Component, computed, input } from '@angular/core';
import type { NdSeparatorOrientation } from '@ndop/primitives/separator';
import { Separator } from '@/ui/separator/separator';
import type { PlaygroundHost, PlaygroundValues } from '../playground';

/** The values the Separator playground binds. */
interface Values {
  orientation: NdSeparatorOrientation;
  decorative: boolean;
}

/** Renders a Separator between two words, with the playground's values. */
@Component({
  selector: 'docs-separator-playground',
  imports: [Separator],
  template: `
    <div
      class="flex items-center gap-4 text-sm"
      [class.w-40]="v().orientation === 'horizontal'"
      [class.flex-col]="v().orientation === 'horizontal'"
      [class.h-5]="v().orientation === 'vertical'"
    >
      <span>Docs</span>
      <div
        ndSeparator
        [orientation]="v().orientation"
        [decorative]="v().decorative"
      ></div>
      <span>Source</span>
    </div>
  `,
})
export class SeparatorPlayground {
  /** Every control's value. */
  readonly values = input.required<PlaygroundValues>();
  protected readonly v = computed(() => this.values() as unknown as Values);
}

/** Separator's playground. */
export const playground: PlaygroundHost = {
  part: 'Separator',
  snippet: '<div ndSeparator%attrs%></div>',
  component: SeparatorPlayground,
};
