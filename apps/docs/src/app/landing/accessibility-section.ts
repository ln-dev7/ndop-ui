import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { KeyboardDemo } from './keyboard-demo';
import { SectionHeading } from './section-heading';

/**
 * The landing page's accessibility section (ADR-0026, section 4): live
 * Tabs and their keyboard table, then three facts about how Ndop keeps
 * its accessibility, each true of the project's CI and sources. The demo
 * hydrates as it scrolls into view.
 */
@Component({
  selector: 'docs-accessibility-section',
  imports: [RouterLink, NdIcon, KeyboardDemo, SectionHeading],
  host: { class: 'block' },
  template: `
    <section
      aria-labelledby="accessibility-title"
      class="mx-auto max-w-[1440px] px-4 py-24 sm:py-32 lg:px-6"
    >
      <docs-section-heading
        headingId="accessibility-title"
        eyebrow="Accessibility"
        title="Accessible by contract."
        lead="Each primitive implements a written keyboard and ARIA contract. Here is Tabs', live: turn on Try the keyboard and press keys on the tabs."
      />
      <div class="mx-auto mt-14 max-w-6xl">
        @defer (on immediate; hydrate on viewport) {
          <docs-keyboard-demo />
        }
        <ul class="mt-12 grid gap-6 border-t pt-10 sm:grid-cols-3">
          @for (fact of facts; track fact.title) {
            <li>
              <h3 class="text-sm font-medium">{{ fact.title }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">{{ fact.text }}</p>
            </li>
          }
        </ul>
        <a
          routerLink="/docs/components/tabs"
          fragment="accessibility"
          class="mt-8 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Read Tabs' accessibility notes
          <svg ndIcon="arrow-right" class="size-4 rtl:rotate-180"></svg>
        </a>
      </div>
    </section>
  `,
})
export class AccessibilitySection {
  protected readonly facts = [
    {
      title: 'WAI-ARIA patterns',
      text: 'Primitives follow the Authoring Practices, with the roles, states and keys each pattern names.',
    },
    {
      title: 'axe on every route',
      text: 'CI runs axe on every page of these docs, in every browser, and fails on any violation.',
    },
    {
      title: 'A spec.md per primitive',
      text: 'Its keyboard map and focus rules are written down, and the tests and this table come from it.',
    },
  ];
}
