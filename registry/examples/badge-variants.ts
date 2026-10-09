import { Component } from '@angular/core';
import { Badge } from '@/ui/badge/badge';

/** Every Badge variant side by side. */
@Component({
  selector: 'example-badge-variants',
  imports: [Badge],
  template: `
    <div class="flex flex-wrap gap-2">
      <span ndBadge>Default</span>
      <span ndBadge variant="secondary">Secondary</span>
      <span ndBadge variant="destructive">Destructive</span>
      <span ndBadge variant="outline">Outline</span>
      <span ndBadge variant="ghost">Ghost</span>
      <a ndBadge variant="link" href="#changelog">Link</a>
    </div>
  `,
})
export class BadgeVariantsExample {}
