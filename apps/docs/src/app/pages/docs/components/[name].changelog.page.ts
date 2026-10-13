import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Badge } from '@/ui/badge/badge';
import { changelogs } from 'virtual:ndop/components';
import type { ChangelogPageData } from '../../../components/changelog-data';
import { UpdatePreview } from '../../../components/update-preview';
import { CodeFrames } from '../../../site/code-frames';
import { OnThisPage, type PageHeading } from '../../../site/on-this-page';
import { StaticHtml } from '../../../site/static-html';
import { PageMeta } from '../../../site/page-meta';

/** Classes of the section headings (`h2`). */
const H2 = 'scroll-mt-20 text-xl font-semibold tracking-tight';

/**
 * The id of a version's section.
 *
 * @param version - Such as `0.1.2`.
 * @returns Such as `v0-1-2`.
 */
function versionId(version: string): string {
  return `v${version.replace(/[^\w]/g, '-')}`;
}

/**
 * A component's changelog (`/docs/components/<name>/changelog`,
 * ADR-0020): the update preview, then every version, newest first, with
 * its notes, what `ndop update` does, and each file's diff against the
 * version before. Built from the registry's changelog and snapshots at
 * build time (`build/changelog.ts`).
 */
@Component({
  selector: 'docs-changelog-page',
  imports: [
    RouterLink,
    NdIcon,
    Badge,
    CodeFrames,
    OnThisPage,
    StaticHtml,
    UpdatePreview,
  ],
  template: `
    <div class="flex gap-10 py-8">
      <main id="main" class="mx-auto w-full max-w-[640px] min-w-0">
        @if (page.value(); as item) {
          <article docsCodeFrames #frames="docsCodeFrames">
            <header>
              <a
                [routerLink]="'/docs/components/' + item.name"
                class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <svg ndIcon="arrow-left" class="size-3.5 rtl:rotate-180"></svg>
                {{ item.title }}
              </a>
              <h1 class="mt-3 text-3xl font-semibold tracking-tight">
                {{ item.title }} changelog
              </h1>
              <p class="mt-3 text-muted-foreground">
                Every version of {{ item.title }}, newest first. Update with
                <code class="inline-code">npx @ndop/cli update {{ item.name }}</code
                >; it keeps your edits.
              </p>
            </header>

            <section class="mt-10">
              <h2 id="preview" [class]="h2">Preview an update</h2>
              <p class="mt-2 mb-4 text-sm text-muted-foreground">
                Paste your copy of the file to see what updating it to
                {{ item.latest }} would do.
              </p>
              <!-- Live soon after load, before anyone pastes into it; the
                   version files, the merge's inputs, load when it runs. -->
              @defer (on immediate; hydrate on idle) {
                <docs-update-preview
                  [name]="item.name"
                  [title]="item.title"
                  [latest]="item.latest"
                  [versions]="versions()"
                  [files]="item.files"
                />
              }
            </section>

            @for (entry of item.versions; track entry.version) {
              <section class="mt-12">
                <h2
                  [id]="id(entry.version)"
                  [class]="h2 + ' flex items-center gap-3'"
                >
                  {{ entry.version }}
                  @if (entry.version === item.latest) {
                    <span ndBadge variant="outline">Latest</span>
                  }
                </h2>
                @if (entry.notesHtml) {
                  <div class="prose mt-3" [docsHtml]="entry.notesHtml"></div>
                }
                @if (entry.changes.length > 0) {
                  <h3 class="mt-6 text-base font-semibold">
                    What <code class="inline-code">ndop update</code> does
                    @if (entry.previous) {
                      from {{ entry.previous }}
                    }
                  </h3>
                  <ul class="mt-2 list-disc space-y-1 ps-5 text-sm">
                    @for (change of entry.changes; track $index) {
                      <li [docsHtml]="change"></li>
                    }
                  </ul>
                }
                @for (diff of entry.diffs; track diff.target) {
                  <div class="mt-4" [docsHtml]="diff.html"></div>
                }
              </section>
            }
            <p aria-live="polite" class="sr-only">
              {{ frames.announcement() }}
            </p>
          </article>
        } @else if (page.status() === 'resolved') {
          <h1 class="text-3xl font-semibold">Page not found</h1>
        }
      </main>
      <div
        class="sticky top-22 hidden h-fit max-h-[calc(100dvh-5.5rem)] w-[220px] shrink-0 overflow-y-auto xl:block"
      >
        @defer (on immediate; hydrate on idle) {
          <docs-on-this-page [headings]="headings()" />
        }
      </div>
    </div>
  `,
})
export default class ChangelogPage {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, {
    requireSync: true,
  });
  private readonly meta = inject(PageMeta);

  protected readonly h2 = H2;
  protected readonly id = versionId;

  /** The page's data, prepared at build time. */
  protected readonly page = resource({
    params: () => ({ name: this.params().get('name') ?? '' }),
    loader: async ({ params }): Promise<ChangelogPageData | undefined> => {
      const load = changelogs[params.name];
      if (!load) return undefined;
      const data = (await load()).default;
      this.meta.set({
        title: `${data.title} changelog`,
        description: `Every version of the ${data.title} component, what ndop update does for each, and the diffs.`,
        path: `/docs/components/${params.name}/changelog`,
      });
      return data;
    },
  });

  /** Every version, newest first. */
  protected readonly versions = computed(
    () => this.page.value()?.versions.map((entry) => entry.version) ?? [],
  );

  protected readonly headings = computed<PageHeading[]>(() => [
    { id: 'preview', text: 'Preview an update', level: 2 },
    ...this.versions().map((version) => ({
      id: versionId(version),
      text: version,
      level: 2,
    })),
  ]);
}
