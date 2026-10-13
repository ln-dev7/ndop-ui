import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { LogoMark } from '../site/logo-mark';
import { Navigation } from '../site/navigation';
import { InstallCommand } from './install-command';

/** What every component is built on, as the introduction guide says. */
const FACTS = ['WAI-ARIA', 'SSR', 'Zoneless', 'Signals'];

/**
 * The landing page's hero (ADR-0026, amendment 1): centered copy with
 * the pill and its mark, the headline, the pitch, the calls to action
 * beside `npx @ndop/cli init`, and the trust line. It is static, so the
 * headline paints from the prerendered HTML; only the copy button
 * hydrates, when the page is idle.
 */
@Component({
  selector: 'docs-hero',
  imports: [RouterLink, NdIcon, Button, LogoMark, InstallCommand],
  host: { class: 'block' },
  template: `
    <div
      class="mx-auto flex max-w-[1440px] flex-col items-center px-4 pt-14 pb-12 text-center sm:pt-20 sm:pb-16 lg:px-6"
    >
      <p
        class="inline-flex h-7 items-center gap-2 rounded-full border bg-background ps-2.5 pe-3 text-xs font-medium text-muted-foreground"
      >
        <docs-logo-mark class="h-3.5" />
        Angular 21 &amp; 22
        <span
          class="size-0.5 rounded-full bg-current"
          aria-hidden="true"
        ></span>
        Open source
        <span
          class="size-0.5 rounded-full bg-current"
          aria-hidden="true"
        ></span>
        MIT
      </p>
      <h1
        class="mt-6 text-[clamp(2.375rem,1.25rem+2.6vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance"
      >
        <!-- The space keeps the two sentences apart in the heading's
             text, which Angular's whitespace removal would join. -->
        <span class="block">Own your components. </span>
        <span class="block text-muted-foreground">Update them anyway.</span>
      </h1>
      <p
        class="mt-5 max-w-[60ch] text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8"
      >
        Accessible Angular components you install as source. Signals‑first, with
        a CLI that merges upstream fixes into the code you changed. Built for
        you and your agent.
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a ndButton size="lg" routerLink="/docs/getting-started/introduction">
          Get started
          <svg ndIcon="arrow-right" class="rtl:rotate-180"></svg>
        </a>
        <a
          ndButton
          size="lg"
          variant="outline"
          class="bg-background"
          [routerLink]="components()"
          >Browse components</a
        >
        @defer (on immediate; hydrate on idle) {
          <docs-install-command command="npx @ndop/cli init" />
        }
      </div>
      <ul
        class="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted-foreground"
        aria-label="Built with"
      >
        @for (fact of facts; track fact; let first = $first) {
          <li class="flex items-center gap-3">
            @if (!first) {
              <span class="h-3 w-px bg-border" aria-hidden="true"></span>
            }
            {{ fact }}
          </li>
        }
      </ul>
    </div>
  `,
})
export class Hero {
  private readonly navigation = inject(Navigation);

  protected readonly facts = FACTS;

  /** The first component page in the navigation, for "Browse components". */
  protected readonly components = computed(
    () =>
      this.navigation
        .sections()
        .flatMap((section) => section.links)
        .find((link) => link.url.startsWith('/docs/components/'))?.url ??
      '/docs/getting-started/introduction',
  );
}
