import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { CodeFrames } from '../../../site/code-frames';
import { loadGuide } from '../../../site/guides';
import { Navigation } from '../../../site/navigation';
import { injectCurrentPath } from '../../../site/current-path';
import {
  OnThisPage,
  pageHeadings,
  type PageHeading,
} from '../../../site/on-this-page';
import { PageActions } from '../../../site/page-actions';
import { StaticHtml } from '../../../site/static-html';
import { PageMeta } from '../../../site/page-meta';

/**
 * A guide (`/docs/<section>/<page>`) from `src/guides/<section>/<page>.md`,
 * rendered and highlighted at build
 * time, with an "On this page" rail and previous and next links.
 */
@Component({
  selector: 'docs-content-page',
  imports: [
    RouterLink,
    NdIcon,
    CodeFrames,
    OnThisPage,
    PageActions,
    StaticHtml,
  ],
  template: `
    <div class="flex gap-10 py-8">
      <main id="main" class="mx-auto w-full max-w-[640px] min-w-0">
        @if (page.value(); as value) {
          <article docsCodeFrames #frames="docsCodeFrames">
            <div class="flex items-start justify-between gap-4">
              <h1 class="text-3xl font-semibold tracking-tight">
                {{ value.attributes.title }}
              </h1>
              @defer (on immediate; hydrate on idle) {
                <docs-page-actions
                  [path]="path()"
                  [title]="value.attributes.title"
                />
              }
            </div>
            <p
              class="mt-2 text-[1.05rem] text-muted-foreground sm:text-base sm:text-balance"
            >
              {{ value.attributes.description }}
            </p>
            <div class="prose mt-8" [docsHtml]="html()"></div>
            <p aria-live="polite" class="sr-only">
              {{ frames.announcement() }}
            </p>
          </article>
          <nav
            aria-label="Pages"
            class="mt-16 flex justify-between gap-4 border-t pt-6 text-sm"
          >
            @if (neighbors().previous; as previous) {
              <a
                [routerLink]="previous.url"
                class="flex items-center gap-2 hover:underline"
              >
                <svg ndIcon="arrow-left" class="size-4 rtl:rotate-180"></svg>
                {{ previous.title }}
              </a>
            }
            @if (neighbors().next; as next) {
              <a
                [routerLink]="next.url"
                class="ms-auto flex items-center gap-2 hover:underline"
              >
                {{ next.title }}
                <svg ndIcon="arrow-right" class="size-4 rtl:rotate-180"></svg>
              </a>
            }
          </nav>
        } @else if (page.status() === 'resolved') {
          <h1 class="text-3xl font-semibold">Page not found</h1>
        }
      </main>
      <div
        class="sticky top-22 hidden h-fit max-h-[calc(100dvh-5.5rem)] w-[220px] shrink-0 overflow-y-auto xl:block"
      >
        <!-- Soon after load: its scroll-spy follows the reader. -->
        @defer (on immediate; hydrate on idle) {
          <docs-on-this-page [headings]="headings()" />
        }
      </div>
    </div>
  `,
})
export default class ContentPage {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, {
    requireSync: true,
  });
  private readonly navigation = inject(Navigation);
  protected readonly path = injectCurrentPath();
  private readonly meta = inject(PageMeta);

  /** The page's Markdown, already rendered to HTML at build time. */
  protected readonly page = resource({
    params: () => ({
      section: this.params().get('section') ?? '',
      page: this.params().get('page') ?? '',
    }),
    loader: async ({ params }) => {
      const guide = await loadGuide(params.section, params.page);
      if (guide) {
        this.meta.set({
          title: guide.attributes.title,
          description: guide.attributes.description,
          path: `/docs/${params.section}/${params.page}`,
        });
      }
      return guide;
    },
  });

  protected readonly html = computed(() => this.page.value()?.html ?? '');

  protected readonly headings = computed<PageHeading[]>(() =>
    pageHeadings(this.page.value()?.html ?? ''),
  );

  protected readonly neighbors = computed(() => {
    const links = this.navigation.links();
    const url = `/docs/${this.params().get('section')}/${this.params().get('page')}`;
    const index = links.findIndex((link) => link.url === url);
    return {
      previous: links[index - 1],
      next: index >= 0 ? links[index + 1] : undefined,
    };
  });
}
