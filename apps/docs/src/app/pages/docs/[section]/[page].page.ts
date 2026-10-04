import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { CodeFrames } from '../../../site/code-frames';
import { loadGuide } from '../../../site/guides';
import { Navigation } from '../../../site/navigation';
import { injectCurrentPath } from '../../../site/current-path';
import { OnThisPage, type PageHeading } from '../../../site/on-this-page';
import { PageActions } from '../../../site/page-actions';

/**
 * Decodes the character references Markdown rendering produces in heading
 * text, such as `&#39;` for an apostrophe.
 *
 * @param text - Text from the rendered HTML.
 * @returns The plain text.
 */
function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
  };
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith('#x') || entity.startsWith('#X')) {
        return String.fromCodePoint(parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith('#'))
        return String.fromCodePoint(Number(entity.slice(1)));
      return named[entity.toLowerCase()] ?? match;
    },
  );
}

/**
 * A guide (`/docs/<section>/<page>`) from `src/guides/<section>/<page>.md`,
 * rendered and highlighted at build
 * time, with an "On this page" rail and previous and next links.
 */
@Component({
  selector: 'docs-content-page',
  imports: [RouterLink, NdIcon, CodeFrames, OnThisPage, PageActions],
  template: `
    <div class="flex gap-10 py-8">
      <main id="main" class="mx-auto w-full max-w-[640px] min-w-0">
        @if (page.value(); as value) {
          <article docsCodeFrames #frames="docsCodeFrames">
            <div class="flex items-start justify-between gap-4">
              <h1 class="text-3xl font-semibold tracking-tight">
                {{ value.attributes.title }}
              </h1>
              <docs-page-actions
                [path]="path()"
                [title]="value.attributes.title"
              />
            </div>
            <p
              class="mt-2 text-[1.05rem] text-muted-foreground sm:text-base sm:text-balance"
            >
              {{ value.attributes.description }}
            </p>
            <div class="prose mt-8" [innerHTML]="html()"></div>
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
        <docs-on-this-page [headings]="headings()" />
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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  /** The page's Markdown, already rendered to HTML at build time. */
  protected readonly page = resource({
    params: () => ({
      section: this.params().get('section') ?? '',
      page: this.params().get('page') ?? '',
    }),
    loader: async ({ params }) => {
      const guide = await loadGuide(params.section, params.page);
      if (guide) {
        this.title.setTitle(`${guide.attributes.title} · Ndop UI`);
        this.meta.updateTag({
          name: 'description',
          content: guide.attributes.description,
        });
      }
      return guide;
    },
  });

  // The HTML is generated from the repository's own Markdown at build
  // time; it keeps Shiki's inline color variables, which sanitizing drops.
  protected readonly html = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.page.value()?.html ?? ''),
  );

  protected readonly headings = computed<PageHeading[]>(() =>
    [
      ...(this.page.value()?.html ?? '').matchAll(
        /<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g,
      ),
    ].map(([, level, id = '', text = '']) => ({
      id,
      level: Number(level),
      text: decodeEntities(text.replace(/<[^>]+>/g, '').trim()),
    })),
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
