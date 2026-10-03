import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';

/**
 * Landing page (`/`).
 */
@Component({
  selector: 'docs-home',
  imports: [RouterLink, NdIcon, Button],
  template: `
    <main id="main" class="mx-auto max-w-5xl px-4 py-24 lg:px-6">
      <h1
        class="text-[clamp(2.5rem,1.8rem+3vw,4rem)] font-semibold leading-tight"
      >
        Ndop UI
      </h1>
      <p class="mt-6 max-w-2xl text-xl text-muted-foreground">
        Own your components. Update them anyway. Built for you and your agent.
      </p>
      <p class="mt-4 max-w-2xl text-muted-foreground">
        Accessible Angular components you install as source, styled with
        Tailwind, signals-first and zoneless, with a CLI that adds them to your
        app and can merge upstream fixes into the files you changed.
      </p>
      <div class="mt-10 flex flex-wrap gap-3">
        <a ndButton size="lg" routerLink="/docs/getting-started/introduction">
          Get started
          <svg ndIcon="arrow-right" class="rtl:rotate-180"></svg>
        </a>
        <a
          ndButton
          size="lg"
          variant="outline"
          routerLink="/docs/getting-started/installation"
          >Installation</a
        >
      </div>
      <ul class="mt-20 grid gap-8 sm:grid-cols-3">
        @for (feature of features; track feature.title) {
          <li>
            <h2 class="font-semibold">{{ feature.title }}</h2>
            <p class="mt-2 text-sm text-muted-foreground">{{ feature.text }}</p>
          </li>
        }
      </ul>
    </main>
  `,
})
export default class HomePage {
  protected readonly features = [
    {
      title: 'Yours to change',
      text: 'Components are copied into your project, so you can read and edit every line.',
    },
    {
      title: 'Accessible by contract',
      text: 'Each primitive follows a written WAI-ARIA contract, tested with axe and real keyboards.',
    },
    {
      title: 'Built for agents',
      text: 'Every component is described by metadata your coding agent can read.',
    },
  ];
}
