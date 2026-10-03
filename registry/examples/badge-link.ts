import { Component } from '@angular/core';
import { Badge } from '@/ui/badge/badge';

/** A badge that links somewhere, with a hover style. */
@Component({
  selector: 'example-badge-link',
  imports: [Badge],
  template: `<a ndBadge variant="outline" href="#changelog">Changelog</a>`,
})
export class BadgeLinkExample {}
