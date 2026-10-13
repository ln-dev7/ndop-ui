import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { DiamondBand } from './diamond-band';
import { InstallCommand } from './install-command';

/**
 * The landing page's closing call to action (ADR-0026, section 7), framed
 * by two diamond bands: a short headline, "Get started" and the install
 * command. Only the copy button hydrates, when the page is idle.
 */
@Component({
  selector: 'docs-closing-section',
  imports: [RouterLink, NdIcon, Button, DiamondBand, InstallCommand],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="closing-title" class="py-12 sm:py-16">
      <docs-diamond-band
        patternId="closing-band-top"
        class="text-brand/20 dark:text-white/[0.1]"
      />
      <div class="bg-brand/[0.025] dark:bg-white/[0.02]">
        <div
          class="mx-auto flex max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:py-24 lg:px-6"
        >
          <h2
            id="closing-title"
            class="text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl"
          >
            Add your first component.
          </h2>
          <p
            class="mt-4 max-w-[60ch] text-base leading-7 text-balance text-muted-foreground sm:text-lg sm:leading-8"
          >
            Set Ndop up in an Angular app, then add what you need. Every file is
            yours from the start.
          </p>
          <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              ndButton
              size="lg"
              routerLink="/docs/getting-started/introduction"
            >
              Get started
              <svg ndIcon="arrow-right" class="rtl:rotate-180"></svg>
            </a>
            @defer (on immediate; hydrate on idle) {
              <docs-install-command command="npx ndop init" />
            }
          </div>
        </div>
      </div>
      <docs-diamond-band
        patternId="closing-band-bottom"
        class="text-brand/20 dark:text-white/[0.1]"
      />
    </section>
  `,
})
export class ClosingSection {}
