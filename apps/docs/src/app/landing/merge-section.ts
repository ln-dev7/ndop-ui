import { Component } from '@angular/core';
import { MergeDemo } from './merge-demo';
import { SectionHeading } from './section-heading';

/**
 * The landing page's update section (ADR-0026, section 2): what
 * `ndop update` does to a file you changed, shown on a real merge. The
 * demo hydrates as it scrolls into view.
 */
@Component({
  selector: 'docs-merge-section',
  imports: [MergeDemo, SectionHeading],
  host: { class: 'block' },
  template: `
    <section
      aria-labelledby="updates-title"
      class="mx-auto max-w-[1440px] px-4 py-24 sm:py-32 lg:px-6"
    >
      <docs-section-heading
        headingId="updates-title"
        eyebrow="Updates"
        title="Edit it. Update it anyway."
        lead="Change any file you install. ndop update merges upstream's fixes into your version, the way git merge does."
      />
      <div class="mx-auto mt-14 max-w-6xl">
        @defer (on immediate; hydrate on viewport) {
          <docs-merge-demo />
        }
      </div>
    </section>
  `,
})
export class MergeSection {}
