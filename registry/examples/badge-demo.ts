import { Component } from '@angular/core';
import { Badge } from '@/ui/badge/badge';

/** The four main Badge variants, then badges used as counts. */
@Component({
  selector: 'example-badge-demo',
  imports: [Badge],
  template: `
    <div class="flex flex-col items-center gap-2">
      <div class="flex w-full flex-wrap gap-2">
        <span ndBadge>Badge</span>
        <span ndBadge variant="secondary">Secondary</span>
        <span ndBadge variant="destructive">Destructive</span>
        <span ndBadge variant="outline">Outline</span>
      </div>
      <div class="flex w-full flex-wrap gap-2">
        <span
          ndBadge
          class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
          >8</span
        >
        <span
          ndBadge
          variant="destructive"
          class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
          >99</span
        >
        <span
          ndBadge
          variant="outline"
          class="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
          >20+</span
        >
      </div>
    </div>
  `,
})
export class BadgeDemoExample {}
