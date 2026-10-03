import { Component, computed, input } from '@angular/core';
import { Badge, type BadgeVariant } from '@/ui/badge/badge';
import type { PlaygroundHost, PlaygroundValues } from '../playground';

/** The values the Badge playground binds. */
interface Values {
  variant: BadgeVariant;
}

/** Renders a Badge with the playground's values. */
@Component({
  selector: 'docs-badge-playground',
  imports: [Badge],
  template: `<span ndBadge [variant]="v().variant">Badge</span>`,
})
export class BadgePlayground {
  /** Every control's value. */
  readonly values = input.required<PlaygroundValues>();
  protected readonly v = computed(() => this.values() as unknown as Values);
}

/** Badge's playground. */
export const playground: PlaygroundHost = {
  part: 'Badge',
  snippet: '<span ndBadge%attrs%>Badge</span>',
  component: BadgePlayground,
};
