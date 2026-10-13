import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { landing } from 'virtual:ndop/landing';
import { SectionHeading } from './section-heading';

/**
 * The landing page's blocks section (ADR-0026, section 5): eight blocks,
 * each a thumbnail of its own preview page, photographed by the build in
 * light and dark (`build/block-thumbnails.ts`), linking to the block in
 * the gallery. Phones show four. The dev server, which doesn't
 * photograph them, shows a placeholder with each block's name instead.
 * Static: nothing in it needs scripts.
 */
@Component({
  selector: 'docs-blocks-section',
  imports: [RouterLink, NdIcon, Button, SectionHeading],
  host: { class: 'block' },
  template: `
    <section
      aria-labelledby="blocks-title"
      class="mx-auto max-w-[1440px] px-4 py-24 sm:py-32 lg:px-6"
    >
      <docs-section-heading
        headingId="blocks-title"
        eyebrow="Blocks"
        title="Start from a whole screen."
        lead="Logins, dashboards, settings and more, made of the same components. Add one with a single command, then make it yours."
      />
      <ul class="mt-14 grid gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
        @for (block of blocks; track block.name; let index = $index) {
          <li [class.max-sm:hidden]="index >= 4">
            <a
              class="group block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              [routerLink]="'/blocks/' + block.name"
            >
              <span
                class="block overflow-hidden rounded-xl border bg-muted/30 shadow-xs transition-shadow group-hover:shadow-md"
              >
                @if (!thumbnails) {
                  <span
                    class="flex aspect-[8/5] w-full flex-col items-center justify-center gap-1 bg-[repeating-linear-gradient(135deg,transparent_0_10px,var(--color-border)_10px_11px)] text-center"
                  >
                    <span class="text-sm font-medium">{{ block.title }}</span>
                    <span class="text-xs text-muted-foreground">{{
                      block.category
                    }}</span>
                  </span>
                }
                @for (scheme of thumbnails ? schemes : []; track scheme) {
                  <img
                    [class]="
                      'aspect-[8/5] w-full object-cover object-top ' +
                      (scheme === 'dark' ? 'hidden dark:block' : 'dark:hidden')
                    "
                    [src]="thumb(block.name, scheme, 640)"
                    [srcset]="
                      thumb(block.name, scheme, 640) +
                      ' 640w, ' +
                      thumb(block.name, scheme, 1280) +
                      ' 1280w'
                    "
                    sizes="(min-width: 1280px) 340px, (min-width: 640px) 50vw, 100vw"
                    width="640"
                    height="400"
                    loading="lazy"
                    decoding="async"
                    alt=""
                  />
                }
              </span>
              <span class="mt-3 flex items-baseline justify-between gap-3">
                <span class="text-sm font-medium group-hover:underline">{{
                  block.title
                }}</span>
                <span class="text-xs text-muted-foreground">{{
                  block.category
                }}</span>
              </span>
            </a>
          </li>
        }
      </ul>
      <div class="mt-12 flex justify-center">
        <a ndButton variant="outline" routerLink="/blocks">
          Browse all blocks
          <svg ndIcon="arrow-right" class="rtl:rotate-180"></svg>
        </a>
      </div>
    </section>
  `,
})
export class BlocksSection {
  protected readonly blocks = landing.blocks;
  protected readonly thumbnails = landing.thumbnails;
  protected readonly schemes = ['light', 'dark'] as const;

  /**
   * A block thumbnail's URL.
   *
   * @param name - The block.
   * @param scheme - Light or dark.
   * @param width - Its width in pixels.
   * @returns The image's path on the site.
   */
  protected thumb(name: string, scheme: string, width: number): string {
    return `/blocks/thumbs/${name}-${scheme}-${width}.webp`;
  }
}
