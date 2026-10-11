import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Badge } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';

/**
 * A landing page hero: a header with the brand and a main nav (its links
 * hide below `md`, leaving Sign in), an announcement pill, the headline,
 * two actions, and a decorative product shot of an app window drawn with
 * tokens on a dotted backdrop, then a row of customer names.
 */
@Component({
  selector: 'block-hero-01',
  imports: [Badge, Button, NdIcon],
  template: `
    <div class="flex min-h-svh flex-col bg-background text-foreground">
      <header class="border-b">
        <div
          class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8"
        >
          <a
            href="/"
            class="flex items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-6 text-primary"
              aria-hidden="true"
            >
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <path
                d="M12 5l7 7-7 7-7-7z"
                fill="none"
                stroke="var(--primary-foreground)"
                stroke-width="2"
              />
              <circle cx="12" cy="12" r="2" fill="var(--primary-foreground)" />
            </svg>
            Ndop
          </a>
          <nav aria-label="Main" class="hidden md:block">
            <ul class="flex items-center gap-1">
              @for (link of links; track link.href) {
                <li>
                  <a
                    ndButton
                    variant="ghost"
                    size="sm"
                    class="text-muted-foreground"
                    [href]="link.href"
                  >
                    {{ link.label }}
                  </a>
                </li>
              }
            </ul>
          </nav>
          <a ndButton variant="outline" size="sm" href="/login">Sign in</a>
        </div>
      </header>

      <main class="flex-1">
        <section
          aria-labelledby="hero-01-title"
          class="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pt-16 pb-12 text-center md:px-8 md:pt-24"
        >
          <a ndBadge variant="outline" href="/blocks" class="h-7 gap-1.5 px-3">
            <span class="font-semibold">New</span>
            <span aria-hidden="true" class="text-muted-foreground">·</span>
            Blocks are here
            <svg ndIcon="arrow-right" class="rtl:-scale-x-100"></svg>
          </a>
          <h1
            id="hero-01-title"
            class="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
          >
            Build accessible Angular apps you own
          </h1>
          <p
            class="max-w-2xl text-lg text-balance text-muted-foreground md:text-xl"
          >
            Copy in components and whole pages, styled with Tailwind and tested
            with screen readers. The code lives in your repository, so you can
            change anything.
          </p>
          <div class="flex flex-col gap-3 sm:flex-row">
            <a ndButton size="lg" href="/get-started">
              Get started
              <svg ndIcon="arrow-right" class="rtl:-scale-x-100"></svg>
            </a>
            <a ndButton variant="outline" size="lg" href="/components">
              View components
            </a>
          </div>
        </section>

        <div class="mx-auto w-full max-w-6xl px-4 pb-16 md:px-8">
          <div
            aria-hidden="true"
            class="rounded-2xl border bg-muted/40 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[16px_16px] p-2 md:p-4"
          >
            <div
              class="overflow-hidden rounded-xl border bg-background shadow-lg"
            >
              <div class="flex items-center gap-2 border-b px-4 py-3">
                <span class="size-3 rounded-full bg-[var(--chart-5)]"></span>
                <span class="size-3 rounded-full bg-[var(--chart-3)]"></span>
                <span class="size-3 rounded-full bg-[var(--chart-1)]"></span>
                <span class="ms-4 h-5 w-40 rounded-md bg-muted"></span>
              </div>
              <div class="flex">
                <div
                  class="hidden w-48 shrink-0 flex-col gap-2 border-e p-4 sm:flex"
                >
                  <span class="mb-2 h-4 w-20 rounded bg-primary"></span>
                  @for (width of sidebarItems; track $index) {
                    <span
                      class="h-3 rounded bg-muted"
                      [style.width.%]="width"
                    ></span>
                  }
                </div>
                <div class="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
                  <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
                    @for (tile of tiles; track $index) {
                      <div class="flex flex-col gap-2 rounded-lg border p-3">
                        <span class="h-2 w-12 rounded bg-muted"></span>
                        <span
                          class="h-5 rounded bg-foreground/80"
                          [style.width.%]="tile"
                        ></span>
                        <span
                          class="h-2 w-8 rounded bg-[var(--chart-2)]"
                        ></span>
                      </div>
                    }
                  </div>
                  <div class="rounded-lg border p-4">
                    <div class="mb-4 flex items-center justify-between">
                      <span class="h-3 w-24 rounded bg-muted"></span>
                      <span class="h-3 w-12 rounded bg-muted"></span>
                    </div>
                    <svg
                      viewBox="0 0 400 120"
                      preserveAspectRatio="none"
                      class="h-32 w-full md:h-40"
                    >
                      <path
                        d="M0 40H400M0 80H400"
                        stroke="var(--border)"
                        stroke-dasharray="4 4"
                      />
                      <path
                        d="M0 95 C40 90 60 70 100 72 S160 40 200 50 S270 20 310 30 S370 12 400 8 V120 H0Z"
                        fill="var(--chart-2)"
                        fill-opacity="0.2"
                      />
                      <path
                        d="M0 95 C40 90 60 70 100 72 S160 40 200 50 S270 20 310 30 S370 12 400 8"
                        fill="none"
                        stroke="var(--chart-2)"
                        stroke-width="2"
                        vector-effect="non-scaling-stroke"
                      />
                      <path
                        d="M0 108 C50 104 80 96 120 98 S190 80 230 86 S300 66 340 70 S380 58 400 56"
                        fill="none"
                        stroke="var(--chart-4)"
                        stroke-width="2"
                        vector-effect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section
          aria-labelledby="hero-01-customers"
          class="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pb-20 md:px-8"
        >
          <h2
            id="hero-01-customers"
            class="text-sm font-medium text-muted-foreground"
          >
            Trusted by product teams at
          </h2>
          <ul
            class="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-lg font-semibold tracking-tight text-muted-foreground"
          >
            @for (name of customers; track name) {
              <li>{{ name }}</li>
            }
          </ul>
        </section>
      </main>
    </div>
  `,
})
export class Hero01Block {
  protected readonly links = [
    { label: 'Components', href: '/components' },
    { label: 'Blocks', href: '/blocks' },
    { label: 'Docs', href: '/docs' },
  ];

  protected readonly sidebarItems = [80, 65, 90, 55, 70];

  protected readonly tiles = [70, 55, 80, 60];

  protected readonly customers = [
    'Northwind',
    'Acme Labs',
    'Bamenda Co.',
    'Lumen',
    'Kribi Studio',
  ];
}
