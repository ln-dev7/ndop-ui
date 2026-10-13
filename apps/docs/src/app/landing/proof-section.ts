import { Component } from '@angular/core';
import { landing } from 'virtual:ndop/landing';
import { SectionHeading } from './section-heading';

/** One figure of the proof row. */
interface Stat {
  /** The figure. */
  value: string;
  /** What it counts. */
  label: string;
}

/**
 * The landing page's proof section (ADR-0026, section 6): the registry's
 * counts and Button's gzipped size, read at build time from the registry
 * and size report this site was built from, beside two facts CI enforces.
 */
@Component({
  selector: 'docs-proof-section',
  imports: [SectionHeading],
  host: { class: 'block' },
  template: `
    <section
      aria-labelledby="proof-title"
      class="mx-auto max-w-[1440px] px-4 py-24 sm:py-32 lg:px-6"
    >
      <docs-section-heading
        headingId="proof-title"
        eyebrow="By the numbers"
        title="Read from this build."
        lead="Counted from the registry and measured by the size report this site was built from."
      />
      <dl
        class="mx-auto mt-14 grid max-w-6xl grid-cols-2 overflow-hidden rounded-2xl border sm:grid-cols-3 lg:grid-cols-6"
      >
        @for (stat of stats; track stat.label) {
          <div
            class="-ms-px -mt-px flex flex-col-reverse gap-1 border-s border-t px-5 py-6 text-center"
          >
            <dt class="text-sm text-muted-foreground">{{ stat.label }}</dt>
            <dd
              class="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
              dir="ltr"
            >
              {{ stat.value }}
            </dd>
          </div>
        }
      </dl>
    </section>
  `,
})
export class ProofSection {
  protected readonly stats: Stat[] = [
    { value: String(landing.stats.components), label: 'Components' },
    { value: String(landing.stats.blocks), label: 'Blocks' },
    { value: String(landing.stats.themes), label: 'Themes' },
    ...(landing.stats.buttonGzip === undefined
      ? []
      : [
          {
            value: `${(landing.stats.buttonGzip / 1024).toFixed(1)} KB`,
            label: 'Button, gzipped',
          },
        ]),
    { value: '0', label: 'axe violations in CI' },
    { value: '21 & 22', label: 'Angular versions' },
  ];
}
