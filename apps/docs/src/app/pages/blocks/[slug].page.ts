import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { BlocksGallery } from '../../blocks/blocks-gallery';

/**
 * One category of the blocks gallery (`/blocks/<category>`), or one block
 * (`/blocks/<name>`), the page its `.md` twin and search entry point at
 * (ADR-0022).
 */
@Component({
  selector: 'docs-blocks-slug-page',
  imports: [BlocksGallery],
  template: `<docs-blocks-gallery [slug]="slug()" />`,
})
export default class BlocksSlugPage {
  protected readonly slug = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => params.get('slug') ?? ''),
    ),
    { requireSync: true },
  );
}
