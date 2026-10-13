import { Component, input } from '@angular/core';

/**
 * The heading every landing section opens with (ADR-0026): a small
 * eyebrow, the section's `h2` and a one-line lead, centered, so the
 * sections share one rhythm. Give the `h2` an id for the section's
 * `aria-labelledby`.
 *
 * @example
 * ```html
 * <docs-section-heading headingId="agents" eyebrow="Agents" title="Built for agents." lead="…" />
 * ```
 */
@Component({
  selector: 'docs-section-heading',
  host: { class: 'mx-auto block max-w-2xl text-center' },
  template: `
    <p class="text-sm font-medium text-muted-foreground">{{ eyebrow() }}</p>
    <h2
      class="mt-3 text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
      [id]="headingId()"
    >
      {{ title() }}
    </h2>
    <p
      class="mx-auto mt-4 max-w-[60ch] text-base leading-7 text-balance text-muted-foreground sm:text-lg sm:leading-8"
    >
      {{ lead() }}
    </p>
  `,
})
export class SectionHeading {
  /** The `h2`'s id. */
  readonly headingId = input.required<string>();
  /** A word or two above the heading. */
  readonly eyebrow = input.required<string>();
  /** The heading. */
  readonly title = input.required<string>();
  /** One sentence under it. */
  readonly lead = input.required<string>();
}
